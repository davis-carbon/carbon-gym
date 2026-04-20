import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";
import {
  CARD_TYPES, TIME_RANGES, DEFAULT_CARDS, CARD_META,
  type CardType, type TimeRange, type DashboardCard,
} from "@/lib/dashboard-config";

export { CARD_TYPES, TIME_RANGES, DEFAULT_CARDS, CARD_META };
export type { CardType, TimeRange, DashboardCard };

// ─── Date range helpers ───────────────────────────────────────────────────────

function getDateRange(range: TimeRange, now: Date): { start: Date; end: Date } {
  const d = (offsetDays: number) => new Date(now.getTime() + offsetDays * 86_400_000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86_400_000 - 1);

  switch (range) {
    case "TODAY":
      return { start: startOfToday, end: endOfToday };
    case "THIS_WEEK": {
      const dow = now.getDay();
      const mon = new Date(startOfToday.getTime() - dow * 86_400_000);
      return { start: mon, end: now };
    }
    case "THIS_MONTH":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case "LAST_7_DAYS":
      return { start: d(-7), end: now };
    case "LAST_30_DAYS":
      return { start: d(-30), end: now };
    case "LAST_90_DAYS":
      return { start: d(-90), end: now };
    case "NEXT_7_DAYS":
      return { start: now, end: d(7) };
    case "NEXT_30_DAYS":
      return { start: now, end: d(30) };
    case "NEXT_90_DAYS":
      return { start: now, end: d(90) };
  }
}

function timeRangeLabel(range: TimeRange): string {
  const labels: Record<TimeRange, string> = {
    TODAY: "Today",
    THIS_WEEK: "This Week",
    THIS_MONTH: "This Month",
    LAST_7_DAYS: "Last 7 Days",
    LAST_30_DAYS: "Last 30 Days",
    LAST_90_DAYS: "Last 90 Days",
    NEXT_7_DAYS: "Next 7 Days",
    NEXT_30_DAYS: "Next 30 Days",
    NEXT_90_DAYS: "Next 90 Days",
  };
  return labels[range];
}

// ─── Per-card data fetchers ───────────────────────────────────────────────────

type Db = Parameters<Parameters<typeof staffProcedure.query>[0]>[0]["ctx"]["db"];

