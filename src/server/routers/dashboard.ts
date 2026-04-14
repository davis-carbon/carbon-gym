import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const dashboardRouter = createTRPCRouter({
  kpis: staffProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.organizationId;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const start = input?.startDate ?? startOfMonth;
      const end = input?.endDate ?? now;

      const [
        newAccounts,
        failedPayments,
        expiringPackages,
        completedAssessments,
      ] = await Promise.all([
        ctx.db.client.count({
          where: {
            organizationId: orgId,
            signupDate: { gte: start, lte: end },
          },
        }),
        ctx.db.payment.count({
          where: {
            client: { organizationId: orgId },
            status: "FAILED",
            createdAt: { gte: start, lte: end },
          },
        }),
        ctx.db.clientPackage.count({
          where: {
            client: { organizationId: orgId },
            status: "active",
            endDate: {
              gte: now,
              lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        ctx.db.assessmentSubmission.count({
          where: {
            assessment: { organizationId: orgId },
            completedAt: { gte: start, lte: end },
          },
        }),
      ]);

      return {
        newAccounts,
        failedPayments,
        expiringPackages,
        completedAssessments,
      };
    }),
});
