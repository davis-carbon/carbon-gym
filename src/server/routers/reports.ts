import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const reportsRouter = createTRPCRouter({
  /** Overall client metrics */
  clientMetrics: staffProcedure.query(async ({ ctx }) => {
    const orgId = ctx.organizationId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [total, active, newLast30, newLast90, pendingCancellation] = await Promise.all([
      ctx.db.client.count({ where: { organizationId: orgId } }),
      ctx.db.client.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
      ctx.db.client.count({ where: { organizationId: orgId, signupDate: { gte: thirtyDaysAgo } } }),
      ctx.db.client.count({ where: { organizationId: orgId, signupDate: { gte: ninetyDaysAgo } } }),
      ctx.db.client.count({ where: { organizationId: orgId, status: "PENDING_CANCELLATION" } }),
    ]);

    const byLifecycle = await ctx.db.client.groupBy({
      by: ["lifecycleStage"],
      where: { organizationId: orgId },
      _count: true,
    });

    const byBilling = await ctx.db.client.groupBy({
      by: ["billingStatus"],
      where: { organizationId: orgId },
      _count: true,
    });

    return {
      total, active, newLast30, newLast90, pendingCancellation,
      byLifecycle: byLifecycle.map((b) => ({ stage: b.lifecycleStage, count: b._count })),
      byBilling: byBilling.map((b) => ({ status: b.billingStatus, count: b._count })),
    };
  }),

  /** Staff utilization — appointments per trainer */
  staffUtilization: staffProcedure
    .input(z.object({ startDate: z.date().optional(), endDate: z.date().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const start = input?.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = input?.endDate ?? new Date();

      const staff = await ctx.db.staffMember.findMany({
        where: { organizationId: ctx.organizationId, isActive: true },
      });

      const utilization = await Promise.all(staff.map(async (s) => {
        const [total, completed, cancelled] = await Promise.all([
          ctx.db.appointment.count({ where: { staffId: s.id, scheduledAt: { gte: start, lte: end } } }),
          ctx.db.appointment.count({ where: { staffId: s.id, scheduledAt: { gte: start, lte: end }, status: "COMPLETED" } }),
          ctx.db.appointment.count({ where: { staffId: s.id, scheduledAt: { gte: start, lte: end }, status: { in: ["CANCELLED", "EARLY_CANCEL", "LATE_CANCEL", "NO_SHOW"] } } }),
        ]);
        return {
          staffId: s.id,
          name: `${s.firstName} ${s.lastName}`,
          total, completed, cancelled,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      }));

      return utilization.sort((a, b) => b.total - a.total);
    }),

  /** Workout activity per client */
  workoutActivity: staffProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const active = await ctx.db.client.findMany({
      where: {
        organizationId: ctx.organizationId,
        clientWorkouts: { some: { date: { gte: thirtyDaysAgo } } },
      },
      include: { _count: { select: { clientWorkouts: { where: { date: { gte: thirtyDaysAgo } } } } } },
      orderBy: { clientWorkouts: { _count: "desc" } },
      take: 10,
    });

    const noWorkoutCount = await ctx.db.client.count({
      where: {
        organizationId: ctx.organizationId,
        status: "ACTIVE",
        clientWorkouts: { none: { date: { gte: thirtyDaysAgo } } },
      },
    });

    return {
      topActive: active.map((c) => ({
        clientId: c.id,
        name: `${c.firstName} ${c.lastName}`,
        workoutCount: c._count.clientWorkouts,
      })),
      noWorkoutCount,
    };
  }),

  /** Flat client export — one row per client, for CSV. */
  exportClients: staffProcedure.query(async ({ ctx }) => {
    const clients = await ctx.db.client.findMany({
      where: { organizationId: ctx.organizationId },
      include: { assignedStaff: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return clients.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email ?? "",
      phone: c.phone ?? "",
      gender: c.gender ?? "",
      birthDate: c.birthDate ? c.birthDate.toISOString().split("T")[0] : "",
      signupDate: c.signupDate.toISOString().split("T")[0],
      status: c.status,
      lifecycleStage: c.lifecycleStage,
      billingStatus: c.billingStatus,
      assignedStaff: c.assignedStaff ? `${c.assignedStaff.firstName} ${c.assignedStaff.lastName}` : "",
      height: c.height ?? "",
      weight: c.weight ?? "",
    }));
  }),

  /** Flat visit export — one row per appointment, for CSV. */
  exportVisits: staffProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const visits = await ctx.db.appointment.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...((input?.startDate || input?.endDate) && {
            scheduledAt: {
              ...(input?.startDate && { gte: input.startDate }),
              ...(input?.endDate && { lte: input.endDate }),
            },
          }),
        },
        orderBy: { scheduledAt: "desc" },
        include: {
          client: { select: { firstName: true, lastName: true, email: true } },
          staff: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
          location: { select: { name: true } },
          clientPackage: { select: { package: { select: { name: true } } } },
        },
      });
      return visits.map((v) => ({
        id: v.id,
        date: v.scheduledAt.toISOString().split("T")[0],
        time: v.scheduledAt.toISOString().split("T")[1].slice(0, 5),
        client: `${v.client.firstName} ${v.client.lastName}`,
        clientEmail: v.client.email ?? "",
        staff: `${v.staff.firstName} ${v.staff.lastName}`,
        service: v.service.name,
        location: v.location?.name ?? "",
        status: v.status,
        package: v.clientPackage?.package?.name ?? "",
        cancelReason: v.cancelReason ?? "",
        notes: v.notes ?? "",
      }));
    }),

  /** Flat payment export — one row per payment, for CSV. */
  exportPayments: staffProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const payments = await ctx.db.payment.findMany({
        where: {
          client: { organizationId: ctx.organizationId },
          ...((input?.startDate || input?.endDate) && {
            createdAt: {
              ...(input?.startDate && { gte: input.startDate }),
              ...(input?.endDate && { lte: input.endDate }),
            },
          }),
        },
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { firstName: true, lastName: true, email: true } },
          clientPackage: { select: { package: { select: { name: true } } } },
        },
      });
      return payments.map((p) => ({
        id: p.id,
        date: p.createdAt.toISOString().split("T")[0],
        paidDate: p.paidAt ? p.paidAt.toISOString().split("T")[0] : "",
        client: `${p.client.firstName} ${p.client.lastName}`,
        clientEmail: p.client.email ?? "",
        amount: p.amount.toFixed(2),
        currency: p.currency.toUpperCase(),
        status: p.status,
        package: p.clientPackage?.package?.name ?? "",
        description: p.description ?? "",
        refundedAmount: p.refundedAmount.toFixed(2),
        failureReason: p.failureReason ?? "",
        stripePaymentIntentId: p.stripePaymentIntentId ?? "",
      }));
    }),

  // ── Time-series charts ────────────────────────────────────────────

  /** Revenue over time — last N months */
  revenueTrend: staffProcedure
    .input(z.object({ months: z.number().min(1).max(24).default(6) }))
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setMonth(since.getMonth() - input.months);
      const payments = await ctx.db.payment.findMany({
        where: {
          client: { organizationId: ctx.organizationId },
          createdAt: { gte: since },
          status: { in: ["SUCCEEDED"] },
        },
        select: { createdAt: true, amount: true },
      });
      const byMonth: Record<string, number> = {};
      for (const p of payments) {
        const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
        byMonth[key] = (byMonth[key] ?? 0) + Number(p.amount);
      }
      const result = [];
      for (let i = input.months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        result.push({ month: key, revenue: byMonth[key] ?? 0 });
      }
      return result;
    }),

  /** New clients per month */
  clientGrowth: staffProcedure
    .input(z.object({ months: z.number().min(1).max(24).default(6) }))
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setMonth(since.getMonth() - input.months);
      const clients = await ctx.db.client.findMany({
        where: { organizationId: ctx.organizationId, createdAt: { gte: since } },
        select: { createdAt: true },
      });
      const byMonth: Record<string, number> = {};
      for (const c of clients) {
        const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, "0")}`;
        byMonth[key] = (byMonth[key] ?? 0) + 1;
      }
      const result = [];
      for (let i = input.months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        result.push({ month: key, clients: byMonth[key] ?? 0 });
      }
      return result;
    }),

  /** Appointment completion rate per month */
  appointmentStats: staffProcedure
    .input(z.object({ months: z.number().min(1).max(24).default(6) }))
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setMonth(since.getMonth() - input.months);
      const appts = await ctx.db.appointment.findMany({
        where: { organizationId: ctx.organizationId, scheduledAt: { gte: since } },
        select: { scheduledAt: true, status: true },
      });
      const byMonth: Record<string, { completed: number; cancelled: number; total: number }> = {};
      for (const a of appts) {
        const key = `${a.scheduledAt.getFullYear()}-${String(a.scheduledAt.getMonth() + 1).padStart(2, "0")}`;
        if (!byMonth[key]) byMonth[key] = { completed: 0, cancelled: 0, total: 0 };
        byMonth[key]!.total++;
        if (a.status === "COMPLETED") byMonth[key]!.completed++;
        if (["CANCELLED", "EARLY_CANCEL", "LATE_CANCEL", "NO_SHOW"].includes(a.status)) byMonth[key]!.cancelled++;
      }
      const result = [];
      for (let i = input.months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        result.push({ month: key, ...(byMonth[key] ?? { completed: 0, cancelled: 0, total: 0 }) });
      }
      return result;
    }),

  /** Package / revenue summary */
  revenue: staffProcedure.query(async ({ ctx }) => {
    const [totalClientPackages, activePackages, packagesWithBilling] = await Promise.all([
      ctx.db.clientPackage.count(),
      ctx.db.clientPackage.count({ where: { status: "active" } }),
      ctx.db.client.count({
        where: {
          organizationId: ctx.organizationId,
          OR: [
            { billingStatus: "PAID" },
            { billingStatus: "BILLED" },
          ],
        },
      }),
    ]);

    return { totalClientPackages, activePackages, payingClients: packagesWithBilling };
  }),
});
