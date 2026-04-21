import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const timeCardRouter = createTRPCRouter({
  /** Clock in — creates an open entry for this staff member */
  clockIn: staffProcedure
    .input(z.object({ note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Ensure not already clocked in
      const open = await ctx.db.staffTimeEntry.findFirst({
        where: { staffId: ctx.staff.id, clockedOut: null },
      });
      if (open) throw new TRPCError({ code: "BAD_REQUEST", message: "Already clocked in" });

      return ctx.db.staffTimeEntry.create({
        data: {
          organizationId: ctx.organizationId,
          staffId: ctx.staff.id,
          clockedIn: new Date(),
          note: input.note,
        },
      });
    }),

  /** Clock out — closes the open entry */
  clockOut: staffProcedure.mutation(async ({ ctx }) => {
    const open = await ctx.db.staffTimeEntry.findFirst({
      where: { staffId: ctx.staff.id, clockedOut: null },
    });
    if (!open) throw new TRPCError({ code: "BAD_REQUEST", message: "Not clocked in" });

    return ctx.db.staffTimeEntry.update({
      where: { id: open.id },
      data: { clockedOut: new Date() },
    });
  }),

  /** Active status — is the current user clocked in? */
  status: staffProcedure.query(async ({ ctx }) => {
    const open = await ctx.db.staffTimeEntry.findFirst({
      where: { staffId: ctx.staff.id, clockedOut: null },
    });
    return { isClockedIn: !!open, entry: open ?? null };
  }),

  /** My entries — paginatable */
  myEntries: staffProcedure
    .input(z.object({ weeks: z.number().default(4) }))
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.weeks * 7);
      return ctx.db.staffTimeEntry.findMany({
        where: { staffId: ctx.staff.id, clockedIn: { gte: since } },
        orderBy: { clockedIn: "desc" },
      });
    }),

  /** Admin: all entries for the org */
  listAll: staffProcedure
    .input(z.object({ staffId: z.string().optional(), weeks: z.number().default(4) }))
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.weeks * 7);
      return ctx.db.staffTimeEntry.findMany({
        where: {
          organizationId: ctx.organizationId,
          clockedIn: { gte: since },
          ...(input.staffId ? { staffId: input.staffId } : {}),
        },
        orderBy: { clockedIn: "desc" },
        include: { staff: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      });
    }),

  /** Admin: manual entry add */
  addEntry: staffProcedure
    .input(z.object({
      staffId: z.string(),
      clockedIn: z.string(),
      clockedOut: z.string().optional(),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.staffTimeEntry.create({
        data: {
          organizationId: ctx.organizationId,
          staffId: input.staffId,
          clockedIn: new Date(input.clockedIn),
          clockedOut: input.clockedOut ? new Date(input.clockedOut) : null,
          note: input.note,
        },
      });
    }),

  /** Delete an entry */
  deleteEntry: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.staffTimeEntry.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.staffTimeEntry.delete({ where: { id: input.id } });
    }),
});
