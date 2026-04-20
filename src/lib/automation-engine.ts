/**
 * Automation execution engine.
 *
 * Used by:
 *   - /api/cron/automations  (daily scheduled run)
 *   - automations.runNow     (manual trigger via tRPC)
 *   - fireEventTrigger()     (called inline on tag-add/remove events)
 *
 * Idempotency: before executing actions for a (automation, client) pair we check the
 * AuditLog for a matching entry. If one exists within the dedupe window we skip.
 * Each successful execution writes one AuditLog row.
 *
 * Action types (20):
 *   ASSIGN_STAFF, ASSIGN_PLAN, IMPORT_PLAN, ASSIGN_RESOURCE, ASSIGN_GROUP,
 *   ADD_TAG, REMOVE_TAG, REMOVE_FROM_GROUP, ASSIGN_LIFECYCLE_STAGE,
 *   ASSIGN_PACKAGE, CLOSE_OUT_VISIT, SEND_MESSAGE, SEND_PUSH_NOTIFICATION,
 *   SEND_APPOINTMENT_REMINDER, SEND_WORKOUT_REMINDER, SEND_VISITS_LEFT_REMINDER,
 *   SEND_WORKOUT_SUMMARY, SEND_RECURRING_MESSAGE, REQUEST_INFO, DOWNGRADE_CLIENT
 *
 * Trigger types (10):
 *   DAYS_AFTER_PURCHASE, DAYS_AFTER_SIGNUP, DAYS_BEFORE_EXPIRY,
 *   DAYS_BEFORE_BIRTHDAY, LOW_SESSIONS_REMAINING, PLAN_ENDING_SOON,
 *   TAG_ADDED, TAG_REMOVED, ON_FIRST_LOGIN, MANUAL
 */

import { db } from "@/server/db";
import { sendPushToClient } from "@/lib/push";
import type { Automation } from "@generated/prisma/client";

export interface AutomationAction {
  type: string;
  detail?: string;
}

export interface RunOptions {
  dedupeDays?: number;
  force?: boolean;
  clientId?: string;
}

export interface RunResult {
  automationId: string;
  name: string;
  affected: number;
  skipped: number;
  errors: string[];
}

// ─── Main runner ──────────────────────────────────────────────────────────────

export async function runAutomation(
  automation: Automation,
  now: Date = new Date(),
  options: RunOptions = {},
): Promise<RunResult> {
  const result: RunResult = { automationId: automation.id, name: automation.name, affected: 0, skipped: 0, errors: [] };

  const clients = options.clientId
    ? [{ id: options.clientId }]
    : await resolveClients(automation, now);

  const actionList: AutomationAction[] = Array.isArray(automation.actions)
    ? (automation.actions as unknown as AutomationAction[])
    : [];

  if (actionList.length === 0) return result;

  const dedupeDays = options.dedupeDays ?? 30;
  const dedupeCutoff = new Date(now.getTime() - dedupeDays * 24 * 60 * 60 * 1000);

  for (const client of clients) {
    if (!options.force) {
      const already = await db.auditLog.findFirst({
        where: {
          organizationId: automation.organizationId,
          action: "AUTOMATION_EXECUTED",
          entityType: "Automation",
          entityId: automation.id,
          createdAt: { gte: dedupeCutoff },
          metadata: { path: ["clientId"], equals: client.id },
        },
      });
      if (already) { result.skipped++; continue; }
    }

    const ranActions: string[] = [];
    for (const action of actionList) {
      try {
        const ok = await executeAction(action, client.id, automation.organizationId);
        if (ok) ranActions.push(action.type);
      } catch (err: any) {
        result.errors.push(`action ${action.type} for client ${client.id}: ${err?.message ?? "unknown"}`);
      }
    }

    if (ranActions.length > 0) {
      result.affected++;
      await db.auditLog.create({
        data: {
          organizationId: automation.organizationId,
          action: "AUTOMATION_EXECUTED",
          entityType: "Automation",
          entityId: automation.id,
          metadata: { clientId: client.id, actions: ranActions, manual: !!options.force },
        },
      });
    }
  }

  return result;
}

