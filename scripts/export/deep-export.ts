/**
 * Carbon Training Centre — Deep Data Export (v3)
 *
 * Key findings from API probe:
 *   - Workout plans:  GET /api/v3/workout-plans          → { workout_plan: [...], meta: {...} }
 *   - Exercises:      GET /api/v3/exercises/              → { exercise: [...], meta: {...} }
 *   - Plan assigns:   GET /api/v3/plan_assignments        → array
 *   - Packages (FBM): GET /api/v4/fbm/packages            → { package: [...], meta: {...} }
 *   - Services:       GET /api/v4/fbm/services            → array
 *   - Groups:         GET /api/v2/groups                  → array
 *   - Client detail:  GET /api/v2/clients/{id}            → client object
 *   - Per-client data: discovered via tab-click interception (see discoverClientEndpoints)
 *
 * Strategy for per-client data:
 *   1. Navigate to the client profile page (SPA route)
 *   2. Click each tab and intercept all API responses fired
 *   3. Save per-endpoint data keyed by client ID
 *
 * Usage: npx tsx scripts/export/deep-export.ts
 * Resumable: saves every 10 clients, re-run to continue from where it stopped.
 */

import { chromium, type Page } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "https://home.carbontc.co";
const OUTPUT_DIR = path.resolve(__dirname, "../../data-export");
const PROFILE_DIR = path.resolve(process.env.HOME || "~", ".carbon-gym-playwright-profile");
const NAV_DELAY = 1800;   // ms after navigation before clicking tabs
const TAB_DELAY = 1200;   // ms after clicking a tab before moving on
const API_DELAY = 200;    // ms between direct fetch() calls

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(d: string) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function writeJson(filename: string, data: unknown) {
  ensureDir(OUTPUT_DIR);
  const fp = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
  const kb = (fs.statSync(fp).size / 1024).toFixed(1);
  console.log(`  💾 ${filename} (${kb} KB)`);
}

function readJson<T>(filename: string): T | null {
  const fp = path.join(OUTPUT_DIR, filename);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, "utf8")) as T; }
  catch { return null; }
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function prog(i: number, n: number, label: string) {
  const pct = Math.round((i / n) * 100);
  const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
  process.stdout.write(`\r  [${bar}] ${pct}% (${i}/${n}) ${label}          `);
}

// ─── Direct fetch via browser session ────────────────────────────────────────

async function apiFetch(page: Page, url: string): Promise<Record<string, unknown>> {
  try {
    const result = await page.evaluate(async (u: string) => {
      const r = await fetch(u, {
        credentials: "include",
        headers: {
          "Accept": "application/json, text/plain, */*",
          "X-Requested-With": "XMLHttpRequest",
          // Exercise.com React SPA identifies itself with this header.
          // Without it, the Rails API returns 500 on most per-client endpoints.
          "web-client": "react",
        },
      });
      if (!r.ok) return { __status: r.status };
      return r.json();
    }, url);
    return result as Record<string, unknown>;
  } catch {
    return { __error: "eval failed" };
  }
}

async function fetchAllPages(
  page: Page,
  fullUrl: string, // full URL with ? already set
  responseKey: string,
): Promise<unknown[]> {
  const all: unknown[] = [];
  let p = 1;
  while (true) {
    const sep = fullUrl.includes("?") ? "&" : "?";
    const url = `${fullUrl}${sep}page=${p}`;
    const data = await apiFetch(page, url);
    await sleep(API_DELAY);

    if (data?.__status || data?.__error) break;

    // Try the provided key, then common variants
    const items: unknown[] =
      (data[responseKey] as unknown[]) ??
      (data[responseKey.replace(/-/g, "_")] as unknown[]) ??
      (Array.isArray(data) ? data as unknown[] : []);

    if (!items || items.length === 0) break;
    all.push(...items);

    // Pagination
    const meta = data.meta as Record<string, unknown> | undefined;
    const totalPages = meta?.total_pages as number | undefined;
    if (totalPages && p >= totalPages) break;
    if (!totalPages && items.length < 20) break;
    p++;
  }
  return all;
}

// ─── Tab-click interception for per-client data ───────────────────────────────

interface CapturedResponse { url: string; data: unknown; endpoint: string }

/**
 * Navigate to a client's profile page, click every tab, and capture all
 * API responses fired. Returns a map of endpoint → data.
 */
