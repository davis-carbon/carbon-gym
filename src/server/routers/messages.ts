import { z } from "zod";
import { createTRPCRouter, staffProcedure } from "../trpc";
import { sendPushToClient } from "@/lib/push";

/** Sentinel sentAt value for scheduled-but-not-yet-delivered messages. */
const SCHEDULED_SENTINEL = new Date(2099, 0, 1);

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
            where: { sentAt: { lte: new Date(2090, 0, 1) } }, // exclude pending-scheduled
            orderBy: { sentAt: "asc" },
            include: { attachments: true },
          },
          participants: {
            include: { client: { select: { firstName: true, lastName: true } } },
          },
        },
      });

      // Most recent client-read timestamp — used to render read receipts on staff messages
      const clientParticipants = thread.participants.filter((p) => p.userType === "CLIENT");
      const clientLastReadAt = clientParticipants
        .map((p) => p.lastReadAt)
        .filter((d): d is Date => d != null)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

      // Mark as read AFTER computing client's last read, so the timestamp isn't bumped by this call
      await ctx.db.messageParticipant.updateMany({
        where: { threadId: input.threadId, userId: ctx.staff.id },
        data: { lastReadAt: new Date() },
      });

      return { ...thread, clientLastReadAt };
    }),

  send: staffProcedure
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
      // Verify thread belongs to org
      const thread = await ctx.db.messageThread.findFirst({
        where: { id: input.threadId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!thread) throw new Error("Thread not found");

      const message = await ctx.db.message.create({
        data: {
          threadId: input.threadId,
          senderId: ctx.staff.id,
          senderType: "STAFF",
          body: input.body,
          ...(input.attachments.length > 0 && {
            attachments: { create: input.attachments },
          }),
        },
        include: { attachments: true },
      });

      // Update thread's updatedAt
      await ctx.db.messageThread.update({
        where: { id: input.threadId },
        data: { updatedAt: new Date() },
      });

      // Push notification to the client participant (fire-and-forget)
      const clientParticipant = await ctx.db.messageParticipant.findFirst({
        where: { threadId: input.threadId, userType: "CLIENT" },
        select: { clientId: true },
      });
      if (clientParticipant?.clientId) {
        const staffName = `${ctx.staff.firstName} ${ctx.staff.lastName}`;
        sendPushToClient(clientParticipant.clientId, {
          title: `Message from ${staffName}`,
          body: input.body.trim() || "📎 Attachment",
          url: "/c/messages",
        }).catch(() => {/* non-fatal */});
      }

      return message;
    }),

  /** Schedule a message to be delivered at a future time. */
  sendScheduled: staffProcedure
    .input(z.object({
      threadId: z.string(),
      body: z.string().min(1),
      scheduledAt: z.date().refine((d) => d > new Date(), { message: "Scheduled time must be in the future" }),
    }))
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.db.messageThread.findFirst({
        where: { id: input.threadId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!thread) throw new Error("Thread not found");

      return ctx.db.message.create({
        data: {
          threadId: input.threadId,
          senderId: ctx.staff.id,
          senderType: "STAFF",
          body: input.body,
          scheduledAt: input.scheduledAt,
          sentAt: SCHEDULED_SENTINEL, // hidden from thread until cron delivers it
        },
      });
    }),

  /** List all pending (not yet delivered) scheduled messages for this org. */
  listScheduled: staffProcedure.query(async ({ ctx }) => {
    const messages = await ctx.db.message.findMany({
      where: {
        sentAt: { gt: new Date(2090, 0, 1) }, // sentinel range = pending
        thread: { organizationId: ctx.organizationId },
      },
      include: {
        thread: {
          include: {
            participants: {
              where: { userType: "CLIENT" },
              include: { client: { select: { id: true, firstName: true, lastName: true } } },
            },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return messages.map((m) => {
      const clientParticipant = m.thread.participants[0];
      return {
        id: m.id,
        threadId: m.threadId,
        body: m.body,
        scheduledAt: m.scheduledAt,
        clientName: clientParticipant?.client
          ? `${clientParticipant.client.firstName} ${clientParticipant.client.lastName}`
          : "Unknown",
        clientId: clientParticipant?.client?.id ?? null,
      };
    });
  }),

  /** Cancel (delete) a pending scheduled message. */
  cancelScheduled: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify belongs to org before deleting
      const msg = await ctx.db.message.findFirst({
        where: { id: input.id, sentAt: { gt: new Date(2090, 0, 1) }, thread: { organizationId: ctx.organizationId } },
        select: { id: true },
      });
      if (!msg) throw new Error("Scheduled message not found");
      return ctx.db.message.delete({ where: { id: input.id } });
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

      // Push notification to client
      sendPushToClient(input.clientId, {
        title: `Message from ${ctx.staff.firstName} ${ctx.staff.lastName}`,
        body: input.initialMessage.slice(0, 100),
        url: "/c/messages",
      }).catch(() => {});

      return thread;
    }),

  /** Send a message to all active members of a group (one shared thread). */
  createGroupThread: staffProcedure
    .input(z.object({
      groupId: z.string(),
      initialMessage: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.group.findFirst({
        where: { id: input.groupId, organizationId: ctx.organizationId },
        select: { id: true, name: true },
      });
      if (!group) throw new Error("Group not found");

      const members = await ctx.db.clientGroup.findMany({
        where: { groupId: input.groupId },
        select: { clientId: true },
      });

      const thread = await ctx.db.messageThread.create({
        data: {
          organizationId: ctx.organizationId,
          isGroup: true,
          groupId: input.groupId,
          participants: {
            create: [
              { userId: ctx.staff.id, userType: "STAFF" },
              ...members.map(({ clientId }) => ({
                userId: clientId,
                userType: "CLIENT" as const,
                clientId,
              })),
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

      // Push to all members (fire-and-forget)
      for (const { clientId } of members) {
        sendPushToClient(clientId, {
          title: `Message to ${group.name}`,
          body: input.initialMessage.slice(0, 100),
          url: "/c/messages",
        }).catch(() => {});
      }

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
