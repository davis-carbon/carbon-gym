/**
 * Create Supabase auth users for staff and link to StaffMember records.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const STAFF = [
  { email: "aaron@carbontc.co", password: "1loveCarbongym", firstName: "Aaron", lastName: "Davis" },
  { email: "bri@carbontc.co", password: "1loveCarbongym", firstName: "Bri", lastName: "Larson" },
  { email: "mada@carbontc.co", password: "1loveCarbongym", firstName: "Mada", lastName: "Hauck" },
  { email: "madeline@carbontc.co", password: "1loveCarbongym", firstName: "Madeline", lastName: "Gladu" },
  { email: "brandon@carbontc.co", password: "1loveCarbongym", firstName: "Brandon", lastName: "Sherwood" },
];

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const db = new PrismaClient({ adapter });

  console.log("🔐 Creating auth users...\n");

  for (const s of STAFF) {
    // Check if already exists
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email === s.email);

    let userId: string;
    if (existing) {
      userId = existing.id;
      console.log(`  ⏭ ${s.email} exists (${userId})`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: s.email,
        password: s.password,
        email_confirm: true,
        user_metadata: { firstName: s.firstName, lastName: s.lastName },
      });
      if (error) {
        console.error(`  ✗ ${s.email}: ${error.message}`);
        continue;
      }
      userId = data.user.id;
      console.log(`  ✓ Created ${s.email} (${userId})`);
    }

    // Link to StaffMember
    const staff = await db.staffMember.findFirst({ where: { email: s.email } });
    if (staff) {
      await db.staffMember.update({ where: { id: staff.id }, data: { userId } });
      console.log(`    → Linked to StaffMember`);
    }
  }

  console.log("\n✅ Done! Staff can log in at /login");
  await db.$disconnect();
  await pool.end();
}

main();
