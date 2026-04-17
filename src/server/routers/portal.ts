import { z } from "zod";
import { createTRPCRouter, clientProcedure } from "../trpc";

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

    const [nextAppointment, workoutCount, recentPlan, unreadMessages, activePackage] = await Promise.all([
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
    ]);

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
    };
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

  /** Upcoming appointments for the client. */
  appointments: clientProcedure.query(async ({ ctx }) => {
    return ctx.db.appointment.findMany({
      where: { clientId: ctx.client.id },
      orderBy: { scheduledAt: "desc" },
      take: 50,
      include: { service: true, staff: { select: { firstName: true, lastName: true } } },
    });
  }),

  /** Client's message threads. */
  messageThreads: clientProcedure.query(async ({ ctx }) => {
    const participations = await ctx.db.messageParticipant.findMany({
      where: { userId: ctx.client.id, userType: "CLIENT" },
      include: {
        thread: {
          include: {
            messages: { take: 1, orderBy: { sentAt: "desc" } },
            participants: true,
          },
        },
      },
      orderBy: { thread: { updatedAt: "desc" } },
    });

    return participations.map((p) => {
      const lastMsg = p.thread.messages[0];
      const staffIds = p.thread.participants.filter((x) => x.userType === "STAFF").map((x) => x.userId);
      return {
        id: p.thread.id,
        lastMessage: lastMsg?.body ?? "",
        lastMessageAt: lastMsg?.sentAt ?? p.thread.createdAt,
        unread: lastMsg && lastMsg.senderType === "STAFF" && (!p.lastReadAt || new Date(lastMsg.sentAt) > p.lastReadAt),
        staffIds,
      };
    });
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

      return ctx.db.messageThread.findUnique({
        where: { id: input.threadId },
        include: { messages: { orderBy: { sentAt: "asc" } } },
      });
    }),

  /** Send a message as the client. */
  sendMessage: clientProcedure
    .input(z.object({ threadId: z.string(), body: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.message.create({
        data: {
          threadId: input.threadId,
          senderId: ctx.client.id,
          senderType: "CLIENT",
          body: input.body,
        },
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

  /** Update client's own profile. */
  updateProfile: clientProcedure
    .input(z.object({
      phone: z.string().optional(),
      aboutMe: z.string().optional(),
      height: z.string().optional(),
      weight: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.client.update({ where: { id: ctx.client.id }, data: input });
    }),
});
