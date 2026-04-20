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
        limit: z.number().min(1).max(1000).default(50),
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
      const created = await ctx.db.client.create({
        data: {
          ...input,
          organizationId: ctx.organizationId,
          assignedStaffId: ctx.staff.id,
        },
      });

      // Send welcome email (fire and forget)
      if (created.email) {
        const { sendWelcomeEmail } = await import("@/lib/email");
        sendWelcomeEmail({ firstName: created.firstName, email: created.email }).catch((err) => {
          console.error("[clients.create] Welcome email failed:", err);
        });
      }

      return created;
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
        profileImageUrl: z.string().nullish(),
        address: z.string().nullish(),
        city: z.string().nullish(),
        state: z.string().nullish(),
        zip: z.string().nullish(),
        country: z.string().nullish(),
        billingAddress: z.string().nullish(),
        billingCity: z.string().nullish(),
        billingState: z.string().nullish(),
        billingZip: z.string().nullish(),
        billingCountry: z.string().nullish(),
        appPlatform: z.string().nullish(),
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

  bulkArchive: staffProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.client.updateMany({
        where: { id: { in: input.ids }, organizationId: ctx.organizationId },
        data: { deletedAt: new Date() },
      });
    }),

  bulkAssignStaff: staffProcedure
    .input(z.object({ ids: z.array(z.string()).min(1), staffId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.client.updateMany({
        where: { id: { in: input.ids }, organizationId: ctx.organizationId },
        data: { assignedStaffId: input.staffId },
      });
    }),

  listVisits: staffProcedure
    .input(z.object({
      clientId: z.string(),
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { clientId, limit, cursor } = input;
      const visits = await ctx.db.appointment.findMany({
        where: { clientId, organizationId: ctx.organizationId },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { scheduledAt: "desc" },
        include: {
          service: { select: { name: true } },
          staff: { select: { firstName: true, lastName: true } },
          location: { select: { name: true } },
        },
      });

      let nextCursor: string | undefined;
      if (visits.length > limit) {
        nextCursor = visits.pop()?.id;
      }
      return { visits, nextCursor };
    }),
});
