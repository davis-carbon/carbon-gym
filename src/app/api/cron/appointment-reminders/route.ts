import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { sendAppointmentReminderEmail } from "@/lib/email";

/**
 * Daily cron — sends appointment reminders 24 hours before scheduled time.
 * Vercel Cron: /api/cron/appointment-reminders at 10:00 UTC
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find appointments scheduled 20–28 hours from now (window to catch tomorrow's)
  const now = new Date();
  const windowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 28 * 60 * 60 * 1000);

  const appointments = await db.appointment.findMany({
    where: {
      scheduledAt: { gte: windowStart, lte: windowEnd },
      status: { in: ["RESERVED", "CONFIRMED"] },
    },
    include: {
      client: { select: { firstName: true, email: true } },
      service: { select: { name: true } },
      staff: { select: { firstName: true, lastName: true } },
    },
  });

  const results: { id: string; sent: boolean; error?: string }[] = [];

  for (const appt of appointments) {
    if (!appt.client.email) {
      results.push({ id: appt.id, sent: false, error: "No email" });
      continue;
    }

    const res = await sendAppointmentReminderEmail({
      to: appt.client.email,
      clientFirstName: appt.client.firstName,
      serviceName: appt.service.name,
      staffName: `${appt.staff.firstName} ${appt.staff.lastName}`,
      scheduledAt: appt.scheduledAt,
    });

    results.push({ id: appt.id, sent: res.sent, error: res.error });
  }

  const sentCount = results.filter((r) => r.sent).length;
  return NextResponse.json({
    ok: true,
    evaluated: appointments.length,
    sent: sentCount,
    skipped: appointments.length - sentCount,
    results,
  });
}
