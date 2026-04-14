import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const groupsRouter = createTRPCRouter({
  list: staffProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.group.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input?.search && { name: { contains: input.search, mode: "insensitive" as const } }),
        },
        orderBy: { name: "asc" },
        include: { _count: { select: { members: true } } },
      });
    }),

  byId: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.group.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
        include: {
          members: {
            include: { client: { select: { id: true, firstName: true, lastName: true, email: true } } },
          },
        },
      });
    }),

  create: staffProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.group.create({
        data: { ...input, organizationId: ctx.organizationId },
      });
    }),

  addMember: staffProcedure
    .input(z.object({ groupId: z.string(), clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientGroup.create({ data: input });
    }),

  removeMember: staffProcedure
    .input(z.object({ groupId: z.string(), clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientGroup.delete({
        where: { clientId_groupId: { clientId: input.clientId, groupId: input.groupId } },
      });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.group.delete({ where: { id: input.id, organizationId: ctx.organizationId } });
    }),
});