async function captureClientProfile(
  page: Page,
  clientId: string | number,
): Promise<Record<string, unknown>> {
  const captured: Record<string, unknown[]> = {};

  // Listen for all API responses while on this client page
  const handler = async (resp: import("playwright").Response) => {
    const url = resp.url();
    if (!url.includes("/api/") || resp.status() !== 200) return;
    const ct = resp.headers()["content-type"] ?? "";
    if (!ct.includes("json")) return;
    try {
      const data = await resp.json();
      // Key by the path after /api/
      const endpoint = url.replace(/^.*\/api\//, "").split("?")[0];
      if (!captured[endpoint]) captured[endpoint] = [];
      if (Array.isArray(data)) {
        captured[endpoint].push(...data);
      } else if (data && typeof data === "object") {
        // Merge object arrays into captured
        for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
          if (Array.isArray(v) && v.length > 0) {
            const key = `${endpoint}::${k}`;
            if (!captured[key]) captured[key] = [];
            captured[key].push(...v);
          }
        }
        // Also store the raw object if it's a single item (e.g. single client detail)
        if (!Array.isArray(data)) {
          const key = `${endpoint}::raw`;
          captured[key] = [data];
        }
      }
    } catch {}
  };

  page.on("response", handler);

  try {
    // Navigate to client profile
    await page.goto(`${BASE_URL}/ex4/clients/${clientId}`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    }).catch(() => {});
    await sleep(NAV_DELAY);

    // Find and click all tabs
    const tabSelectors = [
      // Common tab patterns in Exercise.com
      'a[href*="#measurements"]', 'a[data-tab="measurements"]', 'li[data-tab="measurements"]',
      'a[href*="#payments"]',    'a[data-tab="payments"]',     'li[data-tab="payments"]',
      'a[href*="#visits"]',      'a[data-tab="visits"]',       'li[data-tab="visits"]',
      'a[href*="#notes"]',       'a[data-tab="notes"]',        'li[data-tab="notes"]',
      'a[href*="#workout"]',     'a[data-tab="workouts"]',     'li[data-tab="workouts"]',
      'a[href*="#nutrition"]',   'a[data-tab="nutrition"]',    'li[data-tab="nutrition"]',
      'a[href*="#assessment"]',  'a[data-tab="assessments"]',  'li[data-tab="assessments"]',
      'a[href*="#package"]',     'a[data-tab="packages"]',     'li[data-tab="packages"]',
      'a[href*="#files"]',       'a[data-tab="files"]',
      // Generic tab UI patterns
      '.nav-tabs a', '.tabs a', '[role="tab"]',
    ];

    // Try to find and click tabs
    for (const sel of tabSelectors) {
      try {
        const tabs = await page.$$(sel);
        for (const tab of tabs) {
          try {
            await tab.click();
            await sleep(TAB_DELAY);
          } catch {}
        }
      } catch {}
    }

    // Also try clicking any link that contains tab keywords
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a, li.tab, [data-tab], [role='tab']"));
      const keywords = ["measurement", "payment", "visit", "note", "workout", "nutrition", "assessment", "package", "file", "resource"];
      links.forEach((el) => {
        const text = (el.textContent ?? "").toLowerCase() + (el.getAttribute("href") ?? "").toLowerCase() + (el.getAttribute("data-tab") ?? "").toLowerCase();
        if (keywords.some((k) => text.includes(k))) {
          try { (el as HTMLElement).click(); } catch {}
        }
      });
    }).catch(() => {});
    await sleep(TAB_DELAY * 2);

  } finally {
    page.off("response", handler);
  }

  return captured as Record<string, unknown>;
}

// ─── Global exporters (known endpoints from probe) ────────────────────────────

async function exportWorkoutPlans(page: Page) {
  console.log("\n📋 Workout Plans...");
  if (readJson("workout_plans.json")) { console.log("  ✅ Already done"); return; }

  const plans = await fetchAllPages(page, `${BASE_URL}/api/v3/workout-plans`, "workout_plan");
  console.log(`  📥 Found ${plans.length} plans`);

  if (plans.length === 0) {
    // Try alternate URL
    const alt = await fetchAllPages(page, `${BASE_URL}/api/v3/workout_plans`, "workout_plan");
    plans.push(...alt);
  }

  // Fetch full detail for each plan (includes routines + exercises)
  const detailed: unknown[] = [];
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i] as Record<string, unknown>;
    prog(i + 1, plans.length, String(plan.name ?? plan.id));
    const detail = await apiFetch(page, `${BASE_URL}/api/v3/workout-plans/${plan.id}`);
    await sleep(API_DELAY);
    detailed.push((detail.workout_plan as unknown) ?? plan);
  }
  console.log();
  writeJson("workout_plans.json", detailed);
}

