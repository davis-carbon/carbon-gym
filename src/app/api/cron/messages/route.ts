import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { sendPushToClient } from "@/lib/push";

/**
 * Vercel Cron endpoint — runs every 15 minutes.
 * Finds scheduled messages whose scheduledAt has passed and delivers them
 * by updating sentAt = now() and clearing scheduledAt.
 *
 * "Pending" = sentAt > year 2090 (sentinel value set at creation time).
 */

const SENTINEL_THRESHOLD = new Date(2090, 0, 1);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all pending-scheduled messages that are due
  const due = await db.message.findMany({
    where: {
      sentAt: { gt: SENTINEL_THRESHOLD },
      scheduledAt: { lte: now },
    },
    include: {
      thread: {
        select: {
          id: true,
          organizationId: true,
          participants: {
            where: { userType: "CLIENT" },
            select: { clientId: true },
          },
        },
      },
    },
  });

  if (due.length === 0) {
    return NextResponse.json({ ok: true, delivered: 0 });
  }

  let delivered = 0;
  const errors: string[] = [];

  for (const msg of due) {
    try {
      await db.message.update({
        where: { id: msg.id },
        data: { sentAt: now, scheduledAt: null },
      });

      await db.messageThread.update({
        where: { id: msg.threadId },
        data: { updatedAt: now },
      });

      // Push notification to client
      const clientId = msg.thread.participants[0]?.clientId;
      if (clientId) {
        sendPushToClient(clientId, {
          title: "New Message",
          body: msg.body.trim() || "📎 Attachment",
          url: "/c/messages",
        }).catch(() => {/* non-fatal */});
      }

      delivered++;
    } catch (err: any) {
      errors.push(`message ${msg.id}: ${err?.message ?? "unknown"}`);
    }
  }

  return NextResponse.json({ ok: true, delivered, errors });
}
