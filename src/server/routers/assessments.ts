import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

const fieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["TEXT", "NUMBER", "SELECT", "MULTI_SELECT", "DATE", "BOOLEAN", "SCALE", "TEXTAREA", "FILE"]),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  min: z.number().optional(),
  max: z.number().optional(),
  helpText: z.string().optional(),
});

export const assessmentsRouter = createTRPCRouter({
  list: staffProcedure
    .input(z.object({ isActive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.assessment.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input?.isActive !== undefined && { isActive: input.isActive }),
        },
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          _count: { select: { submissions: true } },
        },
      });
    }),

  byId: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.assessment.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          submissions: {
            orderBy: { completedAt: "desc" },
            include: { client: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      });
    }),

  create: staffProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      fields: z.array(fieldSchema).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.assessment.create({
        data: {
          name: input.name,
          description: input.description,
          fields: input.fields,
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
      fields: z.array(fieldSchema).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.assessment.update({
        where: { id, organizationId: ctx.organizationId },
        data,
      });
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Soft-disable rather than hard delete to preserve submissions
      return ctx.db.assessment.update({
        where: { id: input.id, organizationId: ctx.organizationId },
        data: { isActive: false },
      });
    }),

  submit: staffProcedure
    .input(z.object({
      assessmentId: z.string(),
      clientId: z.string(),
      responses: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ ctx, input }) => {
      const assessment = await ctx.db.assessment.findFirst({
        where: { id: input.assessmentId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!assessment) throw new Error("Assessment not found");

      return ctx.db.assessmentSubmission.create({
        data: {
          assessmentId: input.assessmentId,
          clientId: input.clientId,
          responses: input.responses,
        },
      });
    }),

  deleteSubmission: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.assessmentSubmission.delete({ where: { id: input.id } });
    }),

  // ── Assignments ──────────────────────────────────────────────────────────────

  listAssignments: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.assessmentAssignment.findMany({
        where: { clientId: input.clientId },
        orderBy: { assignedAt: "desc" },
        include: {
          assessment: { select: { id: true, name: true } },
          assignedBy: { select: { firstName: true, lastName: true } },
        },
      });
    }),

  assign: staffProcedure
    .input(z.object({
      clientId: z.string(),
      assessmentId: z.string(),
      sendReminders: z.boolean().default(false),
      unassignAfterComplete: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const assessment = await ctx.db.assessment.findFirst({
        where: { id: input.assessmentId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!assessment) throw new Error("Assessment not found");

      return ctx.db.assessmentAssignment.create({
        data: {
          assessmentId: input.assessmentId,
          clientId: input.clientId,
          sendReminders: input.sendReminders,
          unassignAfterComplete: input.unassignAfterComplete,
          assignedById: ctx.staff.id,
        },
        include: { assessment: { select: { id: true, name: true } } },
      });
    }),

  deleteAssignment: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.assessmentAssignment.delete({ where: { id: input.id } });
    }),

  listSubmissions: staffProcedure
    .input(z.object({
      clientId: z.string(),
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where = {
        clientId: input.clientId,
        client: { organizationId: ctx.organizationId },
        ...(input.search ? {
          assessment: { name: { contains: input.search, mode: "insensitive" as const } },
        } : {}),
      };
      const [submissions, total] = await Promise.all([
        ctx.db.assessmentSubmission.findMany({
          where,
          orderBy: { completedAt: "desc" },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: { assessment: { select: { id: true, name: true, fields: true } } },
        }),
        ctx.db.assessmentSubmission.count({ where }),
      ]);
      return { submissions, total, page: input.page, perPage: input.perPage };
    }),
});
