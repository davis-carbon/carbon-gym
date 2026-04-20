import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";
import { runAutomation } from "@/lib/automation-engine";

const TRIGGER_VALUES = [
  "DAYS_AFTER_PURCHASE", "DAYS_AFTER_SIGNUP", "DAYS_BEFORE_EXPIRY",
  "DAYS_BEFORE_BIRTHDAY", "LOW_SESSIONS_REMAINING", "PLAN_ENDING_SOON",
  "TAG_ADDED", "TAG_REMOVED", "ON_FIRST_LOGIN", "MANUAL",
] as const;

export const automationsRouter = createTRPCRouter({
  list: staffProcedure.query(async ({ ctx }) => {
    return ctx.db.automation.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });
  }),

  runNow: staffProcedure
    .input(z.object({
      id: z.string(),
      clientId: z.string().optional(),
      force: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const automation = await ctx.db.automation.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
      });
      if (!automation) throw new Error("Automation not found");

      const result = await runAutomation(automation, new Date(), {
        clientId: input.clientId,
        force: input.force,
      });

      await ctx.db.automation.update({
        where: { id: automation.id },
        data: { lastRunAt: new Date() },
      });

      return result;
    }),

  runHistory: staffProcedure
    .input(z.object({ id: z.string(), limit: z.number().min(1).max(100).default(25) }))
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db.auditLog.findMany({
        where: {
          organizationId: ctx.organizationId,
          action: "AUTOMATION_EXECUTED",
          entityType: "Automation",
          entityId: input.id,
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      // Resolve client names for display
      const clientIds = Array.from(new Set(
        logs.map((l) => (l.metadata as Record<string, unknown>)?.clientId)
          .filter((v): v is string => typeof v === "string")
      ));
      const clients = clientIds.length > 0
        ? await ctx.db.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
      const clientById = new Map(clients.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

      return logs.map((l) => {
        const meta = (l.metadata as Record<string, unknown>) ?? {};
        const cid = typeof meta.clientId === "string" ? meta.clientId : null;
        return {
          id: l.id,
          at: l.createdAt,
          clientId: cid,
          clientName: cid ? clientById.get(cid) ?? "Unknown" : null,
          actions: Array.isArray(meta.actions) ? meta.actions.map(String) : [],
          manual: !!meta.manual,
        };
      });
    }),

  create: staffProcedure
    .input(z.object({
      name: z.string().min(1),
      trigger: z.enum(TRIGGER_VALUES),
      triggerValue: z.number().optional(),
      triggerProduct: z.string().optional(),
      filterCriteria: z.any().default({}),
      actions: z.any(), // Array of { type, config }
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.automation.create({
        data: {
          ...input,
          organizationId: ctx.organizationId,
          createdById: ctx.staff.id,
        },
      });
    }),

  update: staffProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      isActive: z.boolean().optional(),
      trigger: z.enum(TRIGGER_VALUES).optional(),
      triggerValue: z.number().nullish(),
      triggerProduct: z.string().nullish(),
      filterCriteria: z.any().optional(),
      actions: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.automation.update({
        where: { id, organizationId: ctx.organizationId },
        data: { ...data, trigger: data.trigger as any },
      });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.automation.delete({ where: { id: input.id, organizationId: ctx.organizationId } });
    }),
});
