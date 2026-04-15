import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const automationsRouter = createTRPCRouter({
  list: staffProcedure.query(async ({ ctx }) => {
    return ctx.db.automation.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });
  }),

  create: staffProcedure
    .input(z.object({
      name: z.string().min(1),
      trigger: z.enum(["DAYS_AFTER_PURCHASE", "DAYS_AFTER_SIGNUP", "DAYS_BEFORE_EXPIRY", "ON_FIRST_LOGIN", "MANUAL"]),
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
      trigger: z.enum(["DAYS_AFTER_PURCHASE", "DAYS_AFTER_SIGNUP", "DAYS_BEFORE_EXPIRY", "ON_FIRST_LOGIN", "MANUAL"]).optional(),
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
