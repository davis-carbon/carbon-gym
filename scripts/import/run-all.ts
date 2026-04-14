/**
 * Import all exported data into Supabase database.
 *
 * Usage: npx tsx scripts/import/run-all.ts
 *
 * Prerequisites:
 * 1. Supabase project created with schema pushed (npx prisma db push)
 * 2. data-export/*.json files from running scripts/export/run-all.ts
 * 3. .env.local with DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *
 * Runs imports in dependency order to respect foreign keys.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(__dirname, "../../data-export");

function readExport<T>(filename: string): T[] {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`  ⏭ ${filename} not found, skipping`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filepath, "utf-8"));
}

async function main() {
  console.log("🚀 Carbon Gym — Data Import");
  console.log("============================\n");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const db = new PrismaClient({ adapter });

  try {
    // ── 1. Organization ────────────────────
    console.log("1️⃣  Creating organization...");
    const org = await db.organization.upsert({
      where: { slug: "carbon-tc" },
      update: {},
      create: {
        name: "Carbon Training Centre",
        slug: "carbon-tc",
        website: "https://www.carbontc.co",
        timezone: "America/Denver",
      },
    });
    console.log(`  ✓ Organization: ${org.id}`);

    // ── 2. Staff Members ───────────────────
    console.log("\n2️⃣  Importing staff...");
    const staffData = [
      { firstName: "Aaron", lastName: "Davis", email: "aaron@carbontc.co", role: "OWNER" as const },
      { firstName: "Bri", lastName: "Larson", email: "bri@carbontc.co", role: "TRAINER" as const },
      { firstName: "Mada", lastName: "Hauck", email: "mada@carbontc.co", role: "TRAINER" as const },
      { firstName: "Madeline", lastName: "Gladu", email: "madeline@carbontc.co", role: "TRAINER" as const },
      { firstName: "Brandon", lastName: "Sherwood", email: "brandon@carbontc.co", role: "TRAINER" as const },
      { firstName: "Michael", lastName: "Surges", email: "michael@carbontc.co", role: "TRAINER" as const, isActive: false },
    ];

    for (const s of staffData) {
      // Note: userId will be set after Supabase auth users are created
      const existing = await db.staffMember.findFirst({
        where: { email: s.email, organizationId: org.id },
      });
      if (!existing) {
        await db.staffMember.create({
          data: {
            organizationId: org.id,
            userId: `placeholder-${s.email}`, // Will be updated after auth setup
            ...s,
          },
        });
        console.log(`  ✓ Staff: ${s.firstName} ${s.lastName}`);
      } else {
        console.log(`  ⏭ Staff already exists: ${s.firstName} ${s.lastName}`);
      }
    }

    // ── 3. Services ────────────────────────
    console.log("\n3️⃣  Importing services...");
    const services = readExport<{ name: string; type: string; duration: number; category: string }>("services.json");
    for (const svc of services) {
      const existing = await db.service.findFirst({
        where: { name: svc.name, organizationId: org.id },
      });
      if (!existing) {
        await db.service.create({
          data: {
            organizationId: org.id,
            name: svc.name,
            type: svc.type === "Class" ? "CLASS" : "APPOINTMENT",
            durationMinutes: svc.duration || 60,
          },
        });
        console.log(`  ✓ Service: ${svc.name}`);
      }
    }

    // ── 4. Groups ──────────────────────────
    console.log("\n4️⃣  Importing groups...");
    const groups = readExport<{ name: string; memberCount: number; createdBy: string }>("groups.json");
    for (const g of groups) {
      const existing = await db.group.findFirst({
        where: { name: g.name, organizationId: org.id },
      });
      if (!existing) {
        await db.group.create({
          data: { organizationId: org.id, name: g.name },
        });
        console.log(`  ✓ Group: ${g.name}`);
      }
    }

    // ── 5. Exercises ───────────────────────
    console.log("\n5️⃣  Importing exercises...");
    const exercises = readExport<{ name: string; createdBy: string; hasVideo: boolean; thumbnailUrl: string; createdAt: string }>("exercises.json");
    let exerciseCount = 0;
    for (const ex of exercises) {
      const existing = await db.exercise.findFirst({
        where: { name: ex.name, organizationId: org.id },
      });
      if (!existing) {
        await db.exercise.create({
          data: {
            organizationId: org.id,
            name: ex.name,
            thumbnailUrl: ex.thumbnailUrl || null,
            isActive: true,
          },
        });
        exerciseCount++;
      }
    }
    console.log(`  ✓ Imported ${exerciseCount} exercises`);

    // ── 6. Plans ───────────────────────────
    console.log("\n6️⃣  Importing plans...");
    const plans = readExport<{ name: string; sizeWeeks: number; status: string; createdBy: string; createdAt: string }>("plans.json");
    for (const p of plans) {
      const existing = await db.workoutPlan.findFirst({
        where: { name: p.name, organizationId: org.id },
      });
      if (!existing) {
        await db.workoutPlan.create({
          data: {
            organizationId: org.id,
            name: p.name,
            sizeWeeks: p.sizeWeeks || 4,
            status: (["DRAFT", "PUBLISHED", "ASSIGNED", "ARCHIVED"].includes(p.status) ? p.status : "DRAFT") as never,
          },
        });
        console.log(`  ✓ Plan: ${p.name}`);
      }
    }

    // ── 7. Clients ─────────────────────────
    console.log("\n7️⃣  Importing clients...");
    const clients = readExport<{
      firstName: string; lastName: string; email: string; phone: string;
      gender: string; birthDate: string; location: string;
      status: string; billingStatus: string;
    }>("clients.json");
    let clientCount = 0;
    for (const c of clients) {
      if (!c.firstName && !c.lastName) continue;
      const existing = c.email
        ? await db.client.findFirst({ where: { email: c.email, organizationId: org.id } })
        : null;
      if (!existing) {
        await db.client.create({
          data: {
            organizationId: org.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email || null,
            phone: c.phone || null,
            gender: (["MALE", "FEMALE", "NON_BINARY"].includes(c.gender) ? c.gender : null) as never,
            birthDate: c.birthDate ? new Date(c.birthDate) : null,
            status: (["ACTIVE", "INACTIVE", "PENDING_CANCELLATION"].includes(c.status) ? c.status : "ACTIVE") as never,
            billingStatus: (["PAID", "NON_BILLED", "BILLED", "PAST_DUE"].includes(c.billingStatus) ? c.billingStatus : "NON_BILLED") as never,
          },
        });
        clientCount++;
      }
    }
    console.log(`  ✓ Imported ${clientCount} clients`);

    // ── 8. Location ────────────────────────
    console.log("\n8️⃣  Creating location...");
    const existingLoc = await db.location.findFirst({ where: { organizationId: org.id } });
    if (!existingLoc) {
      await db.location.create({
        data: {
          organizationId: org.id,
          name: "CARBON",
          timezone: "America/Denver",
        },
      });
      console.log("  ✓ Location: CARBON");
    }

    // ── Summary ────────────────────────────
    const counts = await Promise.all([
      db.staffMember.count({ where: { organizationId: org.id } }),
      db.client.count({ where: { organizationId: org.id } }),
      db.service.count({ where: { organizationId: org.id } }),
      db.group.count({ where: { organizationId: org.id } }),
      db.exercise.count({ where: { organizationId: org.id } }),
      db.workoutPlan.count({ where: { organizationId: org.id } }),
    ]);

    console.log("\n============================");
    console.log("✅ Import complete!");
    console.log(`   Staff: ${counts[0]}`);
    console.log(`   Clients: ${counts[1]}`);
    console.log(`   Services: ${counts[2]}`);
    console.log(`   Groups: ${counts[3]}`);
    console.log(`   Exercises: ${counts[4]}`);
    console.log(`   Plans: ${counts[5]}`);
  } catch (err) {
    console.error("\n❌ Import failed:", err);
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main();
