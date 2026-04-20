/**
 * Probe: find the real per-client API endpoints for Exercise.com.
 * Tests every plausible URL pattern for one known client and reports what returns data.
 *
 * Usage: npx tsx scripts/export/probe-client.ts
 */

import { chromium } from "playwright";

const BASE_URL = "https://home.carbontc.co";
const PROFILE_DIR = `${process.env.HOME}/.carbon-gym-playwright-profile`;

// Aaron Davis: id=823010, user_id=1327064, calendar_client_id=1056390
const CLIENT_ID    = "823010";
const USER_ID      = "1327064";
const CAL_CLIENT   = "1056390";

async function apiFetch(page: import("playwright").Page, url: string) {
  try {
    const r = await page.evaluate(async (u: string) => {
      const resp = await fetch(u, {
        credentials: "include",
        headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
      });
      if (!resp.ok) return { __status: resp.status };
      const text = await resp.text();
      try { return JSON.parse(text); } catch { return { __raw: text.slice(0, 200) }; }
    }, url);
    return r;
  } catch (e) {
    return { __error: String(e) };
  }
}

function summarise(data: unknown, url: string): string {
  if (!data || typeof data !== "object") return "non-object";
  const d = data as Record<string, unknown>;
  if (d.__status) return `HTTP ${d.__status}`;
  if (d.__error) return `ERROR`;
  if (d.__raw) return `NON-JSON: ${d.__raw}`;
  const keys = Object.keys(d);
  // Count total items across all array keys
  let totalItems = 0;
  for (const k of keys) {
    if (Array.isArray(d[k])) totalItems += (d[k] as unknown[]).length;
  }
  if (Array.isArray(data)) return `ARRAY[${(data as unknown[]).length}]`;
  return `{${keys.join(", ")}}  total_items=${totalItems}`;
}

