import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
});
