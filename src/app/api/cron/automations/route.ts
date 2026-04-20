import { NextRequest, NextResponse } from "next/server";
import { runAllAutomations } from "@/lib/automation-engine";

/**
 * Vercel Cron endpoint — runs daily at 08:00 UTC.
 * Evaluates all active automation rules and executes matching actions.
 *
 * Security: Vercel sets CRON_SECRET automatically; we verify it here.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const results = await runAllAutomations();

  return NextResponse.json({
    ok: true,
    runtime: `${Date.now() - start}ms`,
    evaluated: results.length,
    totalAffected: results.reduce((sum, r) => sum + r.affected, 0),
    totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    results,
  });
}
