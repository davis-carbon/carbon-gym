import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const resourcesRouter = createTRPCRouter({
  list: staffProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.resource.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input?.category && { category: input.category }),
        },
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          _count: { select: { assignments: true } },
        },
      });
    }),

  byId: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.resource.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          assignments: {
            orderBy: { assignedAt: "desc" },
            include: { client: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true } } },
          },
        },
      });
    }),

  create: staffProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      fileUrl: z.string().url(),
      fileType: z.string().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.resource.create({
        data: {
          ...input,
          organizationId: ctx.organizationId,
          createdById: ctx.staff.id,
        },
      });
    }),

  update: staffProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().nullish(),
      fileUrl: z.string().url().optional(),
      fileType: z.string().nullish(),
      category: z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.resource.update({
        where: { id, organizationId: ctx.organizationId },
        data,
      });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.resource.delete({
        where: { id: input.id, organizationId: ctx.organizationId },
      });
    }),

  // ── Assignment ───────────────────────────────
  listAssignmentsForClient: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify client belongs to org
      const client = await ctx.db.client.findFirst({
        where: { id: input.clientId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!client) throw new Error("Client not found");

      return ctx.db.resourceAssignment.findMany({
        where: { clientId: input.clientId },
        orderBy: { assignedAt: "desc" },
        include: { resource: true },
      });
    }),

  assign: staffProcedure
    .input(z.object({ resourceId: z.string(), clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify both resource and client belong to the org
      const [resource, client] = await Promise.all([
        ctx.db.resource.findFirst({ where: { id: input.resourceId, organizationId: ctx.organizationId }, select: { id: true } }),
        ctx.db.client.findFirst({ where: { id: input.clientId, organizationId: ctx.organizationId }, select: { id: true } }),
      ]);
      if (!resource || !client) throw new Error("Resource or client not found");

      // Avoid duplicate assignments
      const existing = await ctx.db.resourceAssignment.findFirst({
        where: { resourceId: input.resourceId, clientId: input.clientId },
      });
      if (existing) return existing;

      return ctx.db.resourceAssignment.create({
        data: { resourceId: input.resourceId, clientId: input.clientId },
      });
    }),

  bulkAssign: staffProcedure
    .input(z.object({ resourceId: z.string(), clientIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const resource = await ctx.db.resource.findFirst({
        where: { id: input.resourceId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!resource) throw new Error("Resource not found");

      // Scope client ids to org
      const validClients = await ctx.db.client.findMany({
        where: { id: { in: input.clientIds }, organizationId: ctx.organizationId },
        select: { id: true },
      });
      const validIds = validClients.map((c) => c.id);

      // Filter out clients already assigned
      const existing = await ctx.db.resourceAssignment.findMany({
        where: { resourceId: input.resourceId, clientId: { in: validIds } },
        select: { clientId: true },
      });
      const alreadyAssigned = new Set(existing.map((e) => e.clientId));
      const toCreate = validIds.filter((id) => !alreadyAssigned.has(id));

      if (toCreate.length === 0) return { count: 0 };

      return ctx.db.resourceAssignment.createMany({
        data: toCreate.map((clientId) => ({ resourceId: input.resourceId, clientId })),
      });
    }),

  assignToGroup: staffProcedure
    .input(z.object({ resourceId: z.string(), groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const resource = await ctx.db.resource.findFirst({
        where: { id: input.resourceId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!resource) throw new Error("Resource not found");

      const members = await ctx.db.clientGroup.findMany({
        where: { groupId: input.groupId, group: { organizationId: ctx.organizationId } },
        select: { clientId: true },
      });
      const clientIds = members.map((m) => m.clientId);
      if (clientIds.length === 0) return { assigned: 0, total: 0 };

      const existing = await ctx.db.resourceAssignment.findMany({
        where: { resourceId: input.resourceId, clientId: { in: clientIds } },
        select: { clientId: true },
      });
      const alreadyAssigned = new Set(existing.map((e) => e.clientId));
      const toCreate = clientIds.filter((id) => !alreadyAssigned.has(id));

      if (toCreate.length > 0) {
        await ctx.db.resourceAssignment.createMany({
          data: toCreate.map((clientId) => ({ resourceId: input.resourceId, clientId })),
        });
      }
      return { assigned: toCreate.length, total: members.length };
    }),

  unassign: staffProcedure
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Scope through resource → org
      const assignment = await ctx.db.resourceAssignment.findFirst({
        where: {
          id: input.assignmentId,
          resource: { organizationId: ctx.organizationId },
        },
        select: { id: true },
      });
      if (!assignment) throw new Error("Assignment not found");

      return ctx.db.resourceAssignment.delete({ where: { id: input.assignmentId } });
    }),
});
