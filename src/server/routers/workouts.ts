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
                  exercise: { select: { id: true, name: true, muscleGroup: true, youtubeVideoId: true, thumbnailUrl: true, videoUrl: true } },
                  sets: { orderBy: { setNumber: "asc" } },
                  alternates: {
                    orderBy: { sortOrder: "asc" },
                    include: { exercise: { select: { id: true, name: true, muscleGroup: true, youtubeVideoId: true, thumbnailUrl: true } } },
                  },
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
      percentage: z.number().nullish(),
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
          percentage: input.percentage,
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
      staffNotes: z.string().nullish(),
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

  // ── Rep Maxes ────────────────────────────────────────────────────────────

  listRepMaxes: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.repMax.findMany({
        where: { clientId: input.clientId },
        orderBy: [{ exerciseId: "asc" }, { recordedAt: "desc" }],
        include: {
          exercise: { select: { id: true, name: true } },
          recordedBy: { select: { firstName: true, lastName: true } },
        },
      });
    }),

  addRepMax: staffProcedure
    .input(z.object({
      clientId: z.string(),
      exerciseId: z.string(),
      reps: z.number().int().min(1),
      weight: z.number().min(0),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.repMax.create({
        data: {
          clientId: input.clientId,
          exerciseId: input.exerciseId,
          reps: input.reps,
          weight: input.weight,
          notes: input.notes,
          recordedById: ctx.staff.id,
        },
        include: { exercise: { select: { id: true, name: true } } },
      });
    }),

  deleteRepMax: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.repMax.delete({ where: { id: input.id } });
    }),

  // ── Plan Assignments ─────────────────────────────────────────────────────

  listPlanAssignments: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.planAssignment.findMany({
        where: { clientId: input.clientId },
        orderBy: { createdAt: "desc" },
        include: { plan: { select: { id: true, name: true, sizeWeeks: true, status: true } } },
      });
    }),

  assignPlan: staffProcedure
    .input(z.object({
      clientId: z.string(),
      planId: z.string(),
      startDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.planAssignment.create({
        data: {
          clientId: input.clientId,
          planId: input.planId,
          startDate: input.startDate ?? new Date(),
          assignedById: ctx.staff.id,
          isActive: true,
        },
        include: { plan: { select: { id: true, name: true, sizeWeeks: true } } },
      });
    }),

  removePlanAssignment: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.planAssignment.delete({ where: { id: input.id } });
    }),

  listWorkoutPlans: staffProcedure
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.workoutPlan.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(input.query ? { name: { contains: input.query, mode: "insensitive" } } : {}),
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, sizeWeeks: true, status: true, description: true },
        take: 100,
      });
    }),

  // ── Set / Exercise / Block Updates ──────────────────────────────────────

  updateSet: staffProcedure
    .input(z.object({
      setId: z.string(),
      reps: z.number().nullish(),
      weight: z.number().nullish(),
      time: z.number().nullish(),
      distance: z.number().nullish(),
      calories: z.number().nullish(),
      rpe: z.number().nullish(),
      percentage: z.number().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { setId, ...data } = input;
      return ctx.db.workoutBlockExerciseSet.update({ where: { id: setId }, data });
    }),

  deleteSet: staffProcedure
    .input(z.object({ setId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workoutBlockExerciseSet.delete({ where: { id: input.setId } });
    }),

  updateBlockExercise: staffProcedure
    .input(z.object({
      id: z.string(),
      notes: z.string().nullish(),
      restSeconds: z.number().nullish(),
      measurementType: z.string().optional(),
      tempo: z.string().nullish(),
      intensity: z.string().nullish(),
      isAmrap: z.boolean().optional(),
      eachSide: z.boolean().optional(),
      progressions: z.boolean().optional(),
      saveAsRepMax: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.workoutBlockExercise.update({ where: { id }, data });
    }),

  linkExerciseToBlock: staffProcedure
    .input(z.object({ blockExerciseId: z.string(), targetBlockId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get source block so we can clean it up after
      const ex = await ctx.db.workoutBlockExercise.findUniqueOrThrow({
        where: { id: input.blockExerciseId },
        select: { blockId: true },
      });
      const sourceBlockId = ex.blockId;

      // Place exercise at end of target block
      const targetCount = await ctx.db.workoutBlockExercise.count({ where: { blockId: input.targetBlockId } });
      await ctx.db.workoutBlockExercise.update({
        where: { id: input.blockExerciseId },
        data: { blockId: input.targetBlockId, sortOrder: targetCount },
      });

      // Clean up source block
      const remaining = await ctx.db.workoutBlockExercise.count({ where: { blockId: sourceBlockId } });
      if (remaining === 0) {
        await ctx.db.workoutBlock.delete({ where: { id: sourceBlockId } });
      } else if (remaining === 1) {
        await ctx.db.workoutBlock.update({ where: { id: sourceBlockId }, data: { blockType: "Normal" } });
      }

      // Mark target block as Superset
      await ctx.db.workoutBlock.update({ where: { id: input.targetBlockId }, data: { blockType: "Superset" } });
    }),

  unlinkExercise: staffProcedure
    .input(z.object({ blockExerciseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ex = await ctx.db.workoutBlockExercise.findUniqueOrThrow({
        where: { id: input.blockExerciseId },
        include: {
          block: {
            select: {
              id: true, sortOrder: true, workoutId: true,
              exercises: { orderBy: { sortOrder: "asc" }, select: { id: true } },
            },
          },
        },
      });

      // Split at this exercise: move this one and everything after it to a new block
      const exIndex = ex.block.exercises.findIndex((e) => e.id === input.blockExerciseId);
      const toMove = ex.block.exercises.slice(exIndex).map((e) => e.id);

      // Compute sortOrder between current block and the next
      const allBlocks = await ctx.db.workoutBlock.findMany({
        where: { workoutId: ex.block.workoutId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, sortOrder: true },
      });
      const curIdx = allBlocks.findIndex((b) => b.id === ex.block.id);
      const nextBlk = allBlocks[curIdx + 1];
      const newSortOrder = nextBlk
        ? (ex.block.sortOrder + nextBlk.sortOrder) / 2
        : ex.block.sortOrder + 1;

      const newBlock = await ctx.db.workoutBlock.create({
        data: { workoutId: ex.block.workoutId, name: "Block", blockType: "Normal", sortOrder: newSortOrder },
      });

      await ctx.db.workoutBlockExercise.updateMany({
        where: { id: { in: toMove } },
        data: { blockId: newBlock.id },
      });

      // Downgrade original block if it now has ≤1 exercise
      const remaining = await ctx.db.workoutBlockExercise.count({ where: { blockId: ex.block.id } });
      if (remaining <= 1) {
        await ctx.db.workoutBlock.update({ where: { id: ex.block.id }, data: { blockType: "Normal" } });
      }
    }),

  addAlternateExercise: staffProcedure
    .input(z.object({ blockExerciseId: z.string(), exerciseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.workoutAlternateExercise.count({
        where: { blockExerciseId: input.blockExerciseId },
      });
      return ctx.db.workoutAlternateExercise.create({
        data: { ...input, sortOrder: existing },
        include: { exercise: { select: { id: true, name: true, muscleGroup: true, youtubeVideoId: true, thumbnailUrl: true } } },
      });
    }),

  removeAlternateExercise: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workoutAlternateExercise.delete({ where: { id: input.id } });
    }),

  updateBlock: staffProcedure
    .input(z.object({
      blockId: z.string(),
      name: z.string().optional(),
      blockType: z.string().optional(),
      sortOrder: z.number().optional(),
      rounds: z.number().nullish(),
      notes: z.string().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { blockId, ...data } = input;
      return ctx.db.workoutBlock.update({ where: { id: blockId }, data });
    }),

  setBlockRounds: staffProcedure
    .input(z.object({ blockId: z.string(), rounds: z.number().min(1).max(99) }))
    .mutation(async ({ ctx, input }) => {
      // Update block rounds field
      await ctx.db.workoutBlock.update({
        where: { id: input.blockId },
        data: { rounds: input.rounds },
      });

      // Sync every exercise's set count to match
      const exercises = await ctx.db.workoutBlockExercise.findMany({
        where: { blockId: input.blockId },
        include: { sets: { orderBy: { setNumber: "asc" } } },
      });

      for (const ex of exercises) {
        const current = ex.sets.length;
        const target = input.rounds;

        if (current < target) {
          // Add sets, copying values from the last existing set
          const last = ex.sets[ex.sets.length - 1];
          for (let i = current + 1; i <= target; i++) {
            await ctx.db.workoutBlockExerciseSet.create({
              data: {
                exerciseId: ex.id,
                setNumber: i,
                reps: last?.reps ?? null,
                weight: last?.weight ?? null,
                time: last?.time ?? null,
                distance: last?.distance ?? null,
                calories: last?.calories ?? null,
                percentage: last?.percentage ?? null,
              },
            });
          }
        } else if (current > target) {
          // Remove sets from the end
          const toRemove = ex.sets.slice(target).map((s) => s.id);
          await ctx.db.workoutBlockExerciseSet.deleteMany({
            where: { id: { in: toRemove } },
          });
        }
      }
    }),

  listRoutines: staffProcedure
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.planRoutine.findMany({
        where: {
          plan: { organizationId: ctx.organizationId },
          ...(input.query ? { name: { contains: input.query, mode: "insensitive" } } : {}),
        },
        orderBy: { name: "asc" },
        take: 50,
        include: {
          plan: { select: { id: true, name: true } },
          exercises: {
            orderBy: { sortOrder: "asc" },
            include: { exercise: { select: { id: true, name: true } } },
          },
        },
      });
    }),

  addRoutineToCalendar: staffProcedure
    .input(z.object({
      clientId: z.string(),
      routineId: z.string(),
      date: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const routine = await ctx.db.planRoutine.findUniqueOrThrow({
        where: { id: input.routineId },
        include: {
          exercises: {
            orderBy: { sortOrder: "asc" },
            include: { exercise: true },
          },
        },
      });
      return ctx.db.clientWorkout.create({
        data: {
          clientId: input.clientId,
          trainerId: ctx.staff.id,
          title: routine.name || "Workout",
          date: input.date,
          source: "routine",
          blocks: {
            create: [{
              name: "Block A",
              blockType: "Normal",
              sortOrder: 0,
              exercises: {
                create: routine.exercises.map((re, i) => ({
                  exerciseId: re.exerciseId,
                  sortOrder: i,
                  restSeconds: re.restSeconds,
                  sets: {
                    create: Array.from({ length: re.sets || 1 }, (_, j) => ({
                      setNumber: j + 1,
                      reps: re.reps ? parseInt(re.reps) || null : null,
                    })),
                  },
                })),
              },
            }],
          },
        },
      });
    }),

  /** Move a workout to a different date (drag-and-drop). */
  moveToDate: staffProcedure
    .input(z.object({ id: z.string(), date: z.date() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.clientWorkout.findFirstOrThrow({
        where: { id: input.id, client: { organizationId: ctx.organizationId } },
      });
      return ctx.db.clientWorkout.update({ where: { id: input.id }, data: { date: input.date } });
    }),

  /** Copy all workouts in a week to 7 days later. */
  duplicateWeek: staffProcedure
    .input(z.object({ clientId: z.string(), weekStart: z.date(), weekEnd: z.date() }))
    .mutation(async ({ ctx, input }) => {
      const workouts = await ctx.db.clientWorkout.findMany({
        where: {
          clientId: input.clientId,
          client: { organizationId: ctx.organizationId },
          date: { gte: input.weekStart, lte: input.weekEnd },
        },
        include: {
          blocks: {
            orderBy: { sortOrder: "asc" },
            include: { exercises: { orderBy: { sortOrder: "asc" }, include: { sets: { orderBy: { setNumber: "asc" } } } } },
          },
        },
      });
      let created = 0;
      for (const workout of workouts) {
        const newDate = new Date(workout.date);
        newDate.setDate(newDate.getDate() + 7);
        await ctx.db.clientWorkout.create({
          data: {
            clientId: workout.clientId,
            trainerId: ctx.staff.id,
            title: workout.title,
            date: newDate,
            source: "duplicated",
            blocks: {
              create: workout.blocks.map((block) => ({
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
                      create: ex.sets.map((s) => ({
                        setNumber: s.setNumber,
                        reps: s.reps,
                        weight: s.weight,
                        time: s.time,
                        distance: s.distance,
                        calories: s.calories,
                      })),
                    },
                  })),
                },
              })),
            },
          },
        });
        created++;
      }
      return { created };
    }),

  /** Delete all workouts in a date range for a client. */
  deleteWeek: staffProcedure
    .input(z.object({ clientId: z.string(), weekStart: z.date(), weekEnd: z.date() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientWorkout.deleteMany({
        where: {
          clientId: input.clientId,
          client: { organizationId: ctx.organizationId },
          date: { gte: input.weekStart, lte: input.weekEnd },
        },
      });
    }),

  // ── Workout Compliance ───────────────────────────────────────────────────

  getComplianceStats: staffProcedure
    .input(z.object({
      clientId: z.string(),
      dateFrom: z.date(),
      dateTo: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const workouts = await ctx.db.clientWorkout.findMany({
        where: {
          clientId: input.clientId,
          date: { gte: input.dateFrom, lte: input.dateTo },
        },
        select: { isCompleted: true },
      });
      const total = workouts.length;
      const completed = workouts.filter((w) => w.isCompleted).length;
      return {
        total,
        completed,
        compliancePct: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    }),
});
