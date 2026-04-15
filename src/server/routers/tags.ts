import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

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
      return ctx.db.clientTag.create({ data: input });
    }),

  removeFromClient: staffProcedure
    .input(z.object({ clientId: z.string(), tagId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientTag.delete({
        where: { clientId_tagId: { clientId: input.clientId, tagId: input.tagId } },
      });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tag.delete({ where: { id: input.id, organizationId: ctx.organizationId } });
    }),
});
