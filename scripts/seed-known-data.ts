/**
 * Seed known data captured from the Exercise.com UI exploration.
 * This covers services, groups, packages, and clients we already identified.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const db = new PrismaClient({ adapter });

  const org = await db.organization.findFirst();
  if (!org) { console.error("Run import/run-all.ts first"); process.exit(1); }
  const orgId = org.id;

  console.log("🌱 Seeding known data...\n");

  // ── Services ──────────────────────────
  console.log("📅 Services...");
  const services = [
    { name: "Discovery Call", type: "APPOINTMENT" as const, durationMinutes: 20 },
    { name: "Gym Tour", type: "APPOINTMENT" as const, durationMinutes: 30 },
    { name: "Semi-Private Training", type: "CLASS" as const, durationMinutes: 60 },
    { name: "1-on-1", type: "APPOINTMENT" as const, durationMinutes: 60 },
    { name: "Nutrition Program Check-In Call", type: "APPOINTMENT" as const, durationMinutes: 30 },
    { name: "Initial Evaluation", type: "APPOINTMENT" as const, durationMinutes: 90 },
    { name: "30-Minute Bodywork", type: "APPOINTMENT" as const, durationMinutes: 30 },
    { name: "60 Minute Restorative Massage", type: "APPOINTMENT" as const, durationMinutes: 60 },
    { name: "90 Minute Restorative", type: "APPOINTMENT" as const, durationMinutes: 90 },
    { name: "Therapy", type: "APPOINTMENT" as const, durationMinutes: 60 },
  ];
  for (const s of services) {
    const exists = await db.service.findFirst({ where: { name: s.name, organizationId: orgId } });
    if (!exists) {
      await db.service.create({ data: { ...s, organizationId: orgId } });
      console.log(`  ✓ ${s.name}`);
    }
  }

  // ── Groups ────────────────────────────
  console.log("\n👥 Groups...");
  const groups = [
    "Nutrition Engineering",
    "March Row Challenge 2026",
    "March Rowing Challenge",
    "2024: Fall Apprentice Program",
    "Tour de BikeErg",
    "Course: Herbal Formulas for Performance & Recovery",
  ];
  for (const name of groups) {
    const exists = await db.group.findFirst({ where: { name, organizationId: orgId } });
    if (!exists) {
      await db.group.create({ data: { name, organizationId: orgId } });
      console.log(`  ✓ ${name}`);
    }
  }

  // ── Packages ──────────────────────────
  console.log("\n📦 Packages...");
  const packages = [
    { name: "ORIGIN", packageType: "SESSION_PACK" as const, price: 1499, billingCycle: "ONE_TIME" as const, sessionCount: 12 },
    { name: "Monthly Unlimited", packageType: "MEMBERSHIP" as const, price: 299, billingCycle: "MONTHLY" as const },
    { name: "10-Pack 1-on-1", packageType: "SESSION_PACK" as const, price: 750, billingCycle: "ONE_TIME" as const, sessionCount: 10 },
    { name: "Nutrition Program - Monthly", packageType: "MEMBERSHIP" as const, price: 199, billingCycle: "MONTHLY" as const },
    { name: "Drop-In", packageType: "DROP_IN" as const, price: 35, billingCycle: "ONE_TIME" as const, sessionCount: 1 },
    { name: "Trial - 3 Sessions", packageType: "TRIAL" as const, price: 99, billingCycle: "ONE_TIME" as const, sessionCount: 3 },
  ];
  for (const p of packages) {
    const exists = await db.package.findFirst({ where: { name: p.name, organizationId: orgId } });
    if (!exists) {
      await db.package.create({ data: { ...p, organizationId: orgId } });
      console.log(`  ✓ ${p.name}`);
    }
  }

  // ── Clients (from UI exploration) ─────
  console.log("\n👤 Clients...");
  const staff = await db.staffMember.findMany({ where: { organizationId: orgId } });
  const staffByName: Record<string, string> = {};
  staff.forEach((s) => { staffByName[`${s.firstName} ${s.lastName}`] = s.id; });

  const clients = [
    { firstName: "Tres", lastName: "Teschke", email: "tres.teschke@gmail.com", phone: "+1 214 453 9765", signupDate: new Date("2019-07-24"), billingStatus: "PAID" as const, assignedStaff: "Mada Hauck", birthDate: new Date("1991-05-21") },
    { firstName: "Jaxon", lastName: "Honea", email: null, signupDate: new Date("2025-04-17"), billingStatus: "PAID" as const, assignedStaff: "Mada Hauck" },
    { firstName: "Jesse", lastName: "Weissburg", email: "j.weissburg@gmail.com", signupDate: new Date("2024-07-11"), billingStatus: "BILLED" as const, status: "PENDING_CANCELLATION" as const, assignedStaff: "Bri Larson" },
    { firstName: "Shane", lastName: "Flores", email: null, signupDate: new Date("2024-09-15"), billingStatus: "PAID" as const, assignedStaff: "Mada Hauck" },
    { firstName: "Matthew", lastName: "Schweitzer", email: null, signupDate: new Date("2024-03-22"), billingStatus: "PAID" as const, assignedStaff: "Aaron Davis" },
    { firstName: "Miguel", lastName: "Garza", email: null, signupDate: new Date("2024-11-01"), billingStatus: "PAID" as const, assignedStaff: "Aaron Davis" },
    { firstName: "Caroline", lastName: "Joyner", email: null, signupDate: new Date("2025-01-14"), billingStatus: "PAID" as const, assignedStaff: "Aaron Davis" },
    { firstName: "Ed", lastName: "Hockfield", email: null, signupDate: new Date("2024-06-10"), billingStatus: "PAID" as const, assignedStaff: "Aaron Davis" },
    { firstName: "Max", lastName: "Rice", email: null, signupDate: new Date("2025-02-20"), billingStatus: "PAID" as const, assignedStaff: "Aaron Davis" },
    { firstName: "Brett", lastName: "Hart", email: null, signupDate: new Date("2024-08-05"), billingStatus: "PAID" as const, assignedStaff: "Bri Larson" },
    { firstName: "JOHN Peter", lastName: "Leonard", email: "jpleonard2000@yahoo.com", signupDate: new Date("2026-04-13"), billingStatus: "NON_BILLED" as const },
    { firstName: "Ruth", lastName: "ofondu", email: "ruginalegend@gmail.com", signupDate: new Date("2026-04-13"), billingStatus: "NON_BILLED" as const },
    { firstName: "Jamey", lastName: "Whitlock", email: null, signupDate: new Date("2024-01-01"), billingStatus: "PAID" as const, assignedStaff: "Mada Hauck" },
    { firstName: "Scott", lastName: "Redding", email: null, signupDate: new Date("2024-01-01"), billingStatus: "PAID" as const, assignedStaff: "Mada Hauck" },
    { firstName: "Christian", lastName: "Campos", email: null, signupDate: new Date("2024-01-01"), billingStatus: "PAID" as const, assignedStaff: "Mada Hauck" },
    { firstName: "Sarah", lastName: "Reuther", email: null, signupDate: new Date("2024-01-01"), billingStatus: "PAID" as const, assignedStaff: "Mada Hauck" },
    { firstName: "Nolan", lastName: "Wheeler", email: null, signupDate: new Date("2024-01-01"), billingStatus: "PAID" as const, assignedStaff: "Mada Hauck" },
    { firstName: "Annie", lastName: "Sendejo", email: null, signupDate: new Date("2024-01-01"), billingStatus: "PAID" as const, assignedStaff: "Mada Hauck" },
    { firstName: "Emily", lastName: "Grigsby", email: null, signupDate: new Date("2024-01-01"), billingStatus: "PAID" as const, assignedStaff: "Mada Hauck" },
    { firstName: "Alex", lastName: "Briggs", email: null, signupDate: new Date("2024-01-01"), billingStatus: "PAID" as const, assignedStaff: "Mada Hauck" },
    { firstName: "Joyce", lastName: "Chapa", email: null, signupDate: new Date("2024-01-01"), billingStatus: "PAID" as const, assignedStaff: "Aaron Davis" },
    { firstName: "Janet", lastName: "Rice", email: null, signupDate: new Date("2024-01-01"), billingStatus: "PAID" as const, assignedStaff: "Aaron Davis" },
    { firstName: "Stephanie Taylor", lastName: "Twohey", email: null, signupDate: new Date("2024-06-01"), billingStatus: "PAID" as const },
    { firstName: "Michael", lastName: "Wood", email: null, signupDate: new Date("2024-03-01"), billingStatus: "PAID" as const },
    { firstName: "Gabriel", lastName: "Reyes", email: null, signupDate: new Date("2024-05-01"), billingStatus: "PAID" as const },
    { firstName: "Meagan", lastName: "Keefe", email: null, signupDate: new Date("2024-09-01"), billingStatus: "PAID" as const, assignedStaff: "Mada Hauck" },
    { firstName: "Tyler", lastName: "Wheeler", email: null, signupDate: new Date("2026-04-08"), billingStatus: "PAID" as const, assignedStaff: "Madeline Gladu" },
    { firstName: "AMY", lastName: "Burnett", email: null, signupDate: new Date("2024-06-24"), billingStatus: "PAID" as const, assignedStaff: "Mada Hauck" },
  ];

  for (const c of clients) {
    const { assignedStaff, ...clientData } = c as typeof c & { assignedStaff?: string };
    const exists = await db.client.findFirst({
      where: { firstName: clientData.firstName, lastName: clientData.lastName, organizationId: orgId },
    });
    if (!exists) {
      await db.client.create({
        data: {
          ...clientData,
          organizationId: orgId,
          assignedStaffId: assignedStaff ? staffByName[assignedStaff] ?? null : null,
        },
      });
      console.log(`  ✓ ${clientData.firstName} ${clientData.lastName}`);
    }
  }

  // ── Plans ─────────────────────────────
  console.log("\n📋 Plans...");
  const plans = [
    { name: "ORIGIN Post-Assessment", sizeWeeks: 4, status: "DRAFT" as const, createdBy: "Brandon Sherwood" },
    { name: "ORIGIN Pre-Assessment", sizeWeeks: 4, status: "DRAFT" as const, createdBy: "Brandon Sherwood" },
    { name: "Nutrition - Weekly Check In [M]", sizeWeeks: 4, status: "ASSIGNED" as const, createdBy: "Bri Larson" },
    { name: "Nutrition - Weekly Check In [F]", sizeWeeks: 4, status: "ASSIGNED" as const, createdBy: "Bri Larson" },
    { name: "At Home", sizeWeeks: 4, status: "DRAFT" as const, createdBy: "Bri Larson" },
    { name: "Strength Foundations A", sizeWeeks: 6, status: "PUBLISHED" as const, createdBy: "Aaron Davis" },
    { name: "Hypertrophy Block B", sizeWeeks: 4, status: "PUBLISHED" as const, createdBy: "Mada Hauck" },
    { name: "Rehab — Knee Protocol", sizeWeeks: 8, status: "ASSIGNED" as const, createdBy: "Madeline Gladu" },
  ];
  for (const p of plans) {
    const exists = await db.workoutPlan.findFirst({ where: { name: p.name, organizationId: orgId } });
    if (!exists) {
      await db.workoutPlan.create({
        data: {
          name: p.name,
          sizeWeeks: p.sizeWeeks,
          status: p.status,
          organizationId: orgId,
          createdById: staffByName[p.createdBy] ?? null,
        },
      });
      console.log(`  ✓ ${p.name}`);
    }
  }

  // ── Summary ───────────────────────────
  const [svcCount, grpCount, pkgCount, cliCount, planCount] = await Promise.all([
    db.service.count({ where: { organizationId: orgId } }),
    db.group.count({ where: { organizationId: orgId } }),
    db.package.count({ where: { organizationId: orgId } }),
    db.client.count({ where: { organizationId: orgId } }),
    db.workoutPlan.count({ where: { organizationId: orgId } }),
  ]);

  console.log("\n============================");
  console.log("✅ Seed complete!");
  console.log(`   Services: ${svcCount}`);
  console.log(`   Groups: ${grpCount}`);
  console.log(`   Packages: ${pkgCount}`);
  console.log(`   Clients: ${cliCount}`);
  console.log(`   Plans: ${planCount}`);

  await db.$disconnect();
  await pool.end();
}

main();
