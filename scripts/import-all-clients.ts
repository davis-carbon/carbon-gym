/**
 * Import all 774 DOM-scraped clients into Supabase.
 * Handles name splitting, date parsing, status mapping, staff assignment.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "fs";

interface ScrapedClient {
  name: string;
  email?: string;
  signupDate: string;
  status: string;
  billingDetail?: string;
  lifecycle: string;
  assignedTo: string;
}

function parseName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function parseDate(dateStr: string): Date {
  // Format: "Thu, Jul 11, 2024" or "Mon, Apr 13, 2026"
  const cleaned = dateStr.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s*/, "");
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? new Date() : d;
}

function mapBillingStatus(status: string): string {
  const map: Record<string, string> = {
    "Paid": "PAID",
    "Non-Billed": "NON_BILLED",
    "Billed": "BILLED",
    "Pending Cancellation": "PENDING_CANCELLATION",
  };
  return map[status] || "NON_BILLED";
}

function mapClientStatus(status: string): string {
  if (status === "Pending Cancellation") return "PENDING_CANCELLATION";
  return "ACTIVE";
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const db = new PrismaClient({ adapter });

  const raw: ScrapedClient[] = JSON.parse(
    fs.readFileSync("data-export/clients.json", "utf-8")
  );

  const org = await db.organization.findFirst();
  if (!org) { console.error("No organization found"); process.exit(1); }

  // Build staff name -> id lookup
  const staff = await db.staffMember.findMany({ where: { organizationId: org.id } });
  const staffMap: Record<string, string> = {};
  staff.forEach(s => {
    staffMap[`${s.firstName} ${s.lastName}`] = s.id;
  });

  // Delete existing clients first to avoid duplicates (keep staff-seeded ones? no, replace all)
  const existingCount = await db.client.count({ where: { organizationId: org.id } });
  if (existingCount > 0) {
    console.log(`Deleting ${existingCount} existing clients...`);
    await db.client.deleteMany({ where: { organizationId: org.id } });
  }

  console.log(`\n📋 Importing ${raw.length} clients...\n`);

  let imported = 0;
  let skipped = 0;

  for (const c of raw) {
    if (!c.name || c.name.trim().length < 2) { skipped++; continue; }

    const { firstName, lastName } = parseName(c.name);
    const billingStatus = mapBillingStatus(c.status);
    const clientStatus = mapClientStatus(c.status);
    const assignedStaffId = staffMap[c.assignedTo] || null;

    try {
      await db.client.create({
        data: {
          organizationId: org.id,
          firstName,
          lastName,
          email: c.email || null,
          signupDate: parseDate(c.signupDate),
          status: clientStatus as any,
          billingStatus: billingStatus as any,
          lifecycleStage: (c.lifecycle === "Lead" ? "LEAD" : c.lifecycle === "Prospect" ? "PROSPECT" : "CLIENT") as any,
          assignedStaffId,
        },
      });
      imported++;
      if (imported % 50 === 0) console.log(`  ${imported}/${raw.length}...`);
    } catch (err: any) {
      console.error(`  ✗ ${c.name}: ${err.message?.substring(0, 80)}`);
      skipped++;
    }
  }

  const finalCount = await db.client.count({ where: { organizationId: org.id } });
  console.log(`\n✅ Done! Imported: ${imported}, Skipped: ${skipped}, Total in DB: ${finalCount}`);

  await db.$disconnect();
  await pool.end();
}

main();