async function exportPackages(page: Page) {
  console.log("\n📦 Packages...");
  if (readJson("packages.json")) { console.log("  ✅ Already done"); return; }

  const pkgs = await fetchAllPages(page, `${BASE_URL}/api/v4/fbm/packages`, "package");
  console.log(`  📥 ${pkgs.length} packages`);
  writeJson("packages.json", pkgs);
}

async function exportServices(page: Page) {
  console.log("\n🗓️  Services...");
  if (readJson("services.json")) { console.log("  ✅ Already done"); return; }

  // Services endpoint returns array directly
  const raw = await apiFetch(page, `${BASE_URL}/api/v4/fbm/services`);
  const svcs: unknown[] = Array.isArray(raw) ? raw : (raw.service as unknown[] ?? []);
  console.log(`  📥 ${svcs.length} services`);
  writeJson("services.json", svcs);

  // Service categories
  const cats = await fetchAllPages(page, `${BASE_URL}/api/v4/fbm/service_categories`, "service_category");
  writeJson("service_categories.json", cats);
}

async function exportResources(page: Page) {
  console.log("\n📁 Resources...");
  if (readJson("resources-full.json")) { console.log("  ✅ Already done"); return; }

  // Try v3 resources
  const res = await fetchAllPages(page, `${BASE_URL}/api/v3/resources`, "resource");
  if (res.length === 0) {
    // Try v2
    const res2 = await fetchAllPages(page, `${BASE_URL}/api/v2/resources`, "resource");
    res.push(...res2);
  }
  console.log(`  📥 ${res.length} resources`);
  writeJson("resources-full.json", res);
}

async function exportAvailability(page: Page) {
  console.log("\n📅 Availability...");
  if (readJson("availability.json")) { console.log("  ✅ Already done"); return; }

  const result: Record<string, unknown[]> = {};
  for (const ep of ["schedules", "availability_schedules", "fbm/availability_schedules", "fbm/schedules"]) {
    const data = await apiFetch(page, `${BASE_URL}/api/v4/${ep}`);
    if (!data.__status && !data.__error) {
      const items = Array.isArray(data) ? data : Object.values(data).find(Array.isArray) as unknown[] ?? [];
      if (items.length > 0) result[ep] = items;
    }
    await sleep(API_DELAY);
  }
  writeJson("availability.json", result);
}

async function exportGroupMembers(page: Page, groups: Record<string, unknown>[]) {
  console.log("\n👥 Group Members...");
  if (readJson("group-members.json")) { console.log("  ✅ Already done"); return; }

  const result: Record<string, unknown[]> = {};
  for (const g of groups) {
    const members = await fetchAllPages(page, `${BASE_URL}/api/v2/groups/${g.id}/users`, "user");
    if (members.length === 0) {
      // Try alternate
      const m2 = await fetchAllPages(page, `${BASE_URL}/api/v4/groups/${g.id}/members`, "member");
      members.push(...m2);
    }
    result[String(g.id)] = members;
    console.log(`    Group "${g.name}": ${members.length} members`);
  }
  writeJson("group-members.json", result);
}

// ─── Per-client tab-click scraper ────────────────────────────────────────────

