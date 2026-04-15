import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const { name, data } = await req.json();
  const dir = path.resolve(process.cwd(), "data-export");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2));
  return NextResponse.json({ ok: true, count: data.length, file: name });
}