// ─── Event-driven trigger ─────────────────────────────────────────────────────

/**
 * Fire all automations with a TAG_ADDED or TAG_REMOVED trigger that match the
 * given tag. Called inline from the tags tRPC router after the DB write.
 */
export async function fireEventTrigger(
  triggerType: "TAG_ADDED" | "TAG_REMOVED",
  clientId: string,
  organizationId: string,
  tagId: string,
): Promise<void> {
  const automations = await db.automation.findMany({
    where: { organizationId, isActive: true, trigger: triggerType },
  });

  for (const automation of automations) {
    const filter = (automation.filterCriteria as Record<string, unknown>) ?? {};
    // filterCriteria.tagId can restrict which tag fires this automation
    if (filter.tagId && filter.tagId !== tagId) continue;

    await runAutomation(automation, new Date(), { clientId, force: false });
  }
}

// ─── Client resolver ──────────────────────────────────────────────────────────

async function resolveClients(automation: Automation, now: Date): Promise<{ id: string }[]> {
  const { trigger, triggerValue, triggerProduct, filterCriteria, organizationId } = automation;
  const filter = (filterCriteria as Record<string, unknown>) ?? {};

  switch (trigger) {
    case "DAYS_AFTER_SIGNUP": {
      const cutoff = new Date(now.getTime() - (triggerValue ?? 0) * 86400000);
      const start = startOfDay(cutoff);
      const end = new Date(start.getTime() + 86400000);
      return db.client.findMany({
        where: {
          organizationId,
          signupDate: { gte: start, lt: end },
          ...(typeof filter.status === "string" ? { billingStatus: filter.status as never } : {}),
        },
        select: { id: true },
      });
    }

    case "DAYS_AFTER_PURCHASE": {
      const cutoff = new Date(now.getTime() - (triggerValue ?? 0) * 86400000);
      const start = startOfDay(cutoff);
      const end = new Date(start.getTime() + 86400000);
      const rows = await db.clientPackage.findMany({
        where: {
          createdAt: { gte: start, lt: end },
          client: { organizationId },
          ...(triggerProduct ? { package: { name: { contains: triggerProduct, mode: "insensitive" } } } : {}),
        },
        select: { clientId: true },
      });
      return dedupeById(rows.map((r) => ({ id: r.clientId })));
    }

    case "DAYS_BEFORE_EXPIRY": {
      const target = new Date(now.getTime() + (triggerValue ?? 0) * 86400000);
      const start = startOfDay(target);
      const end = new Date(start.getTime() + 86400000);
      const rows = await db.clientPackage.findMany({
        where: { endDate: { gte: start, lt: end }, status: "active", client: { organizationId } },
        select: { clientId: true },
      });
      return dedupeById(rows.map((r) => ({ id: r.clientId })));
    }

    case "DAYS_BEFORE_BIRTHDAY": {
      const target = new Date(now.getTime() + (triggerValue ?? 0) * 86400000);
      const clients = await db.client.findMany({
        where: { organizationId, birthDate: { not: null } },
        select: { id: true, birthDate: true },
      });
      return clients.filter(({ birthDate }) => {
        if (!birthDate) return false;
        const bd = new Date(birthDate);
        const thisYear = new Date(target.getFullYear(), bd.getMonth(), bd.getDate());
        const diff = Math.abs(thisYear.getTime() - startOfDay(target).getTime());
        return diff < 86400000; // within same day
      });
    }

    case "LOW_SESSIONS_REMAINING": {
      // triggerValue = threshold (e.g. 3 sessions left)
      const threshold = triggerValue ?? 3;
      const rows = await db.clientPackage.findMany({
        where: {
          status: "active",
          client: { organizationId },
          sessionsRemaining: { lte: threshold, gt: 0 },
        },
        select: { clientId: true },
      });
      return dedupeById(rows.map((r) => ({ id: r.clientId })));
    }

    case "PLAN_ENDING_SOON": {
      // triggerValue = days until plan assignment ends (or N days remaining in week-plan)
      const target = new Date(now.getTime() + (triggerValue ?? 7) * 86400000);
      const start = startOfDay(target);
      const end = new Date(start.getTime() + 86400000);
      const rows = await db.planAssignment.findMany({
        where: {
          isActive: true,
          endDate: { gte: start, lt: end },
          client: { organizationId },
        },
        select: { clientId: true },
      });
      return dedupeById(rows.map((r) => ({ id: r.clientId })));
    }

    case "TAG_ADDED":
    case "TAG_REMOVED":
    case "ON_FIRST_LOGIN":
    case "MANUAL":
    default:
      // Event-driven — callers pass clientId via options
      return [];
  }
}

