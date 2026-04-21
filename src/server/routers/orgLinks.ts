import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const orgLinksRouter = createTRPCRouter({
  list: staffProcedure.query(async ({ ctx }) => {
    return ctx.db.orgLink.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "asc" },
    });
  }),

  create: staffProcedure
    .input(z.object({
      name: z.string().min(1),
      url: z.string().url(),
      type: z.enum(["booking", "affiliate", "custom"]).default("custom"),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.orgLink.create({
        data: { ...input, organizationId: ctx.organizationId },
      });
    }),

  update: staffProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      url: z.string().url().optional(),
      type: z.enum(["booking", "affiliate", "custom"]).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.orgLink.update({
        where: { id, organizationId: ctx.organizationId },
        data,
      });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.orgLink.delete({
        where: { id: input.id, organizationId: ctx.organizationId },
      });
    }),
});
