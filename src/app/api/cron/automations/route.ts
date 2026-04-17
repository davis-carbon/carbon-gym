import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

/**
 * Vercel Cron endpoint — runs daily at 08:00 UTC.
 * Evaluates all active automation rules and executes matching actions.
 *
 * Security: Vercel sets CRON_SECRET automatically; we verify it here.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sets Authorization: Bearer <CRON_SECRET>)
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const results: { automationId: string; name: string; affected: number; error?: string }[] = [];

  // Fetch all active automations
  const automations = await db.automation.findMany({
    where: { isActive: true },
  });

  const now = new Date();

  for (const automation of automations) {
    try {
      const affected = await executeAutomation(automation, now);
      results.push({ automationId: automation.id, name: automation.name, affected });
    } catch (err: any) {
      results.push({
        automationId: automation.id,
        name: automation.name,
        affected: 0,
        error: err.message,
      });
    }
  }

  // Update lastRunAt
  await db.automation.updateMany({
    where: { id: { in: automations.map((a) => a.id) } },
    data: { lastRunAt: now },
  });

  return NextResponse.json({
    ok: true,
    runtime: `${Date.now() - start}ms`,
    evaluated: automations.length,
    results,
  });
}

/**
 * Execute a single automation rule.
 * Returns the number of clients affected.
 */
async function executeAutomation(automation: any, now: Date): Promise<number> {
  const { trigger, triggerValue, triggerProduct, filterCriteria, actions, organizationId } = automation;

  // Build "who" query — which clients match?
  let clients: { id: string }[] = [];

  if (trigger === "DAYS_AFTER_SIGNUP") {
    const cutoff = new Date(now.getTime() - (triggerValue ?? 0) * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    clients = await db.client.findMany({
      where: {
        organizationId,
        signupDate: { gte: startOfDay, lt: endOfDay },
        ...((filterCriteria as any)?.status && { status: (filterCriteria as any).status }),
      },
      select: { id: true },
    });
  } else if (trigger === "DAYS_AFTER_PURCHASE") {
    const cutoff = new Date(now.getTime() - (triggerValue ?? 0) * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    clients = await db.clientPackage.findMany({
      where: {
        createdAt: { gte: startOfDay, lt: endOfDay },
        client: { organizationId },
        ...(triggerProduct && { package: { name: { contains: triggerProduct, mode: "insensitive" } } }),
      },
      select: { clientId: true },
    }).then((r) => r.map((x) => ({ id: x.clientId })));
  } else if (trigger === "DAYS_BEFORE_EXPIRY") {
    const targetDate = new Date(now.getTime() + (triggerValue ?? 0) * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    clients = await db.clientPackage.findMany({
      where: {
        endDate: { gte: startOfDay, lt: endOfDay },
        status: "active",
        client: { organizationId },
      },
      select: { clientId: true },
    }).then((r) => r.map((x) => ({ id: x.clientId })));
  } else if (trigger === "MANUAL") {
    // Manual triggers are fired by API call, not cron
    return 0;
  }

  // Execute actions for each matching client
  const actionList = Array.isArray(actions) ? actions : [];
  let affectedCount = 0;

  for (const client of clients) {
    for (const action of actionList) {
      try {
        await executeAction(action, client.id, organizationId);
      } catch {
        // Swallow per-action errors to continue processing
      }
    }
    affectedCount++;
  }

  return affectedCount;
}

async function executeAction(action: any, clientId: string, organizationId: string): Promise<void> {
  switch (action.type) {
    case "ASSIGN_STAFF": {
      // Find staff by name or email
      const staff = await db.staffMember.findFirst({
        where: {
          organizationId,
          OR: [
            { firstName: { contains: action.detail, mode: "insensitive" } },
            { email: { contains: action.detail, mode: "insensitive" } },
          ],
        },
      });
      if (staff) {
        await db.client.update({ where: { id: clientId }, data: { assignedStaffId: staff.id } });
      }
      break;
    }

    case "IMPORT_PLAN":
    case "ASSIGN_PLAN": {
      const plan = await db.workoutPlan.findFirst({
        where: { organizationId, name: { contains: action.detail, mode: "insensitive" } },
      });
      if (plan) {
        const existing = await db.planAssignment.findFirst({
          where: { planId: plan.id, clientId, isActive: true },
        });
        if (!existing) {
          await db.planAssignment.create({
            data: { planId: plan.id, clientId, startDate: new Date(), isActive: true },
          });
        }
      }
      break;
    }

    case "ASSIGN_RESOURCE": {
      const resource = await db.resource.findFirst({
        where: { organizationId, name: { contains: action.detail, mode: "insensitive" } },
      });
      if (resource) {
        const existing = await db.resourceAssignment.findFirst({
          where: { resourceId: resource.id, clientId },
        });
        if (!existing) {
          await db.resourceAssignment.create({
            data: { resourceId: resource.id, clientId },
          });
        }
      }
      break;
    }

    case "ASSIGN_GROUP": {
      const group = await db.group.findFirst({
        where: { organizationId, name: { contains: action.detail, mode: "insensitive" } },
      });
      if (group) {
        await db.clientGroup.upsert({
          where: { clientId_groupId: { clientId, groupId: group.id } },
          create: { clientId, groupId: group.id },
          update: {},
        });
      }
      break;
    }

    case "ADD_TAG": {
      const tag = await db.tag.findFirst({
        where: { organizationId, name: { equals: action.detail, mode: "insensitive" } },
      });
      if (tag) {
        await db.clientTag.upsert({
          where: { clientId_tagId: { clientId, tagId: tag.id } },
          create: { clientId, tagId: tag.id },
          update: {},
        });
      }
      break;
    }

    case "SEND_MESSAGE": {
      // Would integrate with Resend or in-app messaging here
      // For now, create an in-app message via the first assigned staff
      const client = await db.client.findUnique({
        where: { id: clientId },
        select: { assignedStaffId: true },
      });
      if (client?.assignedStaffId) {
        // Find or create thread with this client
        let thread = await db.messageThread.findFirst({
          where: {
            organizationId,
            participants: {
              some: { userId: clientId, userType: "CLIENT" },
            },
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
        await db.message.create({
          data: {
            threadId: thread.id,
            senderId: client.assignedStaffId,
            senderType: "STAFF",
            body: action.detail || "Automated message",
          },
        });
      }
      break;
    }
  }
}