async function main() {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1200, height: 800 },
  });
  const page = ctx.pages()[0] || (await ctx.newPage());

  await page.goto(`${BASE_URL}/ex4/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (page.url().includes("login")) {
    console.log("⚠️  Log in manually, then the script continues.");
    await page.waitForURL("**/ex4/**", { timeout: 300_000 });
  }

  // Stay on a stable page
  await page.goto(`${BASE_URL}/ex4/clients/${CLIENT_ID}`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  const candidates: { label: string; url: string }[] = [
    // ── Measurements ───────────────────────────────────────────────────
    { label: "measurements v3 client_id",        url: `${BASE_URL}/api/v3/measurements?client_id=${CLIENT_ID}` },
    { label: "measurements v3 user_id",           url: `${BASE_URL}/api/v3/measurements?user_id=${USER_ID}` },
    { label: "measurements v2 client nested",     url: `${BASE_URL}/api/v2/clients/${CLIENT_ID}/measurements` },
    { label: "measurements v3 nested",            url: `${BASE_URL}/api/v3/clients/${CLIENT_ID}/measurements` },
    { label: "body_measurements v3",              url: `${BASE_URL}/api/v3/body_measurements?client_id=${CLIENT_ID}` },
    { label: "measurement_entries v3",            url: `${BASE_URL}/api/v3/measurement_entries?client_id=${CLIENT_ID}` },
    { label: "measurement_entries user_id",       url: `${BASE_URL}/api/v3/measurement_entries?user_id=${USER_ID}` },

    // ── Payments / Purchases ────────────────────────────────────────────
    { label: "purchases v3 client_id",            url: `${BASE_URL}/api/v3/purchases?client_id=${CLIENT_ID}` },
    { label: "purchases v3 user_id",              url: `${BASE_URL}/api/v3/purchases?user_id=${USER_ID}` },
    { label: "payments v3 client_id",             url: `${BASE_URL}/api/v3/payments?client_id=${CLIENT_ID}` },
    { label: "fbm/purchases v4 client_id",        url: `${BASE_URL}/api/v4/fbm/purchases?client_id=${CLIENT_ID}` },
    { label: "fbm/payments v4 client_id",         url: `${BASE_URL}/api/v4/fbm/payments?client_id=${CLIENT_ID}` },
    { label: "fbm/invoices v4 client_id",         url: `${BASE_URL}/api/v4/fbm/invoices?client_id=${CLIENT_ID}` },
    { label: "billing_transactions v3",           url: `${BASE_URL}/api/v3/billing_transactions?client_id=${CLIENT_ID}` },

    // ── Visits / Appointments ───────────────────────────────────────────
    { label: "visits v4 fbm client_id",           url: `${BASE_URL}/api/v4/fbm/visits?client_id=${CLIENT_ID}` },
    { label: "visits v3 client_id",               url: `${BASE_URL}/api/v3/visits?client_id=${CLIENT_ID}` },
    { label: "visits v2 nested",                  url: `${BASE_URL}/api/v2/clients/${CLIENT_ID}/visits` },
    { label: "appointments v4 client_id",         url: `${BASE_URL}/api/v4/appointments?client_id=${CLIENT_ID}` },
    { label: "fbm/appointments v4",               url: `${BASE_URL}/api/v4/fbm/appointments?client_id=${CLIENT_ID}` },
    { label: "fbm/visit_entries v4",              url: `${BASE_URL}/api/v4/fbm/visit_entries?client_id=${CLIENT_ID}` },

    // ── Trainer Notes ───────────────────────────────────────────────────
    { label: "notes v3 client_id",                url: `${BASE_URL}/api/v3/notes?client_id=${CLIENT_ID}` },
    { label: "notes v3 user_id",                  url: `${BASE_URL}/api/v3/notes?user_id=${USER_ID}` },
    { label: "client_notes v3",                   url: `${BASE_URL}/api/v3/client_notes?client_id=${CLIENT_ID}` },
    { label: "trainer_notes v3",                  url: `${BASE_URL}/api/v3/trainer_notes?client_id=${CLIENT_ID}` },
    { label: "comments v3 client_id",             url: `${BASE_URL}/api/v3/comments?client_id=${CLIENT_ID}` },
    { label: "notes v2 nested",                   url: `${BASE_URL}/api/v2/clients/${CLIENT_ID}/notes` },

    // ── Workout Logs ────────────────────────────────────────────────────
    { label: "workout_logs v3 client_id",         url: `${BASE_URL}/api/v3/workout_logs?client_id=${CLIENT_ID}` },
    { label: "workout_logs v3 user_id",           url: `${BASE_URL}/api/v3/workout_logs?user_id=${USER_ID}` },
    { label: "workouts v3 user_id",               url: `${BASE_URL}/api/v3/workouts?user_id=${USER_ID}` },
    { label: "workout_entries v3 user_id",        url: `${BASE_URL}/api/v3/workout_entries?user_id=${USER_ID}` },
    { label: "completed_workouts v3",             url: `${BASE_URL}/api/v3/completed_workouts?user_id=${USER_ID}` },
    { label: "user workouts v4",                  url: `${BASE_URL}/api/v4/users/${USER_ID}/workouts` },

    // ── Packages / Subscriptions ────────────────────────────────────────
    { label: "subscriptions v3 client_id",        url: `${BASE_URL}/api/v3/subscriptions?client_id=${CLIENT_ID}` },
    { label: "client_packages v4 fbm",            url: `${BASE_URL}/api/v4/fbm/client_packages?client_id=${CLIENT_ID}` },
    { label: "client_packages v3",                url: `${BASE_URL}/api/v3/client_packages?client_id=${CLIENT_ID}` },
    { label: "memberships v3 client_id",          url: `${BASE_URL}/api/v3/memberships?client_id=${CLIENT_ID}` },
    { label: "fbm/subscriptions v4",              url: `${BASE_URL}/api/v4/fbm/subscriptions?client_id=${CLIENT_ID}` },

    // ── Plan Assignments ────────────────────────────────────────────────
    { label: "plan_assignments v3 client_id",     url: `${BASE_URL}/api/v3/plan_assignments?client_id=${CLIENT_ID}` },
    { label: "plan_assignments v3 user_id",       url: `${BASE_URL}/api/v3/plan_assignments?user_id=${USER_ID}` },
    { label: "assigned_plans v3",                 url: `${BASE_URL}/api/v3/assigned_plans?client_id=${CLIENT_ID}` },

    // ── Assessment Submissions ──────────────────────────────────────────
    { label: "assessment_submissions v3 client",  url: `${BASE_URL}/api/v3/assessment_submissions?client_id=${CLIENT_ID}` },
    { label: "assessment_submissions v3 user",    url: `${BASE_URL}/api/v3/assessment_submissions?user_id=${USER_ID}` },
    { label: "form_submissions v3",               url: `${BASE_URL}/api/v3/form_submissions?client_id=${CLIENT_ID}` },
    { label: "client v2 full",                    url: `${BASE_URL}/api/v2/clients/${CLIENT_ID}` },

    // ── Nutrition ───────────────────────────────────────────────────────
    { label: "nutrition_logs v3 user_id",         url: `${BASE_URL}/api/v3/nutrition_logs?user_id=${USER_ID}` },
    { label: "food_logs v3 user_id",              url: `${BASE_URL}/api/v3/food_logs?user_id=${USER_ID}` },
    { label: "macros v3 user_id",                 url: `${BASE_URL}/api/v3/macros?user_id=${USER_ID}` },

    // ── Calendar / Reminders ────────────────────────────────────────────
    { label: "reminders v3 client_id",            url: `${BASE_URL}/api/v3/reminders?client_id=${CLIENT_ID}&fetch_all=true` },
    { label: "calendar v3 cal_client_id",         url: `${BASE_URL}/api/v3/calendar?calendar_client_id=${CAL_CLIENT}` },
  ];

  console.log(`\nProbing ${candidates.length} endpoint patterns for client ${CLIENT_ID} / user ${USER_ID}\n`);
  console.log("=".repeat(80));

  const hits: { label: string; url: string; summary: string }[] = [];

  for (const { label, url } of candidates) {
    const data = await apiFetch(page, url);
    const summary = summarise(data, url);
    const isHit = !summary.includes("HTTP 4") && !summary.includes("ERROR") && !summary.includes("ARRAY[0]") && summary !== "{}" && !summary.includes("total_items=0");

    if (isHit) {
      console.log(`✅ ${label.padEnd(45)} ${summary}`);
      hits.push({ label, url, summary });
    } else {
      console.log(`   ${label.padEnd(45)} ${summary}`);
    }

    await new Promise(r => setTimeout(r, 150));
  }

  console.log("\n" + "=".repeat(80));
  console.log(`\n🎯 ${hits.length} endpoints returned data:\n`);
  for (const h of hits) {
    console.log(`  ${h.label}`);
    console.log(`    ${h.url}`);
    console.log(`    → ${h.summary}\n`);
  }

  await ctx.close();
}

main().catch(err => { console.error(err); process.exit(1); });
