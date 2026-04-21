import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const emailTemplatesRouter = createTRPCRouter({
  list: staffProcedure.query(async ({ ctx }) => {
    return ctx.db.emailTemplate.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "asc" },
    });
  }),

  create: staffProcedure
    .input(z.object({
      name: z.string().min(1),
      subject: z.string().min(1),
      body: z.string().min(1),
      trigger: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.emailTemplate.create({
        data: { ...input, organizationId: ctx.organizationId },
      });
    }),

  update: staffProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      subject: z.string().min(1).optional(),
      body: z.string().min(1).optional(),
      trigger: z.string().nullish(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.emailTemplate.update({
        where: { id, organizationId: ctx.organizationId },
        data,
      });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.emailTemplate.delete({
        where: { id: input.id, organizationId: ctx.organizationId },
      });
    }),
});
