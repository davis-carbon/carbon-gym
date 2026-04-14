/**
 * Create Supabase auth users for all staff members.
 *
 * Usage: npx tsx scripts/setup-auth.ts
 *
 * This creates email/password users in Supabase Auth and links them
 * to StaffMember records in the database.
 *
 * Prerequisites:
 * - Supabase project created
 * - .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * - Database schema pushed (npx prisma db push)
 * - Staff members imported (scripts/import/run-all.ts)
 */

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const STAFF_CREDENTIALS = [
  { email: "aaron@carbontc.co", password: "", firstName: "Aaron", lastName: "Davis" },
  { email: "bri@carbontc.co", password: "", firstName: "Bri", lastName: "Larson" },
  { email: "mada@carbontc.co", password: "", firstName: "Mada", lastName: "Hauck" },
  { email: "madeline@carbontc.co", password: "", firstName: "Madeline", lastName: "Gladu" },
  { email: "brandon@carbontc.co", password: "", firstName: "Brandon", lastName: "Sherwood" },
];

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  // Check if passwords are set
  const missingPasswords = STAFF_CREDENTIALS.filter((s) => !s.password);
  if (missingPasswords.length > 0) {
    console.error("❌ Set passwords for all staff in this script before running:");
    missingPasswords.forEach((s) => console.error(`   - ${s.email}`));
    console.error("\nEdit scripts/setup-auth.ts and fill in the password fields.");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const db = new PrismaClient({ adapter });

  console.log("🔐 Creating auth users for staff...\n");

  for (const staff of STAFF_CREDENTIALS) {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === staff.email);

    let userId: string;

    if (existing) {
      userId = existing.id;
      console.log(`  ⏭ ${staff.email} already exists (${userId})`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: staff.email,
        password: staff.password,
        email_confirm: true,
        user_metadata: { firstName: staff.firstName, lastName: staff.lastName },
      });

      if (error) {
        console.error(`  ✗ Failed to create ${staff.email}:`, error.message);
        continue;
      }

      userId = data.user.id;
      console.log(`  ✓ Created ${staff.email} (${userId})`);
    }

    // Link to StaffMember record
    const staffRecord = await db.staffMember.findFirst({
      where: { email: staff.email },
    });

    if (staffRecord) {
      await db.staffMember.update({
        where: { id: staffRecord.id },
        data: { userId },
      });
      console.log(`    → Linked to StaffMember ${staffRecord.id}`);
    } else {
      console.error(`    ✗ No StaffMember record found for ${staff.email}`);
    }
  }

  console.log("\n✅ Auth setup complete!");
  console.log("\nStaff can now log in at /login with their email and password.");

  await db.$disconnect();
  await pool.end();
}

main();
