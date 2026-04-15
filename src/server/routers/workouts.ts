import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

const setSchema = z.object({
  setNumber: z.number(),
  reps: z.number().nullish(),
  weight: z.number().nullish(),
  time: z.number().nullish(), // seconds
  distance: z.number().nullish(),
  calories: z.number().nullish(),
});

const exerciseSchema = z.object({
  exerciseId: z.string(),
  sortOrder: z.number().default(0),
  notes: z.string().optional(),
  restSeconds: z.number().optional(),
  overrideCalories: z.number().optional(),
  sets: z.array(setSchema),
});

const blockSchema = z.object({
  name: z.string().default("Block A"),
  blockType: z.string().default("Normal"),
  sortOrder: z.number().default(0),
  exercises: z.array(exerciseSchema),
});

export const workoutsRouter = createTRPCRouter({
  /**
   * Get all workouts for a client in a date range (calendar view).
   */
  listByClientAndDateRange: staffProcedure
    .input(z.object({
      clientId: z.string(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.clientWorkout.findMany({
        where: {
          clientId: input.clientId,
          date: { gte: input.startDate, lte: input.endDate },
        },
        orderBy: { date: "asc" },
        include: {
          blocks: {
            orderBy: { sortOrder: "asc" },
            include: {
              exercises: {
                orderBy: { sortOrder: "asc" },
                include: {
                  exercise: { select: { id: true, name: true } },
                  sets: { orderBy: { setNumber: "asc" } },
                },
              },
            },
          },
        },
      });
    }),

  /**
   * Get a single workout with all nested data (editor view).
   */
  byId: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.clientWorkout.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          client: { select: { id: true, firstName: true, lastName: true } },
          trainer: { select: { id: true, firstName: true, lastName: true } },
          blocks: {
            orderBy: { sortOrder: "asc" },
            include: {
              exercises: {
                orderBy: { sortOrder: "asc" },
                include: {
                  exercise: true,
                  sets: { orderBy: { setNumber: "asc" } },
                },
              },
            },
          },
        },
      });
    }),

  /**
   * Create a new workout for a client on a specific date.
   */
  create: staffProcedure
    .input(z.object({
      clientId: z.string(),
      title: z.string().default("Workout"),
      date: z.date(),
      scheduledAt: z.date().optional(),
      source: z.string().default("calendar"),
      blocks: z.array(blockSchema).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientWorkout.create({
        data: {
          clientId: input.clientId,
          trainerId: ctx.staff.id,
          title: input.title,
          date: input.date,
          scheduledAt: input.scheduledAt,
          source: input.source,
          blocks: {
            create: input.blocks.map((block, bi) => ({
              name: block.name,
              blockType: block.blockType,
              sortOrder: bi,
              exercises: {
                create: block.exercises.map((ex, ei) => ({
                  exerciseId: ex.exerciseId,
                  sortOrder: ei,
                  notes: ex.notes,
                  restSeconds: ex.restSeconds,
                  overrideCalories: ex.overrideCalories,
                  sets: {
                    create: ex.sets.map((set) => ({
                      setNumber: set.setNumber,
                      reps: set.reps,
                      weight: set.weight,
                      time: set.time,
                      distance: set.distance,
                      calories: set.calories,
                    })),
                  },
                })),
              },
            })),
          },
        },
        include: { blocks: { include: { exercises: { include: { sets: true } } } } },
      });
    }),

  /**
   * Add a block to an existing workout.
   */
  addBlock: staffProcedure
    .input(z.object({
      workoutId: z.string(),
      name: z.string().default("Block"),
      blockType: z.string().default("Normal"),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.workoutBlock.count({ where: { workoutId: input.workoutId } });
      const letter = String.fromCharCode(65 + existing);
      return ctx.db.workoutBlock.create({
        data: {
          workoutId: input.workoutId,
          name: `${input.name} ${letter}`,
          blockType: input.blockType,
          sortOrder: existing,
        },
      });
    }),

  /**
   * Add an exercise to a block.
   */
  addExerciseToBlock: staffProcedure
    .input(z.object({
      blockId: z.string(),
      exerciseId: z.string(),
      sets: z.array(setSchema).default([{ setNumber: 1, reps: null, weight: null, time: null, distance: null, calories: null }]),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.workoutBlockExercise.count({ where: { blockId: input.blockId } });
      return ctx.db.workoutBlockExercise.create({
        data: {
          blockId: input.blockId,
          exerciseId: input.exerciseId,
          sortOrder: existing,
          sets: {
            create: input.sets.map((s) => ({
              setNumber: s.setNumber,
              reps: s.reps,
              weight: s.weight,
              time: s.time,
              distance: s.distance,
              calories: s.calories,
            })),
          },
        },
        include: { exercise: true, sets: true },
      });
    }),

  /**
   * Add a set to an exercise.
   */
  addSet: staffProcedure
    .input(z.object({
      blockExerciseId: z.string(),
      reps: z.number().nullish(),
      weight: z.number().nullish(),
      time: z.number().nullish(),
      distance: z.number().nullish(),
      calories: z.number().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.workoutBlockExerciseSet.count({ where: { exerciseId: input.blockExerciseId } });
      return ctx.db.workoutBlockExerciseSet.create({
        data: {
          exerciseId: input.blockExerciseId,
          setNumber: existing + 1,
          reps: input.reps,
          weight: input.weight,
          time: input.time,
          distance: input.distance,
          calories: input.calories,
        },
      });
    }),

  /**
   * Update workout metadata (title, completion status).
   */
  update: staffProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      isCompleted: z.boolean().optional(),
      completedAt: z.date().nullish(),
      notes: z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.clientWorkout.update({ where: { id }, data });
    }),

  /**
   * Delete a workout and all its blocks/exercises/sets.
   */
  delete: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientWorkout.delete({ where: { id: input.id } });
    }),

  /**
   * Copy a workout to another date (or same client different day).
   */
  copy: staffProcedure
    .input(z.object({
      workoutId: z.string(),
      targetDate: z.date(),
      targetClientId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.db.clientWorkout.findUniqueOrThrow({
        where: { id: input.workoutId },
        include: {
          blocks: {
            include: {
              exercises: {
                include: { sets: true },
              },
            },
          },
        },
      });

      return ctx.db.clientWorkout.create({
        data: {
          clientId: input.targetClientId || original.clientId,
          trainerId: ctx.staff.id,
          title: original.title,
          date: input.targetDate,
          source: "copied",
          blocks: {
            create: original.blocks.map((block) => ({
              name: block.name,
              blockType: block.blockType,
              sortOrder: block.sortOrder,
              exercises: {
                create: block.exercises.map((ex) => ({
                  exerciseId: ex.exerciseId,
                  sortOrder: ex.sortOrder,
                  notes: ex.notes,
                  restSeconds: ex.restSeconds,
                  overrideCalories: ex.overrideCalories,
                  sets: {
                    create: ex.sets.map((set) => ({
                      setNumber: set.setNumber,
                      reps: set.reps,
                      weight: set.weight,
                      time: set.time,
                      distance: set.distance,
                      calories: set.calories,
                    })),
                  },
                })),
              },
            })),
          },
        },
      });
    }),

  /**
   * Delete a block from a workout.
   */
  deleteBlock: staffProcedure
    .input(z.object({ blockId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workoutBlock.delete({ where: { id: input.blockId } });
    }),

  /**
   * Remove an exercise from a block.
   */
  removeExercise: staffProcedure
    .input(z.object({ blockExerciseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workoutBlockExercise.delete({ where: { id: input.blockExerciseId } });
    }),

  /**
   * Search exercises for the exercise picker in the workout builder.
   */
  searchExercises: staffProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.exercise.findMany({
        where: {
          organizationId: ctx.organizationId,
          name: { contains: input.query, mode: "insensitive" },
          isActive: true,
        },
        take: input.limit,
        orderBy: { name: "asc" },
        select: { id: true, name: true, muscleGroup: true, thumbnailUrl: true },
      });
    }),
});
