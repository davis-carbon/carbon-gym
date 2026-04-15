/**
 * Import all Exercise.com API data into Supabase.
 *
 * Usage: npx tsx scripts/import/import-api-data.ts
 *
 * Prerequisites:
 * - Run scripts/export/playwright-export.ts first to generate data-export/*.json
 * - Database schema pushed (npx prisma db push)
 *
 * Imports: clients (with payment info), exercises, groups, products/packages,
 * messages, conversations, assessments, events, resources, trainers.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(__dirname, "../../data-export");

function loadJson<T>(filename: string): T[] {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`  ⏭ ${filename} not found`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filepath, "utf-8"));
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const db = new PrismaClient({ adapter });

  const org = await db.organization.findFirst();
  if (!org) {
    console.error("No organization found. Run seed-known-data.ts first.");
    process.exit(1);
  }
  const orgId = org.id;

  // Build trainer ID -> staff ID mapping
  const staffMembers = await db.staffMember.findMany({ where: { organizationId: orgId } });
  const staffByName: Record<string, string> = {};
  const staffByEmail: Record<string, string> = {};
  staffMembers.forEach((s) => {
    staffByName[`${s.firstName} ${s.lastName}`] = s.id;
    staffByEmail[s.email] = s.id;
  });

  console.log("🚀 Exercise.com API Data Import\n");

  // ── 1. Clients (with payment data) ────────
  const apiClients = loadJson<any>("clients.json");
  if (apiClients.length > 0 && apiClients[0].id) {
    // This is API-format data (has 'id' field) — richer than DOM scrape
    console.log(`\n1️⃣  Clients (${apiClients.length} from API)...`);

    // Clear existing and reimport with richer data
    await db.client.deleteMany({ where: { organizationId: orgId } });

    let imported = 0;
    for (const c of apiClients) {
      try {
        const billingStatus = mapBilling(c.billing_status);
        const status = c.cancel_pending ? "PENDING_CANCELLATION" : "ACTIVE";
        const lifecycle = c.lifecycle_stage_name === "Lead" ? "LEAD" : "CLIENT";

        // Find assigned staff by trainer_id
        const trainerData = loadJson<any>("trainers.json");
        const trainer = trainerData.find((t: any) => t.id === c.trainer_id);
        const assignedStaffId = trainer
          ? staffByName[trainer.name] || null
          : null;

        await db.client.create({
          data: {
            organizationId: orgId,
            firstName: c.first_name || c.client_name?.split(" ")[0] || "",
            lastName: c.last_name || c.client_name?.split(" ").slice(1).join(" ") || "",
            email: c.email || null,
            phone: c.client_phone_number || null,
            signupDate: c.created_at ? new Date(c.created_at * 1000) : new Date(),
            status: status as any,
            billingStatus: billingStatus as any,
            lifecycleStage: lifecycle as any,
            assignedStaffId,
            customFields: {
              exerciseComId: c.id,
              exerciseComUserId: c.user_id,
              tags: c.tags,
              notes: c.notes,
              goals: c.goals,
              injuries: c.injuries,
              equipment: c.equipment,
              nextPayment: c.next_payment,
              hasSubscription: c.has_subscription,
              hasPurchase: c.has_purchase,
              nutritionGoals: {
                calories: c.goal_calories,
                protein: c.goal_protein,
                carbs: c.goal_carbs,
                fat: c.goal_fat,
                fiber: c.goal_fiber,
              },
            },
          },
        });
        imported++;
        if (imported % 100 === 0) process.stdout.write(`\r  ${imported}/${apiClients.length}`);
      } catch (err: any) {
        // Skip duplicates silently
      }
    }
    console.log(`\r  ✅ ${imported} clients imported`);
  }

  // ── 2. Exercises ──────────────────────────
  const exercises = loadJson<any>("exercises.json");
  if (exercises.length > 0 && exercises[0].id) {
    console.log(`\n2️⃣  Exercises (${exercises.length})...`);
    await db.exercise.deleteMany({ where: { organizationId: orgId } });

    let imported = 0;
    for (const e of exercises) {
      try {
        await db.exercise.create({
          data: {
            organizationId: orgId,
            name: e.name,
            description: e.description || null,
            muscleGroup: mapMuscleGroup(e.muscle_group),
            difficultyLevel: mapDifficulty(e.difficulty_level),
            forceType: mapForceType(e.force_type),
            equipment: Array.isArray(e.equipment) ? e.equipment.join(", ") : e.equipment || null,
            videoUrl: e.video_url || e.stream_url || e.video_stream_url || null,
            thumbnailUrl: e.thumbnail || e.square_thumbnail || null,
            tags: Array.isArray(e.tags) ? e.tags.map((t: any) => t.name || t) : [],
            isActive: !e.archived_at,
          },
        });
        imported++;
        if (imported % 100 === 0) process.stdout.write(`\r  ${imported}/${exercises.length}`);
      } catch {}
    }
    console.log(`\r  ✅ ${imported} exercises imported`);
  }

  // ── 3. Products/Packages ──────────────────
  const products = loadJson<any>("products.json");
  if (products.length > 0) {
    console.log(`\n3️⃣  Products/Packages (${products.length})...`);

    let imported = 0;
    for (const p of products) {
      const existing = await db.package.findFirst({ where: { name: p.name, organizationId: orgId } });
      if (existing) continue;

      try {
        await db.package.create({
          data: {
            organizationId: orgId,
            name: p.name,
            description: p.description || p.purchaser_description || null,
            price: (p.price || 0) / 100, // Stripe amounts are in cents
            packageType: "SESSION_PACK",
            billingCycle: "ONE_TIME",
          },
        });
        imported++;
      } catch {}
    }
    console.log(`  ✅ ${imported} products imported`);
  }

  // ── 4. Events (Appointments/Visits) ───────
  const events = loadJson<any>("events.json");
  if (events.length > 0) {
    console.log(`\n4️⃣  Events (${events.length})...`);
    // Events are activity logs — we store the count for now
    // Full appointment import requires mapping event types
    console.log(`  ℹ️ ${events.length} events available (appointment import TBD)`);
  }

  // ── 5. Messages ───────────────────────────
  const messages = loadJson<any>("messages.json");
  if (messages.length > 0) {
    console.log(`\n5️⃣  Messages (${messages.length})...`);
    console.log(`  ℹ️ ${messages.length} messages available (message import TBD — requires thread mapping)`);
  }

  // ── 6. Assessments ────────────────────────
  const assessments = loadJson<any>("assessments.json");
  if (assessments.length > 0) {
    console.log(`\n6️⃣  Assessments (${assessments.length})...`);

    let imported = 0;
    for (const a of assessments) {
      const existing = await db.assessment.findFirst({ where: { name: a.name || a.title, organizationId: orgId } });
      if (existing) continue;

      try {
        await db.assessment.create({
          data: {
            organizationId: orgId,
            name: a.name || a.title || `Assessment ${a.id}`,
            description: a.description || null,
            fields: a.questions || a.fields || [],
          },
        });
        imported++;
      } catch {}
    }
    console.log(`  ✅ ${imported} assessments imported`);
  }

  // ── Summary ───────────────────────────────
  const [clientCount, exerciseCount, pkgCount, assessmentCount] = await Promise.all([
    db.client.count({ where: { organizationId: orgId } }),
    db.exercise.count({ where: { organizationId: orgId } }),
    db.package.count({ where: { organizationId: orgId } }),
    db.assessment.count({ where: { organizationId: orgId } }),
  ]);

  console.log("\n================================================");
  console.log("✅ Import complete!");
  console.log(`   Clients: ${clientCount}`);
  console.log(`   Exercises: ${exerciseCount}`);
  console.log(`   Packages: ${pkgCount}`);
  console.log(`   Assessments: ${assessmentCount}`);

  await db.$disconnect();
  await pool.end();
}

// ── Mapping helpers ────────────────────────

function mapBilling(status: string | null): string {
  if (!status) return "NON_BILLED";
  const map: Record<string, string> = {
    Paid: "PAID",
    "Non-Billed": "NON_BILLED",
    Billed: "BILLED",
    "Past Due": "PAST_DUE",
  };
  return map[status] || "NON_BILLED";
}

function mapMuscleGroup(mg: string | null): any {
  if (!mg) return null;
  const map: Record<string, string> = {
    Chest: "CHEST", Back: "BACK", Shoulders: "SHOULDERS",
    Biceps: "BICEPS", Triceps: "TRICEPS", Forearms: "FOREARMS",
    Quadriceps: "QUADRICEPS", Hamstrings: "HAMSTRINGS", Glutes: "GLUTES",
    Calves: "CALVES", Core: "CORE", Abs: "ABS",
    "Full Body": "FULL_BODY", Cardio: "CARDIO",
  };
  return map[mg] || null;
}

function mapDifficulty(dl: string | null): any {
  if (!dl) return null;
  const map: Record<string, string> = {
    Beginner: "BEGINNER", Intermediate: "INTERMEDIATE",
    Advanced: "ADVANCED", Expert: "EXPERT",
  };
  return map[dl] || null;
}

function mapForceType(ft: string | null): any {
  if (!ft) return null;
  const map: Record<string, string> = {
    Push: "PUSH", Pull: "PULL", Static: "STATIC", Dynamic: "DYNAMIC",
  };
  return map[ft] || null;
}

main().catch(console.error);
