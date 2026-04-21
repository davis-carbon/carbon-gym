import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const orgRouter = createTRPCRouter({
  get: staffProcedure.query(async ({ ctx }) => {
    return ctx.db.organization.findFirst({
      where: { id: ctx.organizationId },
    });
  }),

  update: staffProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      logoUrl: z.string().url().nullish(),
      timezone: z.string().optional(),
      address: z.string().nullish(),
      city: z.string().nullish(),
      state: z.string().nullish(),
      zip: z.string().nullish(),
      phone: z.string().nullish(),
      email: z.string().email().nullish(),
      website: z.string().url().nullish(),
      bio: z.string().nullish(),
      autoReply: z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.staff.role !== "ADMIN" && ctx.staff.role !== "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update organization settings" });
      }
      return ctx.db.organization.update({
        where: { id: ctx.organizationId },
        data: input,
      });
    }),

  updateSettings: staffProcedure
    .input(z.object({ settings: z.record(z.string(), z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.staff.role !== "ADMIN" && ctx.staff.role !== "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update settings" });
      }
      const org = await ctx.db.organization.findUnique({ where: { id: ctx.organizationId }, select: { settings: true } });
      const existing = (org?.settings as Record<string, unknown>) ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const merged: any = { ...existing, ...input.settings };
      return ctx.db.organization.update({
        where: { id: ctx.organizationId },
        data: { settings: merged },
      });
    }),
});
