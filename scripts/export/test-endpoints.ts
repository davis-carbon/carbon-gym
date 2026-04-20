/** Quick test: verify web-client:react header fixes the 500s for Aaron Davis */
import { chromium } from "playwright";

const BASE_URL = "https://home.carbontc.co";
const PROFILE_DIR = `${process.env.HOME}/.carbon-gym-playwright-profile`;

async function apiFetch(page: import("playwright").Page, url: string) {
  return page.evaluate(async (u: string) => {
    const r = await fetch(u, {
      credentials: "include",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "X-Requested-With": "XMLHttpRequest",
        "web-client": "react",
      },
    });
    if (!r.ok) return { __status: r.status };
    const d = await r.json();
    // Summarise
    if (Array.isArray(d)) return { type: "array", count: d.length, sample: d[0] };
    const keys = Object.keys(d);
    const counts: Record<string, number> = {};
    for (const k of keys) {
      if (Array.isArray(d[k])) counts[k] = d[k].length;
    }
    return { type: "object", keys, counts };
  }, url);
}

async function main() {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { headless: false });
  const page = ctx.pages()[0] || await ctx.newPage();

  await page.goto(`${BASE_URL}/ex4/clients/823010`, { waitUntil: "domcontentloaded", timeout: 20000 });
  if (page.url().includes("login")) await page.waitForURL("**/ex4/**", { timeout: 300_000 });
  await new Promise(r => setTimeout(r, 2000));

  const tests = [
    ["measurements user_id",     `${BASE_URL}/api/v3/measurements?user_id=1327064`],
    ["notes user_id",            `${BASE_URL}/api/v3/notes?user_id=1327064`],
    ["workouts user_id",         `${BASE_URL}/api/v3/workouts?user_id=1327064`],
    ["plan_assignments user_id", `${BASE_URL}/api/v3/plan_assignments?user_id=1327064`],
    ["fbm visits client_id",     `${BASE_URL}/api/v4/fbm/visits?client_id=823010`],
    ["fbm client_packages",      `${BASE_URL}/api/v4/fbm/client_packages?client_id=823010`],
    ["fbm purchases",            `${BASE_URL}/api/v4/fbm/purchases?client_id=823010`],
    ["assessment_submissions",   `${BASE_URL}/api/v3/assessment_submissions?user_id=1327064`],
  ] as [string, string][];

  console.log("\nTesting endpoints with web-client:react header\n");
  for (const [label, url] of tests) {
    const r = await apiFetch(page, url);
    console.log(`${label.padEnd(35)} → ${JSON.stringify(r).slice(0, 120)}`);
    await new Promise(r => setTimeout(r, 200));
  }

  await ctx.close();
}

main().catch(console.error);
