/**
 * Import all per-client scraped data into the carbon-gym database.
 * Uses batch createMany for performance — sequential upserts over Supabase are too slow.
 *
 * Imports (in order):
 *  1. ClientPackages     — enrolled packages per client
 *  2. Appointments       — from client-visits.json (rich appointment data)
 *  3. TrainerNotes       — from client-notes.json
 *  4. WorkoutLogs        — from client-workout-logs.json
 *  5. PlanAssignments    — from client-plans.json
 *
 * Usage: npx tsx scripts/import/import-per-client.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(__dirname, "../../data-export");
const BATCH_SIZE = 100;

// ── helpers ──────────────────────────────────────────────────────────────────

function loadJson<T>(filename: string): T {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) throw new Error(`Missing export file: ${filename}`);
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}

/** Unix timestamp → Date */
function ts(unix: number | null | undefined): Date | null {
  if (!unix || unix === 0) return null;
  return new Date(unix * 1000);
}

/** Parse Unix timestamp OR date string like "2025-10-07" */
function parseDate(val: number | string | null | undefined): Date | null {
  if (!val) return null;
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === "number") {
    if (val === 0) return null;
    return new Date(val * 1000);
  }
  return null;
}

function mapVisitStatus(v: any): string {
  if (v.status === "completed" || v.completed_at) return "COMPLETED";
  if (v.status === "cancelled" || v.cancelled_at) return "CANCELLED";
  if (v.status === "no_show" || v.noshow_at) return "NO_SHOW";
  return "RESERVED";
}