// ─── Action executor ──────────────────────────────────────────────────────────

async function executeAction(
  action: AutomationAction,
  clientId: string,
  organizationId: string,
): Promise<boolean> {
  switch (action.type) {

    // ── Staff ────────────────────────────────────────────────────────────────
    case "ASSIGN_STAFF": {
      const staff = await db.staffMember.findFirst({
        where: {
          organizationId,
          OR: [
            { firstName: { contains: action.detail ?? "", mode: "insensitive" } },
            { email: { contains: action.detail ?? "", mode: "insensitive" } },
          ],
        },
      });
      if (!staff) return false;
      await db.client.update({ where: { id: clientId }, data: { assignedStaffId: staff.id } });
      return true;
    }

    // ── Plans ────────────────────────────────────────────────────────────────
    case "IMPORT_PLAN":
    case "ASSIGN_PLAN": {
      const plan = await db.workoutPlan.findFirst({
        where: { organizationId, name: { contains: action.detail ?? "", mode: "insensitive" } },
      });
      if (!plan) return false;
      const existing = await db.planAssignment.findFirst({ where: { planId: plan.id, clientId, isActive: true } });
      if (existing) return false;
      await db.planAssignment.create({ data: { planId: plan.id, clientId, startDate: new Date(), isActive: true } });
      return true;
    }

    // ── Resources ────────────────────────────────────────────────────────────
    case "ASSIGN_RESOURCE": {
      const resource = await db.resource.findFirst({
        where: { organizationId, name: { contains: action.detail ?? "", mode: "insensitive" } },
      });
      if (!resource) return false;
      const existing = await db.resourceAssignment.findFirst({ where: { resourceId: resource.id, clientId } });
      if (existing) return false;
      await db.resourceAssignment.create({ data: { resourceId: resource.id, clientId } });
      return true;
    }

    // ── Groups ───────────────────────────────────────────────────────────────
    case "ASSIGN_GROUP": {
      const group = await db.group.findFirst({
        where: { organizationId, name: { contains: action.detail ?? "", mode: "insensitive" } },
      });
      if (!group) return false;
      await db.clientGroup.upsert({
        where: { clientId_groupId: { clientId, groupId: group.id } },
        create: { clientId, groupId: group.id },
        update: {},
      });
      return true;
    }

    case "REMOVE_FROM_GROUP": {
      const group = await db.group.findFirst({
        where: { organizationId, name: { contains: action.detail ?? "", mode: "insensitive" } },
      });
      if (!group) return false;
      const existing = await db.clientGroup.findUnique({
        where: { clientId_groupId: { clientId, groupId: group.id } },
      });
      if (!existing) return false;
      await db.clientGroup.delete({ where: { clientId_groupId: { clientId, groupId: group.id } } });
      return true;
    }

    // ── Tags ─────────────────────────────────────────────────────────────────
    case "ADD_TAG": {
      const tag = await db.tag.findFirst({
        where: { organizationId, name: { equals: action.detail ?? "", mode: "insensitive" } },
      });
      if (!tag) return false;
      await db.clientTag.upsert({
        where: { clientId_tagId: { clientId, tagId: tag.id } },
        create: { clientId, tagId: tag.id },
        update: {},
      });
      return true;
    }

    case "REMOVE_TAG": {
      const tag = await db.tag.findFirst({
        where: { organizationId, name: { equals: action.detail ?? "", mode: "insensitive" } },
      });
      if (!tag) return false;
      const existing = await db.clientTag.findUnique({
        where: { clientId_tagId: { clientId, tagId: tag.id } },
      });
      if (!existing) return false;
      await db.clientTag.delete({ where: { clientId_tagId: { clientId, tagId: tag.id } } });
      return true;
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────
    case "ASSIGN_LIFECYCLE_STAGE": {
      const validStages = ["LEAD", "PROSPECT", "CLIENT", "FORMER_CLIENT"];
      const stage = action.detail?.toUpperCase();
      if (!stage || !validStages.includes(stage)) return false;
      await db.client.update({ where: { id: clientId }, data: { lifecycleStage: stage as never } });
      return true;
    }

    case "DOWNGRADE_CLIENT": {
      // Move to FORMER_CLIENT
      await db.client.update({ where: { id: clientId }, data: { lifecycleStage: "FORMER_CLIENT" } });
      return true;
    }

    // ── Packages ─────────────────────────────────────────────────────────────
    case "ASSIGN_PACKAGE": {
      const pkg = await db.package.findFirst({
        where: { organizationId, name: { contains: action.detail ?? "", mode: "insensitive" }, isActive: true },
      });
      if (!pkg) return false;
      await db.clientPackage.create({
        data: {
          clientId,
          packageId: pkg.id,
          status: "active",
          startDate: new Date(),
          sessionsRemaining: pkg.sessionCount,
          sessionsUsed: 0,
        },
      });
      return true;
    }

    // ── Visits ───────────────────────────────────────────────────────────────
    case "CLOSE_OUT_VISIT": {
      // Mark the most recent RESERVED/CONFIRMED appointment as COMPLETED
      const appt = await db.appointment.findFirst({
        where: { clientId, status: { in: ["RESERVED", "CONFIRMED"] } },
        orderBy: { scheduledAt: "desc" },
      });
      if (!appt) return false;
      await db.appointment.update({ where: { id: appt.id }, data: { status: "COMPLETED" } });
      return true;
    }

    // ── Messaging ────────────────────────────────────────────────────────────
    case "SEND_MESSAGE": {
      return sendAutomatedMessage(clientId, organizationId, action.detail || "Automated message");
    }

    case "SEND_PUSH_NOTIFICATION": {
      const client = await db.client.findUnique({
        where: { id: clientId },
        select: { firstName: true },
      });
      await sendPushToClient(clientId, {
        title: "Carbon Training Centre",
        body: action.detail || `Hey ${client?.firstName ?? "there"}, check in with your trainer!`,
        url: "/c",
      });
      return true;
    }

    case "SEND_APPOINTMENT_REMINDER": {
      const appt = await db.appointment.findFirst({
        where: { clientId, status: { in: ["RESERVED", "CONFIRMED"] }, scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
        include: { service: { select: { name: true } } },
      });
      if (!appt) return false;
      const dateStr = appt.scheduledAt.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const body = action.detail
        ? action.detail.replace("{date}", dateStr).replace("{service}", appt.service.name)
        : `Reminder: You have ${appt.service.name} scheduled for ${dateStr}.`;
      return sendAutomatedMessage(clientId, organizationId, body);
    }

    case "SEND_WORKOUT_REMINDER": {
      const body = action.detail || "Don't forget to log your workout today! 💪";
      return sendAutomatedMessage(clientId, organizationId, body);
    }

    case "SEND_VISITS_LEFT_REMINDER": {
      const pkg = await db.clientPackage.findFirst({
        where: { clientId, status: "active" },
        orderBy: { createdAt: "desc" },
        include: { package: { select: { name: true } } },
      });
      if (!pkg) return false;
      const remaining = pkg.sessionsRemaining ?? 0;
      const body = action.detail
        ? action.detail.replace("{remaining}", String(remaining)).replace("{package}", pkg.package.name)
        : `Just a heads up — you have ${remaining} session${remaining !== 1 ? "s" : ""} remaining on your ${pkg.package.name}.`;
      return sendAutomatedMessage(clientId, organizationId, body);
    }

    case "SEND_WORKOUT_SUMMARY": {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      const logs = await db.workoutLog.count({ where: { clientId, date: { gte: thirtyDaysAgo } } });
      const body = action.detail
        ? action.detail.replace("{count}", String(logs))
        : `Great work! You've logged ${logs} workout${logs !== 1 ? "s" : ""} in the last 30 days. Keep it up!`;
      return sendAutomatedMessage(clientId, organizationId, body);
    }

    case "SEND_RECURRING_MESSAGE": {
      return sendAutomatedMessage(clientId, organizationId, action.detail || "Automated check-in from your trainer.");
    }

    case "REQUEST_INFO": {
      const body = action.detail || "Your trainer is requesting an update. Please log your latest measurements or complete any pending assessments.";
      return sendAutomatedMessage(clientId, organizationId, body);
    }

    default:
      return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sendAutomatedMessage(
  clientId: string,
  organizationId: string,
  body: string,
): Promise<boolean> {
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { assignedStaffId: true, firstName: true },
  });
  if (!client?.assignedStaffId) return false;

  let thread = await db.messageThread.findFirst({
    where: {
      organizationId,
      participants: { some: { userId: clientId, userType: "CLIENT" } },
    },
  });
  if (!thread) {
    thread = await db.messageThread.create({
      data: {
        organizationId,
        participants: {
          create: [
            { userId: client.assignedStaffId, userType: "STAFF" },
            { userId: clientId, userType: "CLIENT", clientId },
          ],
        },
      },
    });
  }

  const interpolated = body.replace("{firstName}", client.firstName);

  await db.message.create({
    data: { threadId: thread.id, senderId: client.assignedStaffId, senderType: "STAFF", body: interpolated },
  });

  // Fire push notification
  sendPushToClient(clientId, {
    title: "New message from your trainer",
    body: interpolated.slice(0, 100),
    url: "/c/messages",
  }).catch(() => {});

  return true;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dedupeById(rows: { id: string }[]): { id: string }[] {
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

// ─── Post-purchase trigger (day 0) ───────────────────────────────────────────

/**
 * Fires all active DAYS_AFTER_PURCHASE automations with triggerValue = 0 for
 * the given client immediately after a purchase completes. Called from the
 * Stripe checkout webhook so the client gets day-0 onboarding automations
 * without waiting for the nightly cron.
 *
 * Fire-and-forget: errors are caught and suppressed by the caller.
 */
export async function firePostPurchaseTrigger(
  clientId: string,
  organizationId: string,
): Promise<void> {
  try {
    const automations = await db.automation.findMany({
      where: {
        organizationId,
        isActive: true,
        trigger: "DAYS_AFTER_PURCHASE",
        triggerValue: 0,
      },
    });

    for (const automation of automations) {
      try {
        await runAutomation(automation, new Date(), { clientId, force: false });
      } catch {
        // Silently swallow per-automation errors so one bad automation doesn't
        // block the others.
      }
    }
  } catch {
    // Silently swallow top-level errors — webhook must not fail due to automation issues.
  }
}

// ─── Run all (cron) ───────────────────────────────────────────────────────────

export async function runAllAutomations(now: Date = new Date()): Promise<RunResult[]> {
  // Exclude event-driven triggers — those fire inline
  const automations = await db.automation.findMany({
    where: {
      isActive: true,
      trigger: { notIn: ["TAG_ADDED", "TAG_REMOVED", "ON_FIRST_LOGIN", "MANUAL"] },
    },
  });
  const results: RunResult[] = [];
  for (const automation of automations) {
    try {
      results.push(await runAutomation(automation, now));
    } catch (err: any) {
      results.push({ automationId: automation.id, name: automation.name, affected: 0, skipped: 0, errors: [err?.message ?? "unknown error"] });
    }
  }
  if (automations.length > 0) {
    await db.automation.updateMany({
      where: { id: { in: automations.map((a) => a.id) } },
      data: { lastRunAt: now },
    });
  }
  return results;
}