async function fetchCard(
  type: CardType,
  timeRange: TimeRange,
  orgId: string,
  db: Db,
  now: Date,
): Promise<{ value: number; isCurrency: boolean }> {
  const { start, end } = getDateRange(timeRange, now);
  const isFuture = timeRange.startsWith("NEXT");

  switch (type) {
    case "NEW_ACCOUNTS":
      return {
        value: await db.client.count({
          where: { organizationId: orgId, signupDate: { gte: start, lte: end } },
        }),
        isCurrency: false,
      };

    case "FAILED_PAYMENTS":
      return {
        value: await db.payment.count({
          where: { client: { organizationId: orgId }, status: "FAILED", createdAt: { gte: start, lte: end } },
        }),
        isCurrency: false,
      };

    case "EXPIRING_PACKAGES":
      return {
        value: await db.clientPackage.count({
          where: {
            client: { organizationId: orgId },
            status: "active",
            endDate: { gte: isFuture ? now : start, lte: end },
          },
        }),
        isCurrency: false,
      };

    case "COMPLETED_ASSESSMENTS":
      return {
        value: await db.assessmentSubmission.count({
          where: { assessment: { organizationId: orgId }, completedAt: { gte: start, lte: end } },
        }),
        isCurrency: false,
      };

    case "NO_LOGGED_WORKOUTS": {
      // Active clients who have NO workout logs in the window
      const activeClients = await db.client.findMany({
        where: { organizationId: orgId, billingStatus: { in: ["PAID", "BILLED"] } },
        select: { id: true },
      });
      const activeIds = activeClients.map((c) => c.id);
      if (activeIds.length === 0) return { value: 0, isCurrency: false };
      const withLogs = await db.workoutLog.findMany({
        where: { clientId: { in: activeIds }, date: { gte: start, lte: end } },
        distinct: ["clientId"],
        select: { clientId: true },
      });
      return { value: activeIds.length - withLogs.length, isCurrency: false };
    }

    case "BIRTHDAY_SOON": {
      // Clients whose birthday (month+day) falls within the window
      const clients = await db.client.findMany({
        where: { organizationId: orgId, birthDate: { not: null } },
        select: { birthDate: true },
      });
      const count = clients.filter(({ birthDate }) => {
        if (!birthDate) return false;
        const bd = new Date(birthDate);
        // Normalize birthday to current year for window comparison
        const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
        const nextYear = new Date(now.getFullYear() + 1, bd.getMonth(), bd.getDate());
        return (thisYear >= start && thisYear <= end) || (nextYear >= start && nextYear <= end);
      }).length;
      return { value: count, isCurrency: false };
    }

    case "NO_RECENT_VISITS": {
      // Active clients with no appointment/visit in the window
      const activeClients = await db.client.findMany({
        where: { organizationId: orgId, billingStatus: { in: ["PAID", "BILLED"] } },
        select: { id: true },
      });
      const activeIds = activeClients.map((c) => c.id);
      if (activeIds.length === 0) return { value: 0, isCurrency: false };
      const withVisits = await db.appointment.findMany({
        where: {
          clientId: { in: activeIds },
          scheduledAt: { gte: start, lte: end },
          status: { in: ["COMPLETED", "CONFIRMED"] },
        },
        distinct: ["clientId"],
        select: { clientId: true },
      });
      return { value: activeIds.length - withVisits.length, isCurrency: false };
    }

    case "NEW_MESSAGES":
      return {
        value: await db.message.count({
          where: {
            thread: { organizationId: orgId },
            sentAt: { gte: start, lte: end },
            senderType: "CLIENT",
          },
        }),
        isCurrency: false,
      };

    case "NEW_UPLOADS":
      return {
        value: await db.resource.count({
          where: { organizationId: orgId, createdAt: { gte: start, lte: end } },
        }),
        isCurrency: false,
      };

    case "ACTIVE_PACKAGES":
      return {
        value: await db.clientPackage.count({
          where: { client: { organizationId: orgId }, status: "active" },
        }),
        isCurrency: false,
      };

    case "ACTIVE_CLIENTS":
      return {
        value: await db.client.count({
          where: { organizationId: orgId, billingStatus: { in: ["PAID", "BILLED"] } },
        }),
        isCurrency: false,
      };

    case "NEW_LEADS":
      return {
        value: await db.client.count({
          where: { organizationId: orgId, lifecycleStage: "LEAD", createdAt: { gte: start, lte: end } },
        }),
        isCurrency: false,
      };

    case "CANCELLATIONS":
      return {
        value: await db.clientPackage.count({
          where: {
            client: { organizationId: orgId },
            status: "cancelled",
            updatedAt: { gte: start, lte: end },
          },
        }),
        isCurrency: false,
      };

    case "RENEWALS":
      // Renewals = payments on existing (non-first) packages: package was created before the window
      return {
        value: await db.payment.count({
          where: {
            client: { organizationId: orgId },
            status: "SUCCEEDED",
            createdAt: { gte: start, lte: end },
            clientPackage: { createdAt: { lt: start } },
          },
        }),
        isCurrency: false,
      };

    case "EXPIRING_CARDS":
      // Clients whose package end date is soon AND have a stripe subscription
      return {
        value: await db.client.count({
          where: {
            organizationId: orgId,
            stripeCustomerId: { not: null },
            clientPackages: {
              some: {
                status: "active",
                endDate: { gte: isFuture ? now : start, lte: end },
              },
            },
          },
        }),
        isCurrency: false,
      };
  }
}

// ─── Card metadata (labels, icons, default time range, available ranges) ─────


const cardSchema = z.object({ id: z.string(), type: z.enum(CARD_TYPES), timeRange: z.enum(TIME_RANGES) });

// ─── Router ───────────────────────────────────────────────────────────────────

