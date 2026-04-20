import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

/** Extract YouTube video ID from various URL formats */
function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const exerciseInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().optional(),
  muscleGroup: z.string().optional(),
  secondaryMuscles: z.array(z.string()).optional(),
  difficultyLevel: z.string().optional(),
  forceType: z.string().optional(),
  equipment: z.string().optional(),
  videoUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  tags: z.array(z.string()).default([]),
  // Enhanced fields
  exerciseType: z.string().optional(),
  mechanics: z.string().optional(),
  laterality: z.string().optional(),
  isEachSide: z.boolean().default(false),
  tempo: z.string().optional(),
  steps: z.array(z.string()).default([]),
  tips: z.array(z.string()).default([]),
  variations: z.array(z.string()).default([]),
});

export const exercisesRouter = createTRPCRouter({
  list: staffProcedure
    .input(
      z.object({
        search: z.string().optional(),
        muscleGroup: z.string().optional(),
        difficulty: z.string().optional(),
        exerciseType: z.string().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(200).default(100),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, muscleGroup, difficulty, exerciseType, isActive, limit = 100, cursor } = input ?? {};
      const where = {
        organizationId: ctx.organizationId,
        ...(isActive !== undefined && { isActive }),
        ...(muscleGroup && { muscleGroup: muscleGroup as never }),
        ...(difficulty && { difficultyLevel: difficulty as never }),
        ...(exerciseType && { exerciseType }),
        ...(search && {
          name: { contains: search, mode: "insensitive" as const },
        }),
      };

      const exercises = await ctx.db.exercise.findMany({
        where,
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { name: "asc" },
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
    .input(exerciseInputSchema)
    .mutation(async ({ ctx, input }) => {
      const youtubeVideoId = input.videoUrl ? (extractYoutubeId(input.videoUrl) ?? null) : null;
      return ctx.db.exercise.create({
        data: {
          ...input,
          youtubeVideoId,
          muscleGroup: input.muscleGroup as never,
          secondaryMuscles: (input.secondaryMuscles ?? []) as never,
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
        secondaryMuscles: z.array(z.string()).optional(),
        difficultyLevel: z.string().nullish(),
        forceType: z.string().nullish(),
        equipment: z.string().nullish(),
        videoUrl: z.string().nullish(),
        thumbnailUrl: z.string().nullish(),
        isActive: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
        // Enhanced fields
        exerciseType: z.string().nullish(),
        mechanics: z.string().nullish(),
        laterality: z.string().nullish(),
        isEachSide: z.boolean().optional(),
        tempo: z.string().nullish(),
        steps: z.array(z.string()).optional(),
        tips: z.array(z.string()).optional(),
        variations: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      // Re-parse YouTube ID if video URL changed
      const youtubeVideoId = data.videoUrl !== undefined
        ? (data.videoUrl ? (extractYoutubeId(data.videoUrl) ?? null) : null)
        : undefined;

      return ctx.db.exercise.update({
        where: { id, organizationId: ctx.organizationId },
        data: {
          ...data,
          ...(youtubeVideoId !== undefined ? { youtubeVideoId } : {}),
          muscleGroup: data.muscleGroup as never,
          secondaryMuscles: data.secondaryMuscles as never,
          difficultyLevel: data.difficultyLevel as never,
          forceType: data.forceType as never,
        },
      });
    }),

  /** Bulk import exercises from an array (e.g. from data migration) */
  bulkCreate: staffProcedure
    .input(z.array(exerciseInputSchema))
    .mutation(async ({ ctx, input }) => {
      const results = await ctx.db.$transaction(
        input.map((ex) =>
          ctx.db.exercise.create({
            data: {
              ...ex,
              youtubeVideoId: ex.videoUrl ? (extractYoutubeId(ex.videoUrl) ?? null) : null,
              muscleGroup: ex.muscleGroup as never,
              secondaryMuscles: (ex.secondaryMuscles ?? []) as never,
              difficultyLevel: ex.difficultyLevel as never,
              forceType: ex.forceType as never,
              organizationId: ctx.organizationId,
              createdById: ctx.staff.id,
            },
          })
        )
      );
      return { count: results.length };
    }),
});
