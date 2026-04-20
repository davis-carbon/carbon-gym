import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, clientProcedure } from "../trpc";
import { portalNutritionProcedures } from "./nutrition";
import { sendPushToClient } from "@/lib/push";

// Map JS getDay() (0=Sun … 6=Sat) to Prisma DayOfWeek enum
const DOW_MAP = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

/**
 * Client portal router — procedures for the logged-in client viewing their own data.
 */
export const portalRouter = createTRPCRouter({
  /** Get the authenticated client's profile. */
  me: clientProcedure.query(async ({ ctx }) => {
    return ctx.db.client.findUniqueOrThrow({
      where: { id: ctx.client.id },
      include: {
        assignedStaff: { select: { firstName: true, lastName: true, email: true } },
        groups: { include: { group: true } },
        tags: { include: { tag: true } },
        clientPackages: { include: { package: true }, where: { status: "active" } },
      },
    });
  }),

  /** Home dashboard — stats + next appointment + unread messages. */
  dashboard: clientProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const client = await ctx.db.client.findUniqueOrThrow({
      where: { id: ctx.client.id },
      select: { organizationId: true },
    });

    const [nextAppointment, workoutCount, recentPlan, unreadMessages, activePackage, availableAssessments, submittedIds, unviewedResources] = await Promise.all([
      ctx.db.appointment.findFirst({
        where: {
          clientId: ctx.client.id,
          scheduledAt: { gte: now },
          status: { in: ["RESERVED", "CONFIRMED"] },
        },
        orderBy: { scheduledAt: "asc" },
        include: { service: true, staff: true },
      }),
      ctx.db.clientWorkout.count({
        where: { clientId: ctx.client.id, isCompleted: true, completedAt: { gte: thirtyDaysAgo } },
      }),
      ctx.db.planAssignment.findFirst({
        where: { clientId: ctx.client.id, isActive: true },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      }),
      ctx.db.messageParticipant.findMany({
        where: { userId: ctx.client.id, userType: "CLIENT" },
        include: { thread: { include: { messages: { take: 1, orderBy: { sentAt: "desc" } } } } },
      }),
      ctx.db.clientPackage.findFirst({
        where: { clientId: ctx.client.id, status: "active" },
        include: { package: true },
        orderBy: { startDate: "desc" },
      }),
      ctx.db.assessment.count({
        where: { organizationId: client.organizationId, isActive: true },
      }),
      ctx.db.assessmentSubmission.findMany({
        where: { clientId: ctx.client.id },
        select: { assessmentId: true },
      }),
      ctx.db.resourceAssignment.count({
        where: { clientId: ctx.client.id, viewedAt: null },
      }),
    ]);

    const pendingAssessments = Math.max(0, availableAssessments - new Set(submittedIds.map((s) => s.assessmentId)).size);

    let unread = 0;
    for (const p of unreadMessages) {
      const lastMsg = p.thread.messages[0];
      if (lastMsg && lastMsg.senderType === "STAFF" && (!p.lastReadAt || new Date(lastMsg.sentAt) > p.lastReadAt)) {
        unread++;
      }
    }

    return {
      nextAppointment,
      workoutCount,
      recentPlan: recentPlan?.plan ?? null,
      unreadMessages: unread,
      activePackage,
      pendingAssessments,
      unviewedResources,
    };
  }),

  /** Get the client's active plan assignment with full week/day structure. */
  activePlan: clientProcedure.query(async ({ ctx }) => {
    const assignment = await ctx.db.planAssignment.findFirst({
      where: { clientId: ctx.client.id, isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        plan: {
          include: {
            routines: {
              orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }, { sortOrder: "asc" }],
              include: {
                exercises: {
                  orderBy: { sortOrder: "asc" },
                  include: {
                    exercise: {
                      select: {
                        id: true, name: true, muscleGroup: true, videoUrl: true,
                        youtubeVideoId: true, thumbnailUrl: true, exerciseType: true,
                        steps: true, tips: true, isEachSide: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) return null;

    // Count completed workout logs tied to this assignment
    const completedLogs = await ctx.db.workoutLog.findMany({
      where: { planAssignmentId: assignment.id, completedAt: { not: null } },
      select: { planRoutineId: true },
    });
    const completedRoutineSet = new Set(completedLogs.map((l) => l.planRoutineId).filter(Boolean));

    return {
      assignment: { id: assignment.id, startDate: assignment.startDate, endDate: assignment.endDate },
      plan: assignment.plan,
      completedRoutineIds: Array.from(completedRoutineSet) as string[],
    };
  }),

  /** Push an active plan to the client's workout calendar as individual ClientWorkout entries. */
  pushPlanToCalendar: clientProcedure
    .input(z.object({
      planAssignmentId: z.string(),
      startDate: z.date(), // Monday of week 1
    }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.planAssignment.findFirst({
        where: { id: input.planAssignmentId, clientId: ctx.client.id, isActive: true },
        include: {
          plan: {
            include: {
              routines: {
                orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
                include: {
                  exercises: {
                    orderBy: { sortOrder: "asc" },
                    include: { exercise: { select: { id: true, name: true } } },
                  },
                },
              },
            },
          },
        },
      });
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });

      const created: string[] = [];

      for (const routine of assignment.plan.routines) {
        // Calculate calendar date: startDate + (weekNumber-1)*7 + (dayNumber-1) days
        const offsetDays = (routine.weekNumber - 1) * 7 + (routine.dayNumber - 1);
        const workoutDate = new Date(input.startDate);
        workoutDate.setDate(workoutDate.getDate() + offsetDays);

        // Check if a workout already exists for this date (don't duplicate)
        const dayStart = new Date(workoutDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart.getTime() + 86400000);
        const existing = await ctx.db.clientWorkout.findFirst({
          where: { clientId: ctx.client.id, date: { gte: dayStart, lt: dayEnd } },
        });
        if (existing) continue;

        // Create the ClientWorkout
        const workout = await ctx.db.clientWorkout.create({
          data: {
            clientId: ctx.client.id,
            planId: assignment.planId,
            date: workoutDate,
            title: routine.name ?? `Week ${routine.weekNumber} Day ${routine.dayNumber}`,
            source: "plan",
          },
        });

        // Create a single block per routine
        if (routine.exercises.length > 0) {
          const block = await ctx.db.workoutBlock.create({
            data: {
              workoutId: workout.id,
              name: routine.name ?? "Main Block",
              blockType: "STRAIGHT",
              sortOrder: 0,
            },
          });

          // Add exercises to the block
          for (let i = 0; i < routine.exercises.length; i++) {
            const re = routine.exercises[i]!;
            const blockExercise = await ctx.db.workoutBlockExercise.create({
              data: {
                blockId: block.id,
                exerciseId: re.exerciseId,
                sortOrder: i,
                notes: re.notes ?? null,
                restSeconds: re.restSeconds ?? null,
              },
            });

            // Pre-create set records so the client can log each one
            const setCount = re.sets ?? 3;
            for (let s = 0; s < setCount; s++) {
              await ctx.db.workoutBlockExerciseSet.create({
                data: {
                  exerciseId: blockExercise.id,
                  setNumber: s + 1,
                  reps: re.reps ? parseInt(re.reps) || null : null,
                  weight: re.weight ? parseFloat(re.weight) || null : null,
                  isCompleted: false,
                },
              });
            }
          }
        }

        created.push(workout.id);
      }

      return { created: created.length };
    }),

  /** Mark a plan routine as complete for the client. */
  logRoutineComplete: clientProcedure
    .input(z.object({ planAssignmentId: z.string(), routineId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.planAssignment.findFirst({
        where: { id: input.planAssignmentId, clientId: ctx.client.id },
        select: { id: true, planId: true },
      });
      if (!assignment) throw new Error("Assignment not found");

      const existing = await ctx.db.workoutLog.findFirst({
        where: { planAssignmentId: input.planAssignmentId, planRoutineId: input.routineId, clientId: ctx.client.id },
      });
      if (existing) return existing;

      return ctx.db.workoutLog.create({
        data: {
          clientId: ctx.client.id,
          planAssignmentId: input.planAssignmentId,
          planRoutineId: input.routineId,
          planId: assignment.planId,
          completedAt: new Date(),
        },
      });
    }),

  /** List client's workouts on their calendar. */
  workouts: clientProcedure
    .input(z.object({ startDate: z.date().optional(), endDate: z.date().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const startDate = input?.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = input?.endDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      return ctx.db.clientWorkout.findMany({
        where: { clientId: ctx.client.id, date: { gte: startDate, lte: endDate } },
        orderBy: { date: "asc" },
        include: {
          blocks: {
            orderBy: { sortOrder: "asc" },
            include: {
              exercises: {
                orderBy: { sortOrder: "asc" },
                include: { exercise: { select: { name: true, videoUrl: true, thumbnailUrl: true } }, sets: true },
              },
            },
          },
        },
      });
    }),

  /** Mark a workout as completed. */
  completeWorkout: clientProcedure
    .input(z.object({ workoutId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientWorkout.update({
        where: { id: input.workoutId, clientId: ctx.client.id },
        data: { isCompleted: true, completedAt: new Date() },
      });
    }),

  /** Get full workout detail for the session logger. */
  workoutSession: clientProcedure
    .input(z.object({ workoutId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workout = await ctx.db.clientWorkout.findFirst({
        where: { id: input.workoutId, clientId: ctx.client.id },
        include: {
          blocks: {
            orderBy: { sortOrder: "asc" },
            include: {
              exercises: {
                orderBy: { sortOrder: "asc" },
                include: {
                  exercise: { select: { id: true, name: true, youtubeVideoId: true, muscleGroup: true, isEachSide: true } },
                  sets: { orderBy: { setNumber: "asc" } },
                },
              },
            },
          },
        },
      });
      if (!workout) throw new TRPCError({ code: "NOT_FOUND", message: "Workout not found" });
      return workout;
    }),

  /** Log a single set as complete. */
  logSet: clientProcedure
    .input(z.object({
      setId: z.string(),
      actualReps: z.number().int().positive().optional(),
      actualWeight: z.number().nonnegative().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership: set → blockExercise → block → workout → client
      const set = await ctx.db.workoutBlockExerciseSet.findFirst({
        where: { id: input.setId },
        include: { blockExercise: { include: { block: { include: { workout: { select: { clientId: true } } } } } } },
      });
      if (!set || set.blockExercise.block.workout.clientId !== ctx.client.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.workoutBlockExerciseSet.update({
        where: { id: input.setId },
        data: { actualReps: input.actualReps, actualWeight: input.actualWeight, isCompleted: true },
      });
    }),

  /** Mark entire workout complete (session logger). */
  completeWorkoutSession: clientProcedure
    .input(z.object({ workoutId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.clientWorkout.update({
        where: { id: input.workoutId, clientId: ctx.client.id },
        data: { isCompleted: true, completedAt: new Date() },
      });
    }),

  /** Upcoming appointments for the client. */
  appointments: clientProcedure.query(async ({ ctx }) => {
    return ctx.db.appointment.findMany({
      where: { clientId: ctx.client.id },
      orderBy: { scheduledAt: "desc" },
      take: 50,
      include: { service: true, staff: { select: { firstName: true, lastName: true } } },
    });
  }),

  /** Reschedule an appointment (client-initiated). */
  rescheduleAppointment: clientProcedure
    .input(z.object({
      id: z.string(),
      scheduledAt: z.date(),
      endAt: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, scheduledAt, endAt } = input;

      // Verify the appointment belongs to this client and is reschedule-eligible
      const appt = await ctx.db.appointment.findFirst({
        where: { id, clientId: ctx.client.id, status: { in: ["RESERVED", "CONFIRMED"] } },
        select: { id: true, staffId: true, scheduledAt: true },
      });
      if (!appt) throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found or cannot be rescheduled" });

      // Prevent rescheduling within 24 hours
      const hoursUntil = (new Date(appt.scheduledAt).getTime() - Date.now()) / 36e5;
      if (hoursUntil < 24) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot reschedule within 24 hours of appointment" });

      // Check for staff conflict
      const conflict = await ctx.db.appointment.findFirst({
        where: {
          id: { not: id },
          staffId: appt.staffId,
          status: { in: ["RESERVED", "CONFIRMED"] },
          AND: [
            { scheduledAt: { lt: endAt } },
            { endAt: { gt: scheduledAt } },
          ],
        },
        select: { id: true },
      });
      if (conflict) throw new TRPCError({ code: "CONFLICT", message: "That time slot is not available" });

      return ctx.db.appointment.update({
        where: { id },
        data: { scheduledAt, endAt, status: "RESERVED" },
      });
    }),

  /** Client's message threads — enriched with staff names. */
  messageThreads: clientProcedure.query(async ({ ctx }) => {
    const participations = await ctx.db.messageParticipant.findMany({
      where: { userId: ctx.client.id, userType: "CLIENT" },
      include: {
        thread: {
          include: {
            messages: {
              take: 1,
              orderBy: { sentAt: "desc" },
              where: { sentAt: { lte: new Date(2090, 0, 1) } },
            },
            participants: true,
          },
        },
      },
      orderBy: { thread: { updatedAt: "desc" } },
    });

    // Resolve staff names in one query
    const staffIds = Array.from(new Set(
      participations.flatMap((p) => p.thread.participants.filter((x) => x.userType === "STAFF").map((x) => x.userId))
    ));
    const staffMembers = staffIds.length > 0
      ? await ctx.db.staffMember.findMany({ where: { id: { in: staffIds } }, select: { id: true, firstName: true, lastName: true, avatarUrl: true } })
      : [];
    const staffById = new Map(staffMembers.map((s) => [s.id, s]));

    return participations.map((p) => {
      const lastMsg = p.thread.messages[0];
      const staffParticipantIds = p.thread.participants.filter((x) => x.userType === "STAFF").map((x) => x.userId);
      const staffList = staffParticipantIds.map((id) => staffById.get(id)).filter(Boolean);
      const displayName = p.thread.isGroup
        ? (p.thread.groupId ? "Group Message" : "Group")
        : staffList[0]
          ? `${staffList[0]!.firstName} ${staffList[0]!.lastName}`
          : "Your Trainer";
      const avatarUrl = staffList[0]?.avatarUrl ?? null;

      return {
        id: p.thread.id,
        displayName,
        avatarUrl,
        isGroup: p.thread.isGroup,
        lastMessage: lastMsg?.body ?? "",
        lastMessageAt: lastMsg?.sentAt ?? p.thread.createdAt,
        unread: !!(lastMsg && lastMsg.senderType === "STAFF" && (!p.lastReadAt || new Date(lastMsg.sentAt) > p.lastReadAt)),
        staffIds: staffParticipantIds,
      };
    });
  }),

  /** Unread message count for the client (for nav badge). */
  unreadMessageCount: clientProcedure.query(async ({ ctx }) => {
    const participations = await ctx.db.messageParticipant.findMany({
      where: { userId: ctx.client.id, userType: "CLIENT" },
      include: {
        thread: {
          include: {
            messages: {
              take: 1,
              orderBy: { sentAt: "desc" },
              where: { sentAt: { lte: new Date(2090, 0, 1) } },
            },
          },
        },
      },
    });
    let count = 0;
    for (const p of participations) {
      const lastMsg = p.thread.messages[0];
      if (lastMsg && lastMsg.senderType === "STAFF" && (!p.lastReadAt || new Date(lastMsg.sentAt) > p.lastReadAt)) {
        count++;
      }
    }
    return count;
  }),

  /** Get messages in a specific thread (client view). */
  thread: clientProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify client is participant
      const participant = await ctx.db.messageParticipant.findFirst({
        where: { threadId: input.threadId, userId: ctx.client.id },
      });
      if (!participant) throw new Error("Not authorized");

      // Mark as read
      await ctx.db.messageParticipant.update({
        where: { id: participant.id },
        data: { lastReadAt: new Date() },
      });

      const thread = await ctx.db.messageThread.findUnique({
        where: { id: input.threadId },
        include: {
          messages: { orderBy: { sentAt: "asc" }, include: { attachments: true } },
          participants: true,
        },
      });

      // Compute the most recent staff read timestamp so client can see read receipts on their messages
      const staffParticipants = (thread?.participants ?? []).filter((p) => p.userType === "STAFF");
      const staffLastReadAt = staffParticipants
        .map((p) => p.lastReadAt)
        .filter((d): d is Date => d != null)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

      return { ...thread, staffLastReadAt };
    }),

  /** Send a message as the client — optionally with attachments. */
  sendMessage: clientProcedure
    .input(z.object({
      threadId: z.string(),
      body: z.string().default(""),
      attachments: z.array(z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
      })).default([]),
    }).refine((d) => d.body.trim().length > 0 || d.attachments.length > 0, {
      message: "Message must contain text or an attachment",
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify client is participant on the thread
      const participant = await ctx.db.messageParticipant.findFirst({
        where: { threadId: input.threadId, userId: ctx.client.id },
        select: { id: true },
      });
      if (!participant) throw new Error("Not authorized");

      const message = await ctx.db.message.create({
        data: {
          threadId: input.threadId,
          senderId: ctx.client.id,
          senderType: "CLIENT",
          body: input.body,
          ...(input.attachments.length > 0 && {
            attachments: { create: input.attachments },
          }),
        },
        include: { attachments: true },
      });
      await ctx.db.messageThread.update({
        where: { id: input.threadId },
        data: { updatedAt: new Date() },
      });
      return message;
    }),

  /** Client's measurements (for progress tracking). */
  measurements: clientProcedure.query(async ({ ctx }) => {
    return ctx.db.measurement.findMany({
      where: { clientId: ctx.client.id },
      orderBy: { date: "desc" },
      take: 50,
    });
  }),

  /** Client's payment history. */
  paymentHistory: clientProcedure.query(async ({ ctx }) => {
    return ctx.db.payment.findMany({
      where: { clientId: ctx.client.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        clientPackage: { include: { package: { select: { name: true } } } },
      },
    });
  }),

  /** Update client's own profile. */
  updateProfile: clientProcedure
    .input(z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().optional(),
      aboutMe: z.string().optional(),
      height: z.string().optional(),
      weight: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      profileImageUrl: z.string().url().nullish(),
      birthDate: z.date().nullish(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.client.update({ where: { id: ctx.client.id }, data: input });
    }),

  /** Log a new measurement for the client. */
  logMeasurement: clientProcedure
    .input(z.object({
      weight: z.number().positive().optional(),
      bodyFatPercent: z.number().min(0).max(100).optional(),
      chest: z.number().positive().optional(),
      waist: z.number().positive().optional(),
      hips: z.number().positive().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.measurement.create({
        data: {
          clientId: ctx.client.id,
          date: new Date(),
          ...input,
        },
      });
    }),

  /** List assessments available to the client — includes submission history. */
  assessments: clientProcedure.query(async ({ ctx }) => {
    const client = await ctx.db.client.findUniqueOrThrow({
      where: { id: ctx.client.id },
      select: { organizationId: true },
    });
    const [active, mine] = await Promise.all([
      ctx.db.assessment.findMany({
        where: { organizationId: client.organizationId, isActive: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, description: true, fields: true, createdAt: true },
      }),
      ctx.db.assessmentSubmission.findMany({
        where: { clientId: ctx.client.id },
        orderBy: { completedAt: "desc" },
        select: { id: true, assessmentId: true, completedAt: true, responses: true, assessment: { select: { name: true } } },
      }),
    ]);
    return { available: active, submissions: mine };
  }),

  /** Get a specific assessment (for the completion form). */
  assessmentById: clientProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.db.client.findUniqueOrThrow({
        where: { id: ctx.client.id },
        select: { organizationId: true },
      });
      return ctx.db.assessment.findFirst({
        where: { id: input.id, organizationId: client.organizationId, isActive: true },
      });
    }),

  /** Submit responses to an assessment. */
  submitAssessment: clientProcedure
    .input(z.object({
      assessmentId: z.string(),
      responses: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.db.client.findUniqueOrThrow({
        where: { id: ctx.client.id },
        select: { organizationId: true },
      });
      // Verify assessment belongs to the client's org
      const assessment = await ctx.db.assessment.findFirst({
        where: { id: input.assessmentId, organizationId: client.organizationId, isActive: true },
        select: { id: true },
      });
      if (!assessment) throw new Error("Assessment not available");

      return ctx.db.assessmentSubmission.create({
        data: {
          assessmentId: input.assessmentId,
          clientId: ctx.client.id,
          responses: input.responses,
        },
      });
    }),

  /** List resources assigned to the client. */
  resources: clientProcedure.query(async ({ ctx }) => {
    return ctx.db.resourceAssignment.findMany({
      where: { clientId: ctx.client.id },
      orderBy: { assignedAt: "desc" },
      include: { resource: true },
    });
  }),

  /** Mark a resource assignment as viewed. */
  viewResource: clientProcedure
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.resourceAssignment.update({
        where: { id: input.assignmentId, clientId: ctx.client.id },
        data: { viewedAt: new Date() },
      });
    }),

  /** All active services for the org (for booking modal). */
  services: clientProcedure.query(async ({ ctx }) => {
    const client = await ctx.db.client.findUniqueOrThrow({
      where: { id: ctx.client.id },
      select: { organizationId: true },
    });
    return ctx.db.service.findMany({
      where: { organizationId: client.organizationId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        category: { select: { name: true } },
      },
    });
  }),

  /** Available time slots for a given date, optionally filtered by staff. */
  availableSlots: clientProcedure
    .input(z.object({
      date: z.string(), // "YYYY-MM-DD"
      staffId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.db.client.findUniqueOrThrow({
        where: { id: ctx.client.id },
        select: { organizationId: true },
      });

      const dateObj = new Date(input.date);
      const jsDow = dateObj.getUTCDay(); // 0=Sun…6=Sat
      const prismaDay = DOW_MAP[jsDow]; // e.g. "MONDAY"

      // Day boundaries in UTC (input.date is treated as a calendar date)
      const dayStart = new Date(`${input.date}T00:00:00.000Z`);
      const dayEnd = new Date(`${input.date}T23:59:59.999Z`);

      // Find active staff members (all or specific one)
      const staffList = await ctx.db.staffMember.findMany({
        where: {
          organizationId: client.organizationId,
          isActive: true,
          ...(input.staffId ? { id: input.staffId } : {}),
        },
        select: { id: true, firstName: true, lastName: true },
      });

      if (staffList.length === 0) return [];

      // Load existing appointments for conflict checking
      const existingAppts = await ctx.db.appointment.findMany({
        where: {
          staffId: { in: staffList.map((s) => s.id) },
          status: { in: ["RESERVED", "CONFIRMED"] },
          scheduledAt: { gte: dayStart, lte: dayEnd },
        },
        select: { staffId: true, scheduledAt: true, endAt: true },
      });

      const slots: { staffId: string; staffName: string; time: string; displayTime: string }[] = [];

      for (const staff of staffList) {
        // Load availability slots for this day
        const availSlots = await ctx.db.availabilitySlot.findMany({
          where: {
            schedule: { staffId: staff.id },
            dayOfWeek: prismaDay,
          },
          select: { startTime: true, endTime: true },
        });

        for (const avail of availSlots) {
          // Parse HH:mm
          const [sh, sm] = avail.startTime.split(":").map(Number) as [number, number];
          const [eh, em] = avail.endTime.split(":").map(Number) as [number, number];
          const startMins = sh * 60 + sm;
          const endMins = eh * 60 + em;

          // Generate 30-min intervals
          for (let mins = startMins; mins + 30 <= endMins; mins += 30) {
            const slotHour = Math.floor(mins / 60);
            const slotMin = mins % 60;

            // Build ISO time for this slot on the given date (local-date interpretation)
            const slotTime = new Date(input.date);
            slotTime.setHours(slotHour, slotMin, 0, 0);
            const slotEndTime = new Date(slotTime.getTime() + 30 * 60 * 1000);

            // Check for conflict: any existing appointment overlaps this slot (with 30-min buffer window)
            const hasConflict = existingAppts.some(
              (a) =>
                a.staffId === staff.id &&
                new Date(a.scheduledAt) < slotEndTime &&
                new Date(a.endAt) > slotTime,
            );

            if (!hasConflict) {
              const displayTime = slotTime.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });
              slots.push({
                staffId: staff.id,
                staffName: `${staff.firstName} ${staff.lastName}`,
                time: slotTime.toISOString(),
                displayTime,
              });
            }
          }
        }
      }

      // Sort by time then staff name
      slots.sort((a, b) => a.time.localeCompare(b.time) || a.staffName.localeCompare(b.staffName));

      return slots;
    }),

  /** Book a new appointment for the client. */
  bookAppointment: clientProcedure
    .input(z.object({
      staffId: z.string(),
      serviceId: z.string(),
      scheduledAt: z.string(), // ISO string
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.db.client.findUniqueOrThrow({
        where: { id: ctx.client.id },
        select: { organizationId: true },
      });

      const service = await ctx.db.service.findFirst({
        where: { id: input.serviceId, organizationId: client.organizationId, isActive: true },
        select: { id: true, durationMinutes: true, name: true },
      });
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });

      const scheduledAt = new Date(input.scheduledAt);
      const endAt = new Date(scheduledAt.getTime() + service.durationMinutes * 60 * 1000);

      // Conflict check
      const conflict = await ctx.db.appointment.findFirst({
        where: {
          staffId: input.staffId,
          status: { in: ["RESERVED", "CONFIRMED"] },
          AND: [
            { scheduledAt: { lt: endAt } },
            { endAt: { gt: scheduledAt } },
          ],
        },
        select: { id: true },
      });
      if (conflict) throw new TRPCError({ code: "CONFLICT", message: "That time slot is no longer available" });

      // Find active client package if any
      const activePackage = await ctx.db.clientPackage.findFirst({
        where: { clientId: ctx.client.id, status: "active" },
        orderBy: { startDate: "desc" },
        select: { id: true },
      });

      const appointment = await ctx.db.appointment.create({
        data: {
          organizationId: client.organizationId,
          clientId: ctx.client.id,
          staffId: input.staffId,
          serviceId: input.serviceId,
          scheduledAt,
          endAt,
          status: "RESERVED",
          ...(activePackage ? { clientPackageId: activePackage.id } : {}),
        },
        include: { service: true, staff: { select: { firstName: true, lastName: true } } },
      });

      // Push notification to client (no staff push configured)
      await sendPushToClient(ctx.client.id, {
        title: "Appointment Booked",
        body: `${service.name} on ${scheduledAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
        url: "/c/schedule",
      }).catch(() => {/* non-fatal */});

      return appointment;
    }),

  // ── Nutrition (merged from portalNutritionProcedures) ──────
  ...portalNutritionProcedures,

  // ── Groups ────────────────────────────────────────────────────

  /** List groups this client belongs to. */
  myGroups: clientProcedure.query(async ({ ctx }) => {
    return ctx.db.clientGroup.findMany({
      where: { clientId: ctx.client.id },
      include: {
        group: {
          select: {
            id: true, name: true, description: true, allowClientPosts: true,
            _count: { select: { members: true, posts: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
  }),

  /** Feed of posts in a group the client belongs to. */
  groupFeed: clientProcedure
    .input(z.object({
      groupId: z.string(),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Verify client is a member
      const membership = await ctx.db.clientGroup.findFirst({
        where: { clientId: ctx.client.id, groupId: input.groupId },
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this group" });

      const posts = await ctx.db.groupPost.findMany({
        where: { groupId: input.groupId },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        include: {
          staffAuthor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          clientAuthor: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              staffAuthor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              clientAuthor: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true } },
            },
          },
          _count: { select: { comments: true } },
        },
      });

      const hasMore = posts.length > input.limit;
      const items = hasMore ? posts.slice(0, -1) : posts;
      return { items, nextCursor: hasMore ? items[items.length - 1]?.id : undefined };
    }),

  /** Client posts to a group (only if allowClientPosts is true). */
  createGroupPost: clientProcedure
    .input(z.object({
      groupId: z.string(),
      content: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify membership + permissions
      const membership = await ctx.db.clientGroup.findFirst({
        where: { clientId: ctx.client.id, groupId: input.groupId },
        include: { group: { select: { allowClientPosts: true } } },
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this group" });
      if (!membership.group.allowClientPosts) throw new TRPCError({ code: "FORBIDDEN", message: "Client posts are not allowed in this group" });

      return ctx.db.groupPost.create({
        data: {
          groupId: input.groupId,
          clientAuthorId: ctx.client.id,
          content: input.content,
        },
        include: {
          clientAuthor: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true } },
          staffAuthor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          _count: { select: { comments: true } },
        },
      });
    }),

  /** Add a comment to a group post. */
  addGroupComment: clientProcedure
    .input(z.object({
      postId: z.string(),
      content: z.string().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify client is in the group this post belongs to
      const post = await ctx.db.groupPost.findFirst({
        where: { id: input.postId },
        select: { groupId: true },
      });
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });

      const membership = await ctx.db.clientGroup.findFirst({
        where: { clientId: ctx.client.id, groupId: post.groupId },
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.db.groupPostComment.create({
        data: {
          postId: input.postId,
          clientAuthorId: ctx.client.id,
          content: input.content,
        },
        include: {
          clientAuthor: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true } },
          staffAuthor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      });
    }),

  // ── Push notifications ───────────────────────────────────────

  /** Store a Web Push subscription for this client. */
  subscribePush: clientProcedure
    .input(z.object({
      endpoint: z.string().url(),
      p256dh: z.string(),
      auth: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.clientPushSubscription.upsert({
        where: { clientId_endpoint: { clientId: ctx.client.id, endpoint: input.endpoint } },
        create: { clientId: ctx.client.id, ...input },
        update: { p256dh: input.p256dh, auth: input.auth },
      });
      return { ok: true };
    }),

  /** Remove all push subscriptions for this client. */
  unsubscribePush: clientProcedure.mutation(async ({ ctx }) => {
    await ctx.db.clientPushSubscription.deleteMany({ where: { clientId: ctx.client.id } });
    return { ok: true };
  }),

  /** Check if this client has any push subscriptions. */
  pushStatus: clientProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.clientPushSubscription.count({ where: { clientId: ctx.client.id } });
    return { subscribed: count > 0 };
  }),
});
