/**
 * Creates required Supabase Storage buckets for the app.
 * Run once: npx tsx scripts/setup-storage.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const buckets = [
    { id: "uploads", public: false },
    { id: "avatars", public: true },
    { id: "resources", public: true },
    { id: "message-attachments", public: false },
    { id: "exercise-media", public: true },
  ];

  for (const bucket of buckets) {
    const { error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
    });
    if (error && error.message !== "The resource already exists") {
      console.error(
        `Failed to create bucket ${bucket.id}:`,
        error.message,
      );
    } else {
      console.log(
        `Bucket: ${bucket.id} (${bucket.public ? "public" : "private"})`,
      );
    }
  }
  console.log("\nStorage buckets ready.");
}

main();