async function batchInsert<T>(
  label: string,
  items: T[],
  insertFn: (batch: T[]) => Promise<{ count: number }>
): Promise<number> {
  let total = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    try {
      const r = await insertFn(batch);
      total += r.count;
    } catch {
      // On batch failure, try individually to maximize success
      for (const item of batch) {
        try {
          const r = await insertFn([item]);
          total += r.count;
        } catch { /* skip */ }
      }
    }
    if (i % 1000 === 0 && i > 0) {
      process.stdout.write(`\r  ${label}: ${total} / ${items.length}...`);
    }
  }
  return total;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Carbon Gym — Per-Client Data Import\n");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  // ── Load source data ──────────────────────────────────────────────────────
  const clientsRaw = loadJson<any[]>("clients.json");
  const notesRaw = loadJson<Record<string, any[]>>("client-notes.json");
  const visitsRaw = loadJson<Record<string, any[]>>("client-visits.json");
  const packagesRaw = loadJson<Record<string, any[]>>("client-packages.json");
  const workoutsRaw = loadJson<Record<string, any[]>>("client-workout-logs.json");
  const plansRaw = loadJson<Record<string, any[]>>("client-plans.json");
  const packageTemplates = loadJson<any[]>("packages.json");

  // ── Build ExCom package_id → name map ────────────────────────────────────
  const excomPkgName: Record<number, string> = {};
  for (const p of packageTemplates) excomPkgName[p.id] = p.name;

  // ── Build client ID maps ──────────────────────────────────────────────────
  console.log("⚙️  Building lookup maps...");
  const allDbClients = await db.client.findMany({
    select: { id: true, customFields: true, email: true },
  });

  const clientMapByExcomId = new Map<number, string>();
  const clientMapByEmail = new Map<string, string>();
  const clientMapByUserId = new Map<number, string>();

  for (const c of allDbClients) {
    const cf = c.customFields as Record<string, any>;
    if (cf?.exerciseComId) clientMapByExcomId.set(cf.exerciseComId as number, c.id);
    if (cf?.exerciseComUserId) clientMapByUserId.set(cf.exerciseComUserId as number, c.id);
    if (c.email) clientMapByEmail.set(c.email.toLowerCase(), c.id);
  }

  // ExCom relationship_id → user_id, user_id → email (from clients.json)
  const relIdToUserId = new Map<number, number>();
  const userIdToEmail = new Map<number, string>();
  for (const c of clientsRaw) {
    if (c.id && c.user_id) relIdToUserId.set(c.id, c.user_id);
    if (c.user_id && c.email) userIdToEmail.set(c.user_id, c.email);
  }

  function resolveClientId(excomClientId: number): string | null {
    const direct = clientMapByExcomId.get(excomClientId);
    if (direct) return direct;
    const userId = relIdToUserId.get(excomClientId);
    if (!userId) return null;
    const byUser = clientMapByUserId.get(userId);
    if (byUser) return byUser;
    const email = userIdToEmail.get(userId);
    if (email) return clientMapByEmail.get(email.toLowerCase()) ?? null;
    return null;
  }

  // ── Build staff map ───────────────────────────────────────────────────────
  const trainersRaw = loadJson<any[]>("trainers.json");
  const staffMembers = await db.staffMember.findMany({
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  const staffMap = new Map<number, string>(); // ExCom user auth ID → DB StaffMember.id
  const staffByEmail = new Map<string, string>();
  for (const s of staffMembers) staffByEmail.set(s.email.toLowerCase(), s.id);
  for (const t of trainersRaw) {
    if (!t.trainer_id) continue;
    const dbId =
      staffByEmail.get(t.email?.toLowerCase()) ??
      staffMembers.find(
        (s) => `${s.firstName} ${s.lastName}`.toLowerCase() === t.name?.toLowerCase()
      )?.id;
    if (dbId) staffMap.set(t.trainer_id, dbId);
  }

  const defaultStaffId = staffByEmail.get("davis@carbontc.co") ?? staffMembers[0]?.id;

  // ── Build service map ─────────────────────────────────────────────────────
  const servicesRaw = loadJson<any[]>("services.json");
  const dbServices = await db.service.findMany({ select: { id: true, name: true } });
  const serviceMap = new Map<number, string>(); // ExCom service_id → DB Service.id
  const serviceByName = new Map<string, string>();
  for (const s of dbServices) serviceByName.set(s.name.toLowerCase().trim(), s.id);
  for (const s of servicesRaw) {
    const dbId = serviceByName.get(s.name?.toLowerCase().trim());
    if (dbId) serviceMap.set(s.id, dbId);
  }
  const defaultServiceId = dbServices[0]?.id;

  // ── Get org / location ────────────────────────────────────────────────────
  const org = await db.organization.findFirst();
  const orgId = org!.id;
  const location = await db.location.findFirst({ where: { organizationId: orgId } });
  const locationId = location?.id ?? null;

  console.log(`  ${clientMapByExcomId.size} clients, ${staffMap.size} trainers, ${serviceMap.size} services mapped`);

  // ── Pre-fetch existing IDs (to skip already-imported records) ─────────────
  const existingCpIds = new Set(
    (await db.clientPackage.findMany({ select: { id: true } })).map((x) => x.id)
  );
  const existingApptIds = new Set(
    (await db.appointment.findMany({ select: { id: true } })).map((x) => x.id)
  );
  const existingNoteIds = new Set(
    (await db.trainerNote.findMany({ select: { id: true } })).map((x) => x.id)
  );
  const existingWlIds = new Set(
    (await db.workoutLog.findMany({ select: { id: true } })).map((x) => x.id)
  );
  const existingPaIds = new Set(
    (await db.planAssignment.findMany({ select: { id: true } })).map((x) => x.id)
  );

  console.log(
    `  Existing: ${existingCpIds.size} pkg, ${existingApptIds.size} appt, ${existingNoteIds.size} notes, ${existingWlIds.size} wl, ${existingPaIds.size} pa`
  );

  // ── 1. Ensure Package templates exist ──────────────────────────────────────
  console.log("\n1️⃣  Ensuring package templates...");
  const dbPackages = await db.package.findMany({ select: { id: true, name: true } });
  const packageByName = new Map<string, string>();
  for (const p of dbPackages) packageByName.set(p.name.toLowerCase().trim(), p.id);

  const allClientPkgNames = new Set<string>();
  for (const plist of Object.values(packagesRaw)) {
    for (const p of plist) {
      if (p.name) allClientPkgNames.add(p.name as string);
    }
  }

  const missingPkgNames = [...allClientPkgNames].filter(
    (n) => !packageByName.has(n.toLowerCase().trim())
  );
  if (missingPkgNames.length > 0) {
    for (const name of missingPkgNames) {
      const template = packageTemplates.find(
        (p) => p.name?.toLowerCase().trim() === name.toLowerCase().trim()
      );
      const price = template?.one_time_payment
        ? parseFloat(template.one_time_payment) / 100
        : template?.processor_plans?.[0]?.amount
        ? parseFloat(template.processor_plans[0].amount) / 100
        : 0;
      const pkg = await db.package.create({
        data: {
          organizationId: orgId,
          name,
          price: isNaN(price) ? 0 : price,
          packageType: "SESSION_PACK",
          billingCycle: "ONE_TIME",
          isActive: true,
        },
      });
      packageByName.set(name.toLowerCase().trim(), pkg.id);
    }
    console.log(`  ✅ ${missingPkgNames.length} new package templates created`);
  } else {
    console.log(`  ✅ All package templates already exist (${packageByName.size} total)`);
  }

  // ── 2. Import ClientPackages ────────────────────────────────────────────────
  console.log("\n2️⃣  Importing client packages...");
  const cpRows: any[] = [];
  let cpSkipped = 0;

  for (const [excomClientIdStr, plist] of Object.entries(packagesRaw)) {
    const excomClientId = parseInt(excomClientIdStr, 10);
    const dbClientId = resolveClientId(excomClientId);
    if (!dbClientId) { cpSkipped += plist.length; continue; }

    for (const cp of plist) {
      const id = `excom-cp-${cp.id}`;
      if (existingCpIds.has(id)) continue;
      const pkgName = cp.name as string | null;
      if (!pkgName) { cpSkipped++; continue; }
      const dbPkgId = packageByName.get(pkgName.toLowerCase().trim());
      if (!dbPkgId) { cpSkipped++; continue; }

      const svcCounts = cp.service_counts as any[];
      let sessionsRemaining: number | null = null;
      let sessionsUsed = 0;
      if (Array.isArray(svcCounts) && svcCounts.length > 0) {
        sessionsRemaining = Math.round(
          svcCounts.reduce((s: number, sc: any) => s + (Number(sc.remaining) || 0), 0)
        );
        sessionsUsed = Math.round(
          svcCounts.reduce((s: number, sc: any) => s + (Number(sc.used) || 0), 0)
        );
      }

      let status = "active";
      if (cp.expires_on) {
        const expDate = parseDate(cp.expires_on);
        if (expDate && expDate < new Date()) status = "expired";
      }

      cpRows.push({
        id,
        clientId: dbClientId,
        packageId: dbPkgId,
        startDate: parseDate(cp.activation_date) ?? ts(cp.created_at) ?? new Date(),
        endDate: cp.expires_on ? parseDate(cp.expires_on) : null,
        sessionsRemaining,
        sessionsUsed,
        status,
        stripeSubscriptionId: cp.subscription_id ?? null,
      });
    }
  }

  const cpImported = await batchInsert("client packages", cpRows, (batch) =>
    db.clientPackage.createMany({ data: batch, skipDuplicates: true })
  );
  console.log(`\r  ✅ ${cpImported} client packages imported, ${cpSkipped} skipped`);

  // ── 3. Discover + create missing services from visits ───────────────────────
  console.log("\n3️⃣  Resolving services from visits...");
  const visitServicesMissing = new Map<number, string>();
  for (const vlist of Object.values(visitsRaw)) {
    for (const v of vlist) {
      const appt = v.appointment;
      if (!appt) continue;
      const sid = appt.service_id ?? appt.service?.id;
      if (!sid || serviceMap.has(sid)) continue;
      const name = appt.service_name ?? appt.service?.name ?? appt.description ?? `Service ${sid}`;
      visitServicesMissing.set(sid, name);
    }
  }
  for (const [sid, name] of visitServicesMissing) {
    let dbId = serviceByName.get(name.toLowerCase().trim());
    if (!dbId) {
      const created = await db.service.create({
        data: { organizationId: orgId, name, type: "APPOINTMENT", durationMinutes: 60, isActive: true },
      });
      dbId = created.id;
      serviceByName.set(name.toLowerCase().trim(), dbId);
    }
    serviceMap.set(sid, dbId);
  }
  console.log(`  ✅ ${visitServicesMissing.size} missing services resolved (${serviceMap.size} total)`);

  // Re-fetch client packages to build paid_by_package_id → clientPackageId map
  const cpIdMap = new Map<number, string>(); // excom cp id → db cp id
  const allCps = await db.clientPackage.findMany({ select: { id: true } });
  for (const cp of allCps) {
    const match = cp.id.match(/^excom-cp-(\d+)$/);
    if (match) cpIdMap.set(parseInt(match[1]), cp.id);
  }

  // ── 4. Import Appointments ─────────────────────────────────────────────────
  console.log("\n4️⃣  Importing appointments (visits)...");
  const apptRows: any[] = [];
  let apptSkipped = 0;

  for (const [excomClientIdStr, vlist] of Object.entries(visitsRaw)) {
    const excomClientId = parseInt(excomClientIdStr, 10);
    const dbClientId = resolveClientId(excomClientId);
    if (!dbClientId) { apptSkipped += vlist.length; continue; }

    for (const v of vlist) {
      const id = `excom-visit-${v.id}`;
      if (existingApptIds.has(id)) continue;

      const appt = v.appointment;
      const excomServiceId = appt?.service_id ?? appt?.service?.id;
      const dbServiceId = excomServiceId ? (serviceMap.get(excomServiceId) ?? defaultServiceId) : defaultServiceId;
      if (!dbServiceId) { apptSkipped++; continue; }

      const trainerIds: number[] = appt?.trainer_ids ?? appt?.primary_trainer_ids ?? [];
      const dbStaffId = trainerIds.map((tid) => staffMap.get(tid)).find(Boolean) ?? defaultStaffId;
      if (!dbStaffId) { apptSkipped++; continue; }

      const startTime = appt?.start_time ? new Date(appt.start_time * 1000) : ts(v.created_at) ?? new Date();
      const endTime = appt?.end_time ? new Date(appt.end_time * 1000) : new Date(startTime.getTime() + 60 * 60 * 1000);

      apptRows.push({
        id,
        organizationId: orgId,
        clientId: dbClientId,
        staffId: dbStaffId,
        serviceId: dbServiceId,
        locationId,
        clientPackageId: v.paid_by_package_id ? (cpIdMap.get(v.paid_by_package_id) ?? null) : null,
        scheduledAt: startTime,
        endAt: endTime,
        status: mapVisitStatus(v) as any,
        notes: v.private_notes || appt?.notes || null,
        cancelledAt: ts(v.cancelled_at),
        bookedAt: ts(v.created_at) ?? new Date(),
      });
    }
  }

  const apptImported = await batchInsert("appointments", apptRows, (batch) =>
    db.appointment.createMany({ data: batch, skipDuplicates: true })
  );
  console.log(`\r  ✅ ${apptImported} appointments imported, ${apptSkipped} skipped`);

  // ── 5. Import TrainerNotes ─────────────────────────────────────────────────
  console.log("\n5️⃣  Importing trainer notes...");
  const noteRows: any[] = [];
  let notesSkipped = 0;

  for (const [excomClientIdStr, nlist] of Object.entries(notesRaw)) {
    const excomClientId = parseInt(excomClientIdStr, 10);
    const dbClientId = resolveClientId(excomClientId);
    if (!dbClientId) { notesSkipped += nlist.length; continue; }

    for (const n of nlist) {
      const id = `excom-note-${n.id}`;
      if (existingNoteIds.has(id)) continue;
      if (!n.notes?.trim() && !n.title?.trim()) { notesSkipped++; continue; }

      const staffId = n.created_by_id ? (staffMap.get(n.created_by_id) ?? defaultStaffId) : defaultStaffId;
      if (!staffId) { notesSkipped++; continue; }

      const content = [n.title, n.notes].filter(Boolean).join("\n\n");
      noteRows.push({
        id,
        clientId: dbClientId,
        staffId,
        content,
        isPrivate: true,
        createdAt: ts(n.created_at) ?? new Date(),
        updatedAt: ts(n.updated_at) ?? new Date(),
      });
    }
  }

  const notesImported = await batchInsert("notes", noteRows, (batch) =>
    db.trainerNote.createMany({ data: batch, skipDuplicates: true })
  );
  console.log(`\r  ✅ ${notesImported} notes imported, ${notesSkipped} skipped`);

  // ── 6. Import WorkoutLogs ──────────────────────────────────────────────────
  console.log("\n6️⃣  Importing workout logs...");
  const wlRows: any[] = [];
  let wlSkipped = 0;

  for (const [excomClientIdStr, wlist] of Object.entries(workoutsRaw)) {
    const excomClientId = parseInt(excomClientIdStr, 10);
    const dbClientId = resolveClientId(excomClientId);
    if (!dbClientId) { wlSkipped += wlist.length; continue; }

    for (const w of wlist) {
      const id = `excom-wl-${w.id}`;
      if (existingWlIds.has(id)) continue;

      wlRows.push({
        id,
        clientId: dbClientId,
        date: ts(w.workout_date) ?? ts(w.updated_at) ?? new Date(),
        durationMinutes: w.total_workout_time ? Math.round(Number(w.total_workout_time)) : null,
        notes: w.notes ?? null,
        completedAt: w.completed ? (ts(w.updated_at) ?? new Date()) : null,
        createdAt: ts(w.updated_at) ?? new Date(),
      });
    }
  }

  const wlImported = await batchInsert("workout logs", wlRows, (batch) =>
    db.workoutLog.createMany({ data: batch, skipDuplicates: true })
  );
  console.log(`\r  ✅ ${wlImported} workout logs imported, ${wlSkipped} skipped`);

  // ── 7. Import PlanAssignments ──────────────────────────────────────────────
  console.log("\n7️⃣  Importing plan assignments...");
  const dbPlans = await db.workoutPlan.findMany({ select: { id: true, name: true } });
  const planByName = new Map<string, string>();
  for (const p of dbPlans) planByName.set(p.name.toLowerCase().trim(), p.id);

  const paRows: any[] = [];
  let paSkipped = 0;

  for (const [excomClientIdStr, plist] of Object.entries(plansRaw)) {
    const excomClientId = parseInt(excomClientIdStr, 10);
    const dbClientId = resolveClientId(excomClientId);
    if (!dbClientId) { paSkipped += plist.length; continue; }

    for (const pa of plist) {
      const id = `excom-pa-${pa.id}`;
      if (existingPaIds.has(id)) continue;

      const planName = pa.workout_plan?.name ?? pa.plan_name ?? pa.name ?? null;
      const dbPlanId = planName ? planByName.get(planName.toLowerCase().trim()) ?? null : null;
      if (!dbPlanId) { paSkipped++; continue; }

      const assignedById = pa.assigned_by_id
        ? (staffMap.get(pa.assigned_by_id) ?? defaultStaffId)
        : defaultStaffId;

      paRows.push({
        id,
        clientId: dbClientId,
        planId: dbPlanId,
        assignedById,
        startDate: parseDate(pa.start_date) ?? ts(pa.created_at) ?? new Date(),
        endDate: parseDate(pa.end_date) ?? null,
        isActive: pa.active ?? true,
        createdAt: ts(pa.created_at) ?? new Date(),
      });
    }
  }

  const paImported = await batchInsert("plan assignments", paRows, (batch) =>
    db.planAssignment.createMany({ data: batch, skipDuplicates: true })
  );
  console.log(`\r  ✅ ${paImported} plan assignments imported, ${paSkipped} skipped`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const [totalCPs, totalAppts, totalNotes, totalWLs, totalPAs] = await Promise.all([
    db.clientPackage.count(),
    db.appointment.count(),
    db.trainerNote.count(),
    db.workoutLog.count(),
    db.planAssignment.count(),
  ]);

  console.log("\n═══════════════════════════════════════");
  console.log("✅  Per-client import complete!");
  console.log(`   Client Packages:  ${totalCPs}`);
  console.log(`   Appointments:     ${totalAppts}`);
  console.log(`   Trainer Notes:    ${totalNotes}`);
  console.log(`   Workout Logs:     ${totalWLs}`);
  console.log(`   Plan Assignments: ${totalPAs}`);

  await db.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