async function exportClientData(page: Page, clients: Record<string, unknown>[]) {
  console.log("\n🧑‍💼 Per-client data (tab-click scrape)...");
  console.log("  Navigating to each client profile and clicking all tabs.");
  console.log("  This captures measurements, payments, visits, notes, etc.\n");

  const savePath = path.join(OUTPUT_DIR, "client-all-data.json");
  const existing = readJson<Record<string, unknown>>("client-all-data.json") ?? {} as Record<string, unknown>;
  const doneCount = Object.keys(existing).length;
  if (doneCount > 0) console.log(`  ↩️  Resuming from ${doneCount} already done\n`);

  // Only scrape clients we haven't done yet
  const todo = clients.filter((c) => !existing[String(c.id)]);
  console.log(`  📋 ${todo.length} clients remaining (${clients.length - todo.length} skipped)\n`);

  let saved = 0;
  for (let i = 0; i < todo.length; i++) {
    const c = todo[i];
    prog(i + 1, todo.length, `${c.first_name} ${c.last_name}`);

    const data = await captureClientProfile(page, String(c.id));
    existing[String(c.id)] = data;
    saved++;

    // Save every 10 clients
    if (saved % 10 === 0) {
      fs.writeFileSync(savePath, JSON.stringify(existing, null, 2));
    }
  }

  fs.writeFileSync(savePath, JSON.stringify(existing, null, 2));
  const kb = (fs.statSync(savePath).size / 1024).toFixed(1);
  console.log(`\n\n  ✅ Saved client-all-data.json (${kb} KB)`);

  // Summarise what was captured
  const endpointCounts: Record<string, number> = {};
  for (const clientData of Object.values(existing)) {
    for (const ep of Object.keys(clientData as Record<string, unknown>)) {
      endpointCounts[ep] = (endpointCounts[ep] ?? 0) + 1;
    }
  }
  console.log("\n  Captured endpoints:");
  for (const [ep, count] of Object.entries(endpointCounts).sort(([, a], [, b]) => b - a).slice(0, 20)) {
    console.log(`    ${ep}: ${count} clients`);
  }
}

// ─── Also do direct per-client API fetches for known endpoints ────────────────

