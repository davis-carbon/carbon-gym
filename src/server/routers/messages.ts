import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";

export const messagesRouter = createTRPCRouter({
  listThreads: staffProcedure
    .input(z.object({
      unreadOnly: z.boolean().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const threads = await ctx.db.messageThread.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { updatedAt: "desc" },
        include: {
          participants: {
            include: { client: { select: { id: true, firstName: true, lastName: true } } },
          },
          messages: {
            take: 1,
            orderBy: { sentAt: "desc" },
            select: { body: true, sentAt: true, senderId: true, senderType: true },
          },
        },
      });

      return threads.map((thread) => {
        const lastMessage = thread.messages[0];
        const clientParticipant = thread.participants.find((p) => p.userType === "CLIENT");
        const staffParticipant = thread.participants.find(
          (p) => p.userType === "STAFF" && p.userId === ctx.staff.id
        );
        const hasUnread = staffParticipant?.lastReadAt
          ? lastMessage && new Date(lastMessage.sentAt) > staffParticipant.lastReadAt
          : !!lastMessage;

        return {
          id: thread.id,
          clientName: clientParticipant?.client
            ? `${clientParticipant.client.firstName} ${clientParticipant.client.lastName}`
            : "Unknown",
          clientId: clientParticipant?.client?.id,
          lastMessage: lastMessage?.body ?? "",
          lastMessageAt: lastMessage?.sentAt ?? thread.createdAt,
          unread: hasUnread,
          isGroup: thread.isGroup,
        };
      });
    }),

  getThread: staffProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const thread = await ctx.db.messageThread.findFirstOrThrow({
        where: { id: input.threadId, organizationId: ctx.organizationId },
        include: {
          messages: {
            orderBy: { sentAt: "asc" },
            include: { attachments: true },
          },
          participants: {
            include: { client: { select: { firstName: true, lastName: true } } },
          },
        },
      });

      // Mark as read
      await ctx.db.messageParticipant.updateMany({
        where: { threadId: input.threadId, userId: ctx.staff.id },
        data: { lastReadAt: new Date() },
      });

      return thread;
    }),

  send: staffProcedure
    .input(z.object({
      threadId: z.string(),
      body: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.message.create({
        data: {
          threadId: input.threadId,
          senderId: ctx.staff.id,
          senderType: "STAFF",
          body: input.body,
        },
      });

      // Update thread's updatedAt
      await ctx.db.messageThread.update({
        where: { id: input.threadId },
        data: { updatedAt: new Date() },
      });

      return message;
    }),

  createThread: staffProcedure
    .input(z.object({
      clientId: z.string(),
      initialMessage: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.db.messageThread.create({
        data: {
          organizationId: ctx.organizationId,
          participants: {
            create: [
              { userId: ctx.staff.id, userType: "STAFF" },
              { userId: input.clientId, userType: "CLIENT", clientId: input.clientId },
            ],
          },
          messages: {
            create: {
              senderId: ctx.staff.id,
              senderType: "STAFF",
              body: input.initialMessage,
            },
          },
        },
      });

      return thread;
    }),

  unreadCount: staffProcedure.query(async ({ ctx }) => {
    const participations = await ctx.db.messageParticipant.findMany({
      where: { userId: ctx.staff.id },
      include: {
        thread: {
          include: { messages: { take: 1, orderBy: { sentAt: "desc" } } },
        },
      },
    });

    let count = 0;
    for (const p of participations) {
      const lastMsg = p.thread.messages[0];
      if (lastMsg && (!p.lastReadAt || new Date(lastMsg.sentAt) > p.lastReadAt)) {
        count++;
      }
    }
    return count;
  }),
});
