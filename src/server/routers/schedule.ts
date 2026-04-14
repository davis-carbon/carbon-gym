import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const scheduleRouter = createTRPCRouter({
  // ── Services ──────────────────────────
  services: createTRPCRouter({
    list: staffProcedure.query(async ({ ctx }) => {
      return ctx.db.service.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { name: "asc" },
        include: { category: true, location: true },
      });
    }),
    create: staffProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["APPOINTMENT", "CLASS"]).default("APPOINTMENT"),
        durationMinutes: z.number().min(5).default(60),
        maxParticipants: z.number().optional(),
        color: z.string().default("#6B7280"),
        categoryId: z.string().optional(),
        locationId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.service.create({
          data: { ...input, organizationId: ctx.organizationId },
        });
      }),
  }),

  // ── Packages ──────────────────────────
  packages: createTRPCRouter({
    list: staffProcedure.query(async ({ ctx }) => {
      return ctx.db.package.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { name: "asc" },
        include: { _count: { select: { clientPackages: true } } },
      });
    }),
    create: staffProcedure
      .input(z.object({
        name: z.string().min(1),
        packageType: z.enum(["SESSION_PACK", "MEMBERSHIP", "TRIAL", "DROP_IN"]).default("SESSION_PACK"),
        billingCycle: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY", "ONE_TIME"]).default("ONE_TIME"),
        price: z.number().min(0),
        sessionCount: z.number().optional(),
        expiryDays: z.number().optional(),
        autoRenew: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.package.create({
          data: { ...input, organizationId: ctx.organizationId },
        });
      }),
  }),

  // ── Locations ─────────────────────────
  locations: createTRPCRouter({
    list: staffProcedure.query(async ({ ctx }) => {
      return ctx.db.location.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { name: "asc" },
      });
    }),
  }),

  // ── Appointments ──────────────────────
  appointments: createTRPCRouter({
    listByDate: staffProcedure
      .input(z.object({
        date: z.date(),
        staffIds: z.array(z.string()).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const startOfDay = new Date(input.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(input.date);
        endOfDay.setHours(23, 59, 59, 999);

        return ctx.db.appointment.findMany({
          where: {
            organizationId: ctx.organizationId,
            scheduledAt: { gte: startOfDay, lte: endOfDay },
            ...(input.staffIds?.length && { staffId: { in: input.staffIds } }),
          },
          orderBy: { scheduledAt: "asc" },
          include: {
            client: { select: { id: true, firstName: true, lastName: true } },
            staff: { select: { id: true, firstName: true, lastName: true, color: true } },
            service: { select: { id: true, name: true, color: true, durationMinutes: true } },
          },
        });
      }),

    create: staffProcedure
      .input(z.object({
        clientId: z.string(),
        staffId: z.string(),
        serviceId: z.string(),
        locationId: z.string().optional(),
        clientPackageId: z.string().optional(),
        scheduledAt: z.date(),
        endAt: z.date(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const appt = await ctx.db.appointment.create({
          data: { ...input, organizationId: ctx.organizationId },
        });

        // Decrement session count if linked to a session pack
        if (input.clientPackageId) {
          await ctx.db.clientPackage.update({
            where: { id: input.clientPackageId },
            data: { sessionsUsed: { increment: 1 } },
          });
        }

        return appt;
      }),

    updateStatus: staffProcedure
      .input(z.object({
        id: z.string(),
        status: z.enum(["RESERVED", "CONFIRMED", "COMPLETED", "CANCELLED", "EARLY_CANCEL", "NO_SHOW", "LATE_CANCEL"]),
        cancelReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, status, cancelReason } = input;
        return ctx.db.appointment.update({
          where: { id, organizationId: ctx.organizationId },
          data: {
            status: status as never,
            ...(["CANCELLED", "EARLY_CANCEL", "LATE_CANCEL"].includes(status) && {
              cancelledAt: new Date(),
              cancelReason,
            }),
          },
        });
      }),
  }),

  // ── Visits (historical view) ──────────
  visits: createTRPCRouter({
    list: staffProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).default(50),
        cursor: z.string().optional(),
        staffId: z.string().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const { limit = 50, cursor, staffId, status } = input ?? {};
        const visits = await ctx.db.appointment.findMany({
          where: {
            organizationId: ctx.organizationId,
            ...(staffId && { staffId }),
            ...(status && { status: status as never }),
          },
          take: limit + 1,
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
          orderBy: { scheduledAt: "desc" },
          include: {
            client: { select: { firstName: true, lastName: true } },
            staff: { select: { firstName: true, lastName: true } },
            service: { select: { name: true } },
            location: { select: { name: true } },
            clientPackage: { select: { package: { select: { name: true } } } },
          },
        });

        let nextCursor: string | undefined;
        if (visits.length > limit) {
          nextCursor = visits.pop()?.id;
        }
        return { visits, nextCursor };
      }),
  }),

  // ── Recurring Members ─────────────────
  recurring: createTRPCRouter({
    list: staffProcedure.query(async ({ ctx }) => {
      return ctx.db.recurringMember.findMany({
        where: {
          client: { organizationId: ctx.organizationId },
          isActive: true,
        },
        include: {
          client: { select: { firstName: true, lastName: true } },
          staff: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
        },
      });
    }),
  }),
});