async function exportClientDirectData(page: Page, clients: Record<string, unknown>[]) {
  console.log("\n\n🔁 Direct per-client API fetches (v3 endpoints)...");

  // From the probe we know plan_assignments is at v3/plan_assignments
  // Try fetching per-client versions of each known endpoint

  // ── Confirmed endpoints from live SPA tab-click capture ─────────────────────
  // Source: probe-tabs.ts captured these exact URLs from the React SPA.
  // Key: header "web-client: react" is required on all requests.
  // user_id = client.user_id (the auth account ID, NOT the client relationship ID)
  const uid = (c: Record<string, unknown>) => String(c.user_id);

  const endpoints = [
    // Trainer notes
    {
      file: "client-notes.json",
      url: (c: Record<string, unknown>) => `${BASE_URL}/api/v4/user_notes?user_id=${uid(c)}&per=100`,
      key: "user_note",
    },
    // Package assignments (what packages they have)
    {
      file: "client-packages.json",
      url: (c: Record<string, unknown>) => `${BASE_URL}/api/v4/fbm/user_packages?q%5Bincludes_user%5D=${uid(c)}&per=100`,
      key: "user_package",
    },
    // Visit / appointment history (all past visits)
    {
      file: "client-visits.json",
      url: (c: Record<string, unknown>) =>
        `${BASE_URL}/api/v4/fbm/visits?for_user=true&q%5Buser_id_or_chaperone_user_id_eq%5D=${uid(c)}&per=100&q%5Bs%5D=appointment_start_time+desc`,
      key: "visit",
    },
    // Active subscriptions
    {
      file: "client-subscriptions.json",
      url: (c: Record<string, unknown>) => `${BASE_URL}/api/v4/subscriptions?user_id=${uid(c)}`,
      key: "subscription",
    },
    // Billing account + Stripe subscriptions
    {
      file: "client-billing.json",
      url: (c: Record<string, unknown>) => `${BASE_URL}/api/v2/users/account?stripe_subs=true&user_id_only=${uid(c)}`,
      key: "user",  // response is a user object, stored as-is
    },
    // Workout completions + fitness stats
    {
      file: "client-fitness-stats.json",
      url: (c: Record<string, unknown>) => `${BASE_URL}/api/v3/fitness_stats/recent_stats?q%5Buser_id_eq%5D=${uid(c)}&fetch_all=true`,
      key: "fitness_stat",
    },
    // Workout logs (completed workouts with exercises)
    {
      file: "client-workout-logs.json",
      url: (c: Record<string, unknown>) => `${BASE_URL}/api/v3/workouts?user_id=${uid(c)}`,
      key: "workout",
    },
    // Plan assignments
    {
      file: "client-plans.json",
      url: (c: Record<string, unknown>) => `${BASE_URL}/api/v3/plan_assignments?user_id=${uid(c)}`,
      key: "plan_assignment",
    },
    // Nutrition goals/macros
    {
      file: "client-nutrition.json",
      url: (c: Record<string, unknown>) => `${BASE_URL}/api/v2/users/nutrition/?user_id=${uid(c)}&date_string=${new Date().toISOString().split("T")[0]}`,
      key: "nutrition",
    },
    // Auto-renew settings
    {
      file: "client-autorenews.json",
      url: (c: Record<string, unknown>) => `${BASE_URL}/api/v4/auto_renews/?user_id=${uid(c)}`,
      key: "auto_renew",
    },
    // Calendar events / appointments (past year)
    {
      file: "client-calendar.json",
      url: (c: Record<string, unknown>) => {
        const end = new Date().toISOString().split("T")[0];
        const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        return `${BASE_URL}/api/v4/calendar?user_id=${uid(c)}&start=${start}&end=${end}&time_zone=America%2FChicago`;
      },
      key: "event",
    },
  ];

  for (const ep of endpoints as Array<{ file: string; url: (c: Record<string, unknown>) => string; key: string }>) {
    console.log(`\n  Fetching ${ep.file}...`);
    const savePath = path.join(OUTPUT_DIR, ep.file);
    const existing = readJson<Record<string, unknown[]>>(ep.file) ?? {};
    const doneIds = new Set(Object.keys(existing));
    const todo = clients.filter((c) => !doneIds.has(String(c.id)));

    if (todo.length === 0) { console.log("    ✅ Already done"); continue; }
    console.log(`    ${todo.length} clients to fetch...`);

    let count = 0;
    for (let i = 0; i < todo.length; i++) {
      const c = todo[i];
      prog(i + 1, todo.length, `${c.first_name} ${c.last_name}`);

      const items = await fetchAllPages(page, ep.url(c), ep.key);
      existing[String(c.id)] = items;
      count++;
      await sleep(API_DELAY);

      if (count % 50 === 0) {
        fs.writeFileSync(savePath, JSON.stringify(existing, null, 2));
      }
    }

    fs.writeFileSync(savePath, JSON.stringify(existing, null, 2));
    const total = Object.values(existing).reduce((s, a) => s + a.length, 0);
    const kb = (fs.statSync(savePath).size / 1024).toFixed(1);
    console.log(`\n    ✅ ${total} records (${kb} KB)`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Carbon Training Centre — Deep Data Export v3");
  console.log("================================================\n");
  console.log("Uses correct API endpoints discovered from live probe.");
  console.log("Saves progress every 10 clients — safe to interrupt & resume.\n");

  ensureDir(OUTPUT_DIR);
  ensureDir(PROFILE_DIR);

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = context.pages()[0] || (await context.newPage());

  // ── Auth ────────────────────────────────────────────────────
  console.log("🔐 Checking authentication...");
  await page.goto(`${BASE_URL}/ex4/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  const url = page.url();
  if (url.includes("login") || url.includes("sign_in")) {
    console.log("\n⚠️  Please log in manually in the browser window.\n");
    await page.waitForURL("**/ex4/**", { timeout: 300_000 });
  }
  console.log("✅ Authenticated\n");
  await sleep(1500);

  // ── Load clients ────────────────────────────────────────────
  console.log("📂 Loading client list...");
  const clients = readJson<Record<string, unknown>[]>("clients.json") ?? [];
  console.log(`  ✅ ${clients.length} clients\n`);
  const groups = readJson<Record<string, unknown>[]>("groups.json") ?? [];

  // ── Global data ─────────────────────────────────────────────
  await exportWorkoutPlans(page);
  await exportPackages(page);
  await exportServices(page);
  await exportResources(page);
  await exportAvailability(page);
  await exportGroupMembers(page, groups);

  // ── Per-client direct API fetches ───────────────────────────
  // First try direct API calls — fast, clean data
  await exportClientDirectData(page, clients);

  // ── Per-client tab-click scrape ─────────────────────────────
  // Then do tab-click scrape to catch anything the direct fetches missed
  await exportClientData(page, clients);

  // ── Summary ─────────────────────────────────────────────────
  console.log("\n\n================================================");
  console.log("✅ Export complete!\n");
  for (const f of fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".json")).sort()) {
    const kb = (fs.statSync(path.join(OUTPUT_DIR, f)).size / 1024).toFixed(1);
    console.log(`  ${f.padEnd(45)} ${kb.padStart(8)} KB`);
  }

  await context.close();
}

main().catch((err) => {
  console.error("\n❌ Export failed:", err);
  process.exit(1);
});
