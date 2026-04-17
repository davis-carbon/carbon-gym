import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Upload a file to Supabase Storage.
 *
 * POST /api/upload
 * Body: FormData with:
 *   - file: the file to upload
 *   - bucket: target bucket name (avatars, exercise-media, resources, message-attachments)
 *   - path: optional subpath within the bucket (e.g., "client-id/")
 *
 * Returns: { url, path, size }
 */
export async function POST(req: NextRequest) {
  // Require authenticated user
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const bucket = (formData.get("bucket") as string | null) ?? "uploads";
  const subpath = (formData.get("path") as string | null) ?? "";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Max file sizes per bucket
  const maxBytes = bucket === "exercise-media" ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: `File too large. Max ${maxBytes / 1024 / 1024}MB` }, { status: 400 });
  }

  // Use service role key for upload (bypass RLS — we've already auth'd the user)
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Ensure bucket exists (idempotent)
  await service.storage.createBucket(bucket, { public: true }).catch(() => null);

  // Generate unique filename
  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const fullPath = subpath ? `${subpath.replace(/\/$/, "")}/${filename}` : filename;

  // Upload
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await service.storage
    .from(bucket)
    .upload(fullPath, arrayBuffer, {
      contentType: file.type || undefined,
      cacheControl: "31536000", // 1 year
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: publicUrl } = service.storage.from(bucket).getPublicUrl(fullPath);

  return NextResponse.json({
    url: publicUrl.publicUrl,
    path: fullPath,
    bucket,
    size: file.size,
  });
}
