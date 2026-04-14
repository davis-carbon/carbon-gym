import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const plansRouter = createTRPCRouter({
  list: staffProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        createdById: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, status, createdById } = input ?? {};
      return ctx.db.workoutPlan.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(status && { status: status as never }),
          ...(createdById && { createdById }),
          ...(search && { name: { contains: search, mode: "insensitive" as const } }),
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
      return ctx.db.workoutPlan.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
        include: {
          createdBy: true,
          routines: {
            orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }, { sortOrder: "asc" }],
            include: {
              exercises: {
                orderBy: { sortOrder: "asc" },
                include: { exercise: true },
              },
            },
          },
          assignments: {
            include: { client: true, assignedBy: true },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }),

  create: staffProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        sizeWeeks: z.number().min(1).max(52).default(4),
        planType: z.string().optional(),
        tags: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workoutPlan.create({
        data: {
          ...input,
          organizationId: ctx.organizationId,
          createdById: ctx.staff.id,
        },
      });
    }),

  update: staffProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().nullish(),
        sizeWeeks: z.number().min(1).max(52).optional(),
        status: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.workoutPlan.update({
        where: { id, organizationId: ctx.organizationId },
        data: { ...data, status: data.status as never },
      });
    }),

  duplicate: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.db.workoutPlan.findFirstOrThrow({
        where: { id: input.id, organizationId: ctx.organizationId },
        include: {
          routines: {
            include: { exercises: true },
          },
        },
      });

      return ctx.db.workoutPlan.create({
        data: {
          organizationId: ctx.organizationId,
          name: `${original.name} (Copy)`,
          description: original.description,
          sizeWeeks: original.sizeWeeks,
          planType: original.planType,
          tags: original.tags,
          createdById: ctx.staff.id,
          status: "DRAFT",
          routines: {
            create: original.routines.map((r) => ({
              dayNumber: r.dayNumber,
              weekNumber: r.weekNumber,
              name: r.name,
              notes: r.notes,
              sortOrder: r.sortOrder,
              exercises: {
                create: r.exercises.map((e) => ({
                  exerciseId: e.exerciseId,
                  sets: e.sets,
                  reps: e.reps,
                  weight: e.weight,
                  restSeconds: e.restSeconds,
                  duration: e.duration,
                  tempo: e.tempo,
                  notes: e.notes,
                  sortOrder: e.sortOrder,
                })),
              },
            })),
          },
        },
      });
    }),

  assignToClient: staffProcedure
    .input(
      z.object({
        planId: z.string(),
        clientId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.planAssignment.create({
        data: {
          planId: input.planId,
          clientId: input.clientId,
          assignedById: ctx.staff.id,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });
    }),
});
