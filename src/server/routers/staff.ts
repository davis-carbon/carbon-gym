import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const staffRouter = createTRPCRouter({
  list: staffProcedure.query(async ({ ctx }) => {
    return ctx.db.staffMember.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: [{ isActive: "desc" }, { firstName: "asc" }],
    });
  }),

  me: staffProcedure.query(async ({ ctx }) => {
    return ctx.staff;
  }),

  updateProfile: staffProcedure
    .input(z.object({
      id: z.string(),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().nullish(),
      bio: z.string().nullish(),
      avatarUrl: z.string().url().nullish(),
      color: z.string().optional(),
      specialties: z.array(z.string()).optional(),
      certifications: z.array(z.string()).optional(),
      linkedinUrl: z.string().url().nullish(),
      instagramUrl: z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      // Only allow updating own profile unless ADMIN
      if (id !== ctx.staff.id && ctx.staff.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Can only update your own profile" });
      }
      return ctx.db.staffMember.update({
        where: { id, organizationId: ctx.organizationId },
        data,
      });
    }),

  /** Invite a new staff member (creates DB record; they'll set password via Supabase invite) */
  invite: staffProcedure
    .input(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      role: z.enum(["OWNER", "ADMIN", "TRAINER", "STAFF"]).default("TRAINER"),
      color: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.staff.role !== "ADMIN" && ctx.staff.role !== "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can invite staff" });
      }
      // Check for duplicate email in org
      const existing = await ctx.db.staffMember.findFirst({
        where: { email: input.email, organizationId: ctx.organizationId },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "A staff member with this email already exists" });
      }
      return ctx.db.staffMember.create({
        data: {
          organizationId: ctx.organizationId,
          userId: `pending_${randomUUID()}`, // placeholder until Supabase invite is accepted
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          role: input.role,
          color: input.color ?? "#6B7280",
        },
      });
    }),

  /** Change a staff member's role */
  updateRole: staffProcedure
    .input(z.object({
      id: z.string(),
      role: z.enum(["OWNER", "ADMIN", "TRAINER", "STAFF"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.staff.role !== "ADMIN" && ctx.staff.role !== "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can change roles" });
      }
      if (input.id === ctx.staff.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own role" });
      }
      return ctx.db.staffMember.update({
        where: { id: input.id, organizationId: ctx.organizationId },
        data: { role: input.role },
      });
    }),

  /** Deactivate a staff member (soft disable — they can no longer log in via staffProcedure) */
  deactivate: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.staff.role !== "ADMIN" && ctx.staff.role !== "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can deactivate staff" });
      }
      if (input.id === ctx.staff.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot deactivate yourself" });
      }
      return ctx.db.staffMember.update({
        where: { id: input.id, organizationId: ctx.organizationId },
        data: { isActive: false },
      });
    }),

  /** Re-activate a previously deactivated staff member */
  activate: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.staff.role !== "ADMIN" && ctx.staff.role !== "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can activate staff" });
      }
      return ctx.db.staffMember.update({
        where: { id: input.id, organizationId: ctx.organizationId },
        data: { isActive: true },
      });
    }),
});
