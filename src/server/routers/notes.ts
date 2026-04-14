import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const notesRouter = createTRPCRouter({
  listByClient: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.trainerNote.findMany({
        where: { clientId: input.clientId },
        orderBy: { createdAt: "desc" },
        include: { staff: { select: { firstName: true, lastName: true } } },
      });
    }),

  create: staffProcedure
    .input(z.object({
      clientId: z.string(),
      content: z.string().min(1),
      isPrivate: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.trainerNote.create({
        data: { ...input, staffId: ctx.staff.id },
      });
    }),

  update: staffProcedure
    .input(z.object({
      id: z.string(),
      content: z.string().min(1).optional(),
      isPrivate: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.trainerNote.update({ where: { id }, data });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.trainerNote.delete({ where: { id: input.id } });
    }),
});