export const dashboardRouter = createTRPCRouter({
  /** Fetch values for a set of dashboard cards. */
  cardData: staffProcedure
    .input(z.array(cardSchema))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const results = await Promise.all(
        input.map(async (card) => {
          try {
            const data = await fetchCard(card.type, card.timeRange, ctx.organizationId, ctx.db, now);
            return { id: card.id, ...data, timeRangeLabel: timeRangeLabel(card.timeRange) };
          } catch {
            return { id: card.id, value: 0, isCurrency: false, timeRangeLabel: timeRangeLabel(card.timeRange) };
          }
        }),
      );
      return Object.fromEntries(results.map((r) => [r.id, r]));
    }),

  /** Get this staff member's saved dashboard config. Falls back to DEFAULT_CARDS. */
  getConfig: staffProcedure.query(async ({ ctx }) => {
    const staff = await ctx.db.staffMember.findUnique({
      where: { id: ctx.staff.id },
      select: { dashboardConfig: true },
    });
    const raw = staff?.dashboardConfig;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw as unknown as DashboardCard[];
    }
    return DEFAULT_CARDS;
  }),

  /** Save this staff member's dashboard config. */
  saveConfig: staffProcedure
    .input(z.array(cardSchema))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.staffMember.update({
        where: { id: ctx.staff.id },
        data: { dashboardConfig: input as any },
      });
      return { ok: true };
    }),

  /** Breakdown panel data (leads, clients, sales, renewals, refunds, cancellations). */
  breakdown: staffProcedure
    .input(z.enum(["TODAY", "THIS_WEEK", "THIS_MONTH", "LAST_30_DAYS"]).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const range = input ?? "TODAY";
      const { start, end } = getDateRange(range as TimeRange, now);
      const orgId = ctx.organizationId;

      const [
        newLeads,
        newClients,
        newSalesCount,
        newSalesSum,
        renewalsCount,
        renewalsSum,
        refundsCount,
        refundsSum,
        cancellations,
        failedCount,
        failedSum,
      ] = await Promise.all([
        ctx.db.client.count({ where: { organizationId: orgId, lifecycleStage: "LEAD", createdAt: { gte: start, lte: end } } }),
        ctx.db.client.count({ where: { organizationId: orgId, lifecycleStage: { not: "LEAD" }, createdAt: { gte: start, lte: end } } }),
        ctx.db.payment.count({ where: { client: { organizationId: orgId }, status: "SUCCEEDED", createdAt: { gte: start, lte: end } } }),
        ctx.db.payment.aggregate({ _sum: { amount: true }, where: { client: { organizationId: orgId }, status: "SUCCEEDED", createdAt: { gte: start, lte: end } } }),
        ctx.db.payment.count({ where: { client: { organizationId: orgId }, status: "SUCCEEDED", createdAt: { gte: start, lte: end }, clientPackage: { createdAt: { lt: start } } } }),
        ctx.db.payment.aggregate({ _sum: { amount: true }, where: { client: { organizationId: orgId }, status: "SUCCEEDED", createdAt: { gte: start, lte: end }, clientPackage: { createdAt: { lt: start } } } }),
        ctx.db.payment.count({ where: { client: { organizationId: orgId }, status: "REFUNDED", createdAt: { gte: start, lte: end } } }),
        ctx.db.payment.aggregate({ _sum: { amount: true }, where: { client: { organizationId: orgId }, status: "REFUNDED", createdAt: { gte: start, lte: end } } }),
        ctx.db.clientPackage.count({ where: { client: { organizationId: orgId }, status: "cancelled", updatedAt: { gte: start, lte: end } } }),
        ctx.db.payment.count({ where: { client: { organizationId: orgId }, status: "FAILED", createdAt: { gte: start, lte: end } } }),
        ctx.db.payment.aggregate({ _sum: { amount: true }, where: { client: { organizationId: orgId }, status: "FAILED", createdAt: { gte: start, lte: end } } }),
      ]);

      const salesAmount = Number(newSalesSum._sum?.amount ?? 0);
      const renewalAmount = Number(renewalsSum._sum?.amount ?? 0);
      const refundAmount = Number(refundsSum._sum?.amount ?? 0);
      const totalChange = salesAmount - refundAmount;

      return {
        newLeads,
        newClients,
        newSalesCount,
        newSalesAmount: salesAmount,
        renewalsCount,
        renewalsAmount: renewalAmount,
        refundsCount,
        refundsAmount: refundAmount,
        cancellations,
        failedPaymentsCount: failedCount,
        failedPaymentsAmount: Number(failedSum._sum?.amount ?? 0),
        totalChange,
      };
    }),

  /** Drill-down: return the list of clients behind a KPI card. */
  drillDown: staffProcedure
    .input(z.object({
      type: z.enum(CARD_TYPES),
      timeRange: z.enum(TIME_RANGES),
    }))
    .query(async ({ ctx, input }) => {
      const { type, timeRange } = input;
      const orgId = ctx.organizationId;
      const db = ctx.db;
      const now = new Date();
      const { start, end } = getDateRange(timeRange, now);
      const isFuture = timeRange.startsWith("NEXT");

      type DrillClient = {
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
        detail: string;
      };

      const clients: DrillClient[] = [];

      switch (type) {
        case "NEW_ACCOUNTS": {
          const rows = await db.client.findMany({
            where: { organizationId: orgId, signupDate: { gte: start, lte: end } },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, signupDate: true },
            orderBy: { signupDate: "desc" },
          });
          for (const r of rows) {
            clients.push({
              id: r.id,
              firstName: r.firstName,
              lastName: r.lastName,
              email: r.email,
              phone: r.phone,
              detail: r.signupDate
                ? `Signed up ${r.signupDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                : "Signed up recently",
            });
          }
          break;
        }

        case "FAILED_PAYMENTS": {
          const rows = await db.payment.findMany({
            where: { client: { organizationId: orgId }, status: "FAILED", createdAt: { gte: start, lte: end } },
            select: {
              createdAt: true,
              amount: true,
              client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
            orderBy: { createdAt: "desc" },
          });
          for (const r of rows) {
            clients.push({
              id: r.client.id,
              firstName: r.client.firstName,
              lastName: r.client.lastName,
              email: r.client.email,
              phone: r.client.phone,
              detail: `Failed payment of $${Number(r.amount).toFixed(2)} on ${r.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
            });
          }
          break;
        }

        case "EXPIRING_PACKAGES": {
          const rows = await db.clientPackage.findMany({
            where: {
              client: { organizationId: orgId },
              status: "active",
              endDate: { gte: isFuture ? now : start, lte: end },
            },
            select: {
              endDate: true,
              client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
            orderBy: { endDate: "asc" },
          });
          for (const r of rows) {
            clients.push({
              id: r.client.id,
              firstName: r.client.firstName,
              lastName: r.client.lastName,
              email: r.client.email,
              phone: r.client.phone,
              detail: r.endDate
                ? `Package expires ${r.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                : "Package expiring soon",
            });
          }
          break;
        }

        case "NO_RECENT_VISITS": {
          const activeClients = await db.client.findMany({
            where: { organizationId: orgId, billingStatus: { in: ["PAID", "BILLED"] } },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          });
          if (activeClients.length > 0) {
            const activeIds = activeClients.map((c) => c.id);
            const withVisits = await db.appointment.findMany({
              where: {
                clientId: { in: activeIds },
                scheduledAt: { gte: start, lte: end },
                status: { in: ["COMPLETED", "CONFIRMED"] },
              },
              distinct: ["clientId"],
              select: { clientId: true, scheduledAt: true },
              orderBy: { scheduledAt: "desc" },
            });
            const visitMap = new Map(withVisits.map((v) => [v.clientId, v.scheduledAt]));
            for (const c of activeClients) {
              if (!visitMap.has(c.id)) {
                clients.push({
                  id: c.id,
                  firstName: c.firstName,
                  lastName: c.lastName,
                  email: c.email,
                  phone: c.phone,
                  detail: "No recent visits in window",
                });
              }
            }
          }
          break;
        }

        case "NO_LOGGED_WORKOUTS": {
          const activeClients = await db.client.findMany({
            where: { organizationId: orgId, billingStatus: { in: ["PAID", "BILLED"] } },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          });
          if (activeClients.length > 0) {
            const activeIds = activeClients.map((c) => c.id);
            const withLogs = await db.workoutLog.findMany({
              where: { clientId: { in: activeIds }, date: { gte: start, lte: end } },
              distinct: ["clientId"],
              select: { clientId: true, date: true },
              orderBy: { date: "desc" },
            });
            const logMap = new Map(withLogs.map((l) => [l.clientId, l.date]));
            for (const c of activeClients) {
              if (!logMap.has(c.id)) {
                clients.push({
                  id: c.id,
                  firstName: c.firstName,
                  lastName: c.lastName,
                  email: c.email,
                  phone: c.phone,
                  detail: "No workout logs in window",
                });
              }
            }
          }
          break;
        }

        case "BIRTHDAY_SOON": {
          const rows = await db.client.findMany({
            where: { organizationId: orgId, birthDate: { not: null } },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, birthDate: true },
          });
          for (const r of rows) {
            if (!r.birthDate) continue;
            const bd = new Date(r.birthDate);
            const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
            const nextYear = new Date(now.getFullYear() + 1, bd.getMonth(), bd.getDate());
            const match = (thisYear >= start && thisYear <= end) ? thisYear : (nextYear >= start && nextYear <= end) ? nextYear : null;
            if (match) {
              clients.push({
                id: r.id,
                firstName: r.firstName,
                lastName: r.lastName,
                email: r.email,
                phone: r.phone,
                detail: `Birthday ${match.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
              });
            }
          }
          clients.sort((a, b) => a.detail.localeCompare(b.detail));
          break;
        }

        case "ACTIVE_CLIENTS": {
          const rows = await db.client.findMany({
            where: { organizationId: orgId, billingStatus: { in: ["PAID", "BILLED"] } },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, billingStatus: true },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          });
          for (const r of rows) {
            clients.push({
              id: r.id,
              firstName: r.firstName,
              lastName: r.lastName,
              email: r.email,
              phone: r.phone,
              detail: `Status: ${r.billingStatus}`,
            });
          }
          break;
        }

        case "ACTIVE_PACKAGES": {
          const rows = await db.clientPackage.findMany({
            where: { client: { organizationId: orgId }, status: "active" },
            select: {
              endDate: true,
              client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
            orderBy: { endDate: "asc" },
          });
          for (const r of rows) {
            clients.push({
              id: r.client.id,
              firstName: r.client.firstName,
              lastName: r.client.lastName,
              email: r.client.email,
              phone: r.client.phone,
              detail: r.endDate
                ? `Package expires ${r.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                : "Active package",
            });
          }
          break;
        }

        // Card types without meaningful client drill-down
        case "NEW_MESSAGES":
        case "NEW_UPLOADS":
        case "NEW_LEADS":
        case "COMPLETED_ASSESSMENTS":
        case "CANCELLATIONS":
        case "RENEWALS":
        case "EXPIRING_CARDS":
        default:
          // Return empty — not yet implemented for these card types
          break;
      }

      return clients;
    }),

  /** Last 10 completed workout logs across all org clients. */
  recentWorkouts: staffProcedure.query(async ({ ctx }) => {
    const logs = await ctx.db.workoutLog.findMany({
      where: { client: { organizationId: ctx.organizationId } },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        planAssignment: { include: { plan: { select: { name: true } } } },
      },
    });
    return logs.map((l) => ({
      clientId: l.clientId,
      clientName: `${l.client.firstName} ${l.client.lastName}`,
      workoutTitle: l.planAssignment?.plan?.name ?? "Workout",
      date: l.date,
    }));
  }),

  /** Clients with billingStatus = PAST_DUE. */
  pastDue: staffProcedure.query(async ({ ctx }) => {
    return ctx.db.client.findMany({
      where: { organizationId: ctx.organizationId, billingStatus: "PAST_DUE" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, email: true },
      take: 20,
    });
  }),

  /** Legacy kpis — kept for backwards compatibility. */
  kpis: staffProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const { start, end } = getDateRange("THIS_MONTH", now);
    const orgId = ctx.organizationId;
    const [newAccounts, failedPayments, expiringPackages, completedAssessments] = await Promise.all([
      ctx.db.client.count({ where: { organizationId: orgId, signupDate: { gte: start, lte: end } } }),
      ctx.db.payment.count({ where: { client: { organizationId: orgId }, status: "FAILED", createdAt: { gte: start, lte: end } } }),
      ctx.db.clientPackage.count({ where: { client: { organizationId: orgId }, status: "active", endDate: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) } } }),
      ctx.db.assessmentSubmission.count({ where: { assessment: { organizationId: orgId }, completedAt: { gte: start, lte: end } } }),
    ]);
    return { newAccounts, failedPayments, expiringPackages, completedAssessments };
  }),
});
