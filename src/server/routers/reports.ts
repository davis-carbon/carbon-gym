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
