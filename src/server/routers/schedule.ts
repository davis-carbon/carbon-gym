import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, staffProcedure } from "../trpc";
import { sendAppointmentConfirmation } from "@/lib/email";

export const scheduleRouter = createTRPCRouter({
  // ── Service Categories ────────────────
  serviceCategories: createTRPCRouter({
    list: staffProcedure.query(async ({ ctx }) => {
      return ctx.db.serviceCategory.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { services: true } } },
      });
    }),
    create: staffProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.serviceCategory.create({
          data: { name: input.name, organizationId: ctx.organizationId },
        });
      }),
    delete: staffProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.serviceCategory.delete({
          where: { id: input.id, organizationId: ctx.organizationId },
        });
      }),
  }),

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

  // ── Client Packages ───────────────────
  clientPackages: createTRPCRouter({
    assign: staffProcedure
      .input(z.object({
        clientId: z.string(),
        packageId: z.string(),
        startDate: z.date().optional(),
        sessionsOverride: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const pkg = await ctx.db.package.findFirstOrThrow({
          where: { id: input.packageId, organizationId: ctx.organizationId },
        });
        return ctx.db.clientPackage.create({
          data: {
            clientId: input.clientId,
            packageId: input.packageId,
            startDate: input.startDate ?? new Date(),
            sessionsRemaining: input.sessionsOverride ?? pkg.sessionCount ?? null,
            sessionsUsed: 0,
            status: "active",
          },
          include: { package: true },
        });
      }),

    addSessions: staffProcedure
      .input(z.object({
        id: z.string(),
        count: z.number().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify client package belongs to this org via join
        await ctx.db.clientPackage.findFirstOrThrow({
          where: { id: input.id, client: { organizationId: ctx.organizationId } },
        });
        return ctx.db.clientPackage.update({
          where: { id: input.id },
          data: { sessionsRemaining: { increment: input.count } },
        });
      }),

    cancel: staffProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db.clientPackage.findFirstOrThrow({
          where: { id: input.id, client: { organizationId: ctx.organizationId } },
        });
        return ctx.db.clientPackage.update({
          where: { id: input.id },
          data: { status: "cancelled", endDate: new Date() },
        });
      }),

    adjustExpiry: staffProcedure
      .input(z.object({ id: z.string(), endDate: z.date() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db.clientPackage.findFirstOrThrow({
          where: { id: input.id, client: { organizationId: ctx.organizationId } },
        });
        return ctx.db.clientPackage.update({
          where: { id: input.id },
          data: { endDate: input.endDate },
        });
      }),

    pause: staffProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db.clientPackage.findFirstOrThrow({
          where: { id: input.id, client: { organizationId: ctx.organizationId } },
        });
        return ctx.db.clientPackage.update({
          where: { id: input.id },
          data: { status: "paused" },
        });
      }),

    resume: staffProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db.clientPackage.findFirstOrThrow({
          where: { id: input.id, client: { organizationId: ctx.organizationId } },
        });
        return ctx.db.clientPackage.update({
          where: { id: input.id },
          data: { status: "active" },
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
    create: staffProcedure
      .input(z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        phone: z.string().optional(),
        timezone: z.string().default("America/Denver"),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.location.create({ data: { ...input, organizationId: ctx.organizationId } });
      }),
    update: staffProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        address: z.string().nullish(),
        city: z.string().nullish(),
        state: z.string().nullish(),
        zip: z.string().nullish(),
        phone: z.string().nullish(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return ctx.db.location.update({ where: { id, organizationId: ctx.organizationId }, data });
      }),
    delete: staffProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.location.delete({ where: { id: input.id, organizationId: ctx.organizationId } });
      }),
  }),

  // ── Availability Schedules ────────────
  availability: createTRPCRouter({
    listByStaff: staffProcedure
      .input(z.object({ staffId: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return ctx.db.availabilitySchedule.findMany({
          where: {
            staff: { organizationId: ctx.organizationId },
            ...(input?.staffId && { staffId: input.staffId }),
          },
          include: {
            staff: { select: { firstName: true, lastName: true } },
            location: { select: { name: true } },
            slots: true,
          },
          orderBy: { staff: { firstName: "asc" } },
        });
      }),
    create: staffProcedure
      .input(z.object({
        staffId: z.string(),
        name: z.string().default("Default"),
        locationId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.availabilitySchedule.create({ data: input });
      }),
    addSlot: staffProcedure
      .input(z.object({
        scheduleId: z.string(),
        dayOfWeek: z.enum(["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"]),
        startTime: z.string(),
        endTime: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.availabilitySlot.create({ data: input });
      }),
    deleteSlot: staffProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.availabilitySlot.delete({ where: { id: input.id } });
      }),
    deleteSchedule: staffProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.availabilitySchedule.delete({ where: { id: input.id } });
      }),
  }),

  // ── Recurring Members ────────────────
  recurringMembers: createTRPCRouter({
    create: staffProcedure
      .input(z.object({
        clientId: z.string(),
        serviceId: z.string(),
        staffId: z.string(),
        startDate: z.date(),
        endDate: z.date().optional(),
        dayOfWeek: z.enum(["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"]),
        startTime: z.string(),
        frequency: z.string().default("weekly"),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.recurringMember.create({ data: input });
      }),
    delete: staffProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.recurringMember.update({ where: { id: input.id }, data: { isActive: false } });
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

        // Fire confirmation email (non-blocking)
        ctx.db.client.findUnique({
          where: { id: input.clientId },
          select: { email: true, firstName: true, lastName: true },
        }).then(async (client) => {
          if (!client?.email) return;
          const [staff, service, location] = await Promise.all([
            ctx.db.staffMember.findUnique({ where: { id: input.staffId }, select: { firstName: true, lastName: true } }),
            ctx.db.service.findUnique({ where: { id: input.serviceId }, select: { name: true } }),
            input.locationId ? ctx.db.location.findUnique({ where: { id: input.locationId }, select: { name: true } }) : Promise.resolve(null),
          ]);
          if (!staff || !service) return;
          await sendAppointmentConfirmation({
            to: client.email,
            clientName: `${client.firstName} ${client.lastName}`,
            serviceName: service.name,
            staffName: `${staff.firstName} ${staff.lastName}`,
            scheduledAt: input.scheduledAt,
            locationName: location?.name,
          }).catch(() => {}); // silent fail
        }).catch(() => {});

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

        const updated = await ctx.db.appointment.update({
          where: { id, organizationId: ctx.organizationId },
          data: {
            status: status as never,
            ...(["CANCELLED", "EARLY_CANCEL", "LATE_CANCEL"].includes(status) && {
              cancelledAt: new Date(),
              cancelReason,
            }),
          },
          select: { id: true, clientId: true, clientPackageId: true },
        });

        // Session deduction on completion
        if (status === "COMPLETED") {
          const { clientId, clientPackageId } = updated;

          if (clientPackageId) {
            // Already linked — deduct from the linked package if it has sessions
            const pkg = await ctx.db.clientPackage.findUnique({
              where: { id: clientPackageId },
              select: { id: true, sessionsRemaining: true },
            });
            if (pkg && pkg.sessionsRemaining !== null && pkg.sessionsRemaining > 0) {
              await ctx.db.clientPackage.update({
                where: { id: pkg.id },
                data: { sessionsRemaining: { decrement: 1 }, sessionsUsed: { increment: 1 } },
              });
            }
          } else {
            // No package linked — find the client's oldest active package with sessions remaining
            const activePkg = await ctx.db.clientPackage.findFirst({
              where: { clientId, status: "active", sessionsRemaining: { gt: 0 } },
              orderBy: { startDate: "asc" },
              select: { id: true, sessionsRemaining: true },
            });
            if (activePkg) {
              await ctx.db.clientPackage.update({
                where: { id: activePkg.id },
                data: { sessionsRemaining: { decrement: 1 }, sessionsUsed: { increment: 1 } },
              });
              // Link the appointment to the package
              await ctx.db.appointment.update({
                where: { id },
                data: { clientPackageId: activePkg.id },
              });
            }
          }
        }

        return updated;
      }),

    bulkUpdateStatus: staffProcedure
      .input(z.object({
        ids: z.array(z.string()).min(1),
        status: z.enum(["RESERVED", "CONFIRMED", "COMPLETED", "CANCELLED", "EARLY_CANCEL", "NO_SHOW", "LATE_CANCEL"]),
        cancelReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { ids, status, cancelReason } = input;
        const isCancel = ["CANCELLED", "EARLY_CANCEL", "LATE_CANCEL"].includes(status);
        return ctx.db.appointment.updateMany({
          where: { id: { in: ids }, organizationId: ctx.organizationId },
          data: {
            status: status as never,
            ...(isCancel && { cancelledAt: new Date(), cancelReason }),
          },
        });
      }),

    reschedule: staffProcedure
      .input(z.object({
        id: z.string(),
        scheduledAt: z.date(),
        endAt: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, scheduledAt, endAt } = input;

        // Fetch the appointment to get staffId
        const appt = await ctx.db.appointment.findFirstOrThrow({
          where: { id, organizationId: ctx.organizationId },
          select: { staffId: true },
        });

        // Double-booking guard: check for conflicting appointments for the same staff
        const conflict = await ctx.db.appointment.findFirst({
          where: {
            id: { not: id },
            organizationId: ctx.organizationId,
            staffId: appt.staffId,
            status: { in: ["RESERVED", "CONFIRMED"] },
            AND: [
              { scheduledAt: { lt: endAt } },
              { endAt: { gt: scheduledAt } },
            ],
          },
          select: { id: true, scheduledAt: true, endAt: true },
        });

        if (conflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Staff already has an appointment from ${conflict.scheduledAt.toLocaleTimeString()} to ${conflict.endAt?.toLocaleTimeString()}`,
          });
        }

        return ctx.db.appointment.update({
          where: { id, organizationId: ctx.organizationId },
          data: { scheduledAt, endAt },
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
