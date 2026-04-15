import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const clientsRouter = createTRPCRouter({
  list: staffProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "PENDING_CANCELLATION", "SUSPENDED"]).optional(),
        lifecycleStage: z.enum(["LEAD", "PROSPECT", "CLIENT", "FORMER_CLIENT"]).optional(),
        assignedStaffId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, status, lifecycleStage, assignedStaffId, limit = 50, cursor } = input ?? {};
      const where = {
        organizationId: ctx.organizationId,
        ...(status && { status }),
        ...(lifecycleStage && { lifecycleStage }),
        ...(assignedStaffId && { assignedStaffId }),
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const clients = await ctx.db.client.findMany({
        where,
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { createdAt: "desc" },
        include: {
          assignedStaff: { select: { firstName: true, lastName: true } },
          tags: { include: { tag: true } },
        },
      });

      let nextCursor: string | undefined;
      if (clients.length > limit) {
        const nextItem = clients.pop();
        nextCursor = nextItem?.id;
      }

      return { clients, nextCursor };
    }),

  byId: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.client.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
        include: {
          assignedStaff: true,
          tags: { include: { tag: true } },
          groups: { include: { group: true } },
          clientPackages: { include: { package: true } },
          measurements: { orderBy: { date: "desc" }, take: 20 },
          trainerNotes: { orderBy: { createdAt: "desc" }, include: { staff: true } },
          planAssignments: { include: { plan: true }, orderBy: { createdAt: "desc" } },
          appointments: { orderBy: { scheduledAt: "desc" }, take: 20, include: { service: true, staff: true } },
          assessmentSubmissions: { include: { assessment: true }, orderBy: { completedAt: "desc" } },
          resourceAssignments: { include: { resource: true }, orderBy: { assignedAt: "desc" } },
        },
      });
    }),

  create: staffProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        gender: z.enum(["MALE", "FEMALE", "NON_BINARY", "PREFER_NOT_TO_SAY"]).optional(),
        birthDate: z.date().optional(),
        lifecycleStage: z.enum(["LEAD", "PROSPECT", "CLIENT", "FORMER_CLIENT"]).default("CLIENT"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.client.create({
        data: {
          ...input,
          organizationId: ctx.organizationId,
          assignedStaffId: ctx.staff.id,
        },
      });
    }),

  update: staffProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        gender: z.enum(["MALE", "FEMALE", "NON_BINARY", "PREFER_NOT_TO_SAY"]).nullish(),
        birthDate: z.date().nullish(),
        height: z.string().nullish(),
        weight: z.string().nullish(),
        aboutMe: z.string().nullish(),
        status: z.enum(["ACTIVE", "INACTIVE", "PENDING_CANCELLATION", "SUSPENDED"]).optional(),
        lifecycleStage: z.enum(["LEAD", "PROSPECT", "CLIENT", "FORMER_CLIENT"]).optional(),
        billingStatus: z.enum(["PAID", "NON_BILLED", "BILLED", "PAST_DUE", "CANCELLED"]).optional(),
        assignedStaffId: z.string().nullish(),
        customStatus: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.client.update({
        where: { id, organizationId: ctx.organizationId },
        data,
      });
    }),

  archive: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.client.update({
        where: { id: input.id, organizationId: ctx.organizationId },
        data: { deletedAt: new Date() },
      });
    }),
});
