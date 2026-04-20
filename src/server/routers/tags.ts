import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";
import { fireEventTrigger } from "@/lib/automation-engine";

export const tagsRouter = createTRPCRouter({
  list: staffProcedure.query(async ({ ctx }) => {
    return ctx.db.tag.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { name: "asc" },
      include: { _count: { select: { clients: true } } },
    });
  }),

  create: staffProcedure
    .input(z.object({ name: z.string().min(1), color: z.string().default("#6B7280") }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tag.create({ data: { ...input, organizationId: ctx.organizationId } });
    }),

  addToClient: staffProcedure
    .input(z.object({ clientId: z.string(), tagId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.clientTag.create({ data: input });
      // Fire TAG_ADDED automations (fire-and-forget)
      fireEventTrigger("TAG_ADDED", input.clientId, ctx.organizationId, input.tagId).catch(() => {});
      return result;
    }),

  removeFromClient: staffProcedure
    .input(z.object({ clientId: z.string(), tagId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.clientTag.delete({
        where: { clientId_tagId: { clientId: input.clientId, tagId: input.tagId } },
      });
      // Fire TAG_REMOVED automations (fire-and-forget)
      fireEventTrigger("TAG_REMOVED", input.clientId, ctx.organizationId, input.tagId).catch(() => {});
      return result;
    }),

  update: staffProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).optional(), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.tag.update({ where: { id, organizationId: ctx.organizationId }, data });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tag.delete({ where: { id: input.id, organizationId: ctx.organizationId } });
    }),
});
