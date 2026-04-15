/**
 * Playwright-based full data export from Exercise.com API.
 *
 * Usage: npx tsx scripts/export/playwright-export.ts
 *
 * This opens a Chromium browser with your saved Chrome profile.
 * On first run, log into home.carbontc.co manually.
 * Subsequent runs reuse the session automatically.
 *
 * Exports all data via the Exercise.com internal REST API (/api/v4/*)
 * and saves JSON files to data-export/.
 *
 * Available API endpoints discovered:
 *   /api/v4/clients     — 774 clients (with Stripe billing data in next_payment)
 *   /api/v4/exercises   — 795 exercises (with video URLs, muscle groups, etc.)
 *   /api/v4/groups      — 6 groups
 *   /api/v4/messages    — 471 messages
 *   /api/v4/conversations — 85 conversations
 *   /api/v4/trainers    — 9 trainers
 *   /api/v4/assessments — 25 assessments
 *   /api/v4/products    — 127 products/packages
 *   /api/v4/events      — 6061 events (appointments/visits/activity)
 *   /api/v4/resources   — 7 resources
 *   /api/v4/videos      — 5 videos
 *   /api/v4/reports     — 107 reports
 */

import { chromium, type BrowserContext, type Page } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "https://home.carbontc.co";
const OUTPUT_DIR = path.resolve(__dirname, "../../data-export");
const PROFILE_DIR = path.resolve(__dirname, "../../.playwright-profile");

// All endpoints to export with their response key
const ENDPOINTS = [
  { path: "clients", key: "client", label: "Clients" },
  { path: "exercises", key: "exercise", label: "Exercises" },
  { path: "groups", key: "group", label: "Groups" },
  { path: "messages", key: "message", label: "Messages" },
  { path: "conversations", key: "conversation", label: "Conversations" },
  { path: "trainers", key: "trainer", label: "Trainers" },
  { path: "assessments", key: "assessment", label: "Assessments" },
  { path: "products", key: "product", label: "Products/Packages" },
  { path: "events", key: "event", label: "Events/Appointments" },
  { path: "resources", key: "resource", label: "Resources" },
  { path: "videos", key: "video", label: "Videos" },
];

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filename: string, data: unknown) {
  ensureDir(OUTPUT_DIR);
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  const size = (fs.statSync(filepath).size / 1024).toFixed(1);
  console.log(`  💾 ${filepath} (${size} KB)`);
}

async function fetchAllPages(page: Page, endpoint: string, key: string): Promise<unknown[]> {
  const all: unknown[] = [];
  let pageNum = 1;
  let total = Infinity;

  while (all.length < total) {
    const url = `${BASE_URL}/api/v4/${endpoint}?page=${pageNum}&per_page=100`;

    const response = await page.evaluate(async (fetchUrl: string) => {
      const r = await fetch(fetchUrl);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }, url);

    total = (response as any).meta?.total ?? 0;
    const items = (response as any)[key] ?? [];

    if (items.length === 0) break;
    all.push(...items);
    pageNum++;

    // Progress
    process.stdout.write(`\r  📥 ${all.length}/${total}`);
  }

  console.log(`\r  ✅ ${all.length} records`);
  return all;
}

async function main() {
  console.log("🚀 Exercise.com Full Data Export via Playwright\n");
  console.log("================================================\n");

  ensureDir(PROFILE_DIR);

  // Launch browser with persistent context (reuses login)
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1200, height: 800 },
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = context.pages()[0] || (await context.newPage());

  // Navigate to Exercise.com to ensure we're authenticated
  console.log("🔐 Checking authentication...");
  await page.goto(`${BASE_URL}/ex4/dashboard`, { waitUntil: "networkidle" });

  // Check if we're on the login page
  const currentUrl = page.url();
  if (currentUrl.includes("login") || currentUrl.includes("sign_in")) {
    console.log("\n⚠️  Not logged in! Please log in manually in the browser window.");
    console.log("   Once logged in, the script will continue automatically.\n");

    // Wait for navigation away from login page (up to 5 minutes)
    await page.waitForURL("**/ex4/**", { timeout: 300_000 });
    console.log("✅ Logged in!\n");
  } else {
    console.log("✅ Already authenticated\n");
  }

  // Export each endpoint
  for (const ep of ENDPOINTS) {
    console.log(`\n📋 ${ep.label} (/api/v4/${ep.path})`);

    try {
      const data = await fetchAllPages(page, ep.path, ep.key);
      writeJson(`${ep.path}.json`, data);
    } catch (err: any) {
      console.error(`  ❌ Failed: ${err.message}`);
    }
  }

  // Summary
  console.log("\n================================================");
  console.log("✅ Export complete! Files saved to data-export/\n");

  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    const size = (fs.statSync(path.join(OUTPUT_DIR, f)).size / 1024).toFixed(1);
    const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, f), "utf-8"));
    const count = Array.isArray(data) ? data.length : "?";
    console.log(`  ${f}: ${count} records (${size} KB)`);
  }

  await context.close();
}

main().catch((err) => {
  console.error("\n❌ Export failed:", err);
  process.exit(1);
});
