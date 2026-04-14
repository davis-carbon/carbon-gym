import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const exercisesRouter = createTRPCRouter({
  list: staffProcedure
    .input(
      z.object({
        search: z.string().optional(),
        muscleGroup: z.string().optional(),
        difficulty: z.string().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(200).default(100),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, muscleGroup, difficulty, isActive, limit = 100, cursor } = input ?? {};
      const where = {
        organizationId: ctx.organizationId,
        ...(isActive !== undefined && { isActive }),
        ...(muscleGroup && { muscleGroup: muscleGroup as never }),
        ...(difficulty && { difficultyLevel: difficulty as never }),
        ...(search && {
          name: { contains: search, mode: "insensitive" as const },
        }),
      };

      const exercises = await ctx.db.exercise.findMany({
        where,
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { firstName: true, lastName: true } } },
      });

      let nextCursor: string | undefined;
      if (exercises.length > limit) {
        nextCursor = exercises.pop()?.id;
      }

      return { exercises, nextCursor };
    }),

  byId: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.exercise.findFirst({
        where: { id: input.id, organizationId: ctx.organizationId },
        include: { createdBy: true },
      });
    }),

  create: staffProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        instructions: z.string().optional(),
        muscleGroup: z.string().optional(),
        difficultyLevel: z.string().optional(),
        forceType: z.string().optional(),
        equipment: z.string().optional(),
        videoUrl: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        tags: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.exercise.create({
        data: {
          ...input,
          muscleGroup: input.muscleGroup as never,
          difficultyLevel: input.difficultyLevel as never,
          forceType: input.forceType as never,
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
        instructions: z.string().nullish(),
        muscleGroup: z.string().nullish(),
        difficultyLevel: z.string().nullish(),
        forceType: z.string().nullish(),
        equipment: z.string().nullish(),
        videoUrl: z.string().nullish(),
        thumbnailUrl: z.string().nullish(),
        isActive: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.exercise.update({
        where: { id, organizationId: ctx.organizationId },
        data: {
          ...data,
          muscleGroup: data.muscleGroup as never,
          difficultyLevel: data.difficultyLevel as never,
          forceType: data.forceType as never,
        },
      });
    }),
});
