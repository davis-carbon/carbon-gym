/**
 * Playwright-based full data export from Exercise.com.
 *
 * Strategy: Intercept the SPA's own API responses as we navigate pages.
 * The SPA has auth context (CSRF tokens, headers) that manual fetch lacks.
 * We trigger navigation to each page and capture the API responses.
 *
 * For paginated data (clients, exercises), we navigate through all pages
 * using URL parameters, capturing each API response.
 *
 * Usage: npx tsx scripts/export/playwright-export.ts
 */

import { chromium, type Page, type BrowserContext, type Response } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "https://home.carbontc.co";
const OUTPUT_DIR = path.resolve(__dirname, "../../data-export");
const PROFILE_DIR = path.resolve(process.env.HOME || "~", ".carbon-gym-playwright-profile");

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

/**
 * Navigate through paginated Exercise.com pages and capture API responses.
 * The SPA makes its own API calls which we intercept.
 */
async function capturePages(
  page: Page,
  uiPath: string,
  pageParam: string,
  apiPattern: string,
  responseKey: string,
  totalPages: number
): Promise<unknown[]> {
  const all: unknown[] = [];

  for (let p = 1; p <= totalPages; p++) {
    const url = `${BASE_URL}${uiPath}?${pageParam}=${p}`;

    // Set up response listener before navigating
    const apiPromise = page.waitForResponse(
      (resp) => resp.url().includes(apiPattern) && resp.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    // Wait for API response or timeout
    const apiResp = await apiPromise;

    if (apiResp) {
      try {
        const data = await apiResp.json();
        const items = data[responseKey] || [];
        all.push(...items);
        process.stdout.write(`\r  📥 Page ${p}/${totalPages}: ${all.length} records`);
      } catch {}
    } else {
      console.log(`\n  ⚠️ No API response on page ${p}, skipping`);
    }

    // Small delay to avoid rate limiting
    await page.waitForTimeout(800);
  }

  console.log(`\r  ✅ ${all.length} records                    `);
  return all;
}

/**
 * For endpoints without pagination UI, intercept all API calls on a single page.
 */
async function captureSinglePage(
  page: Page,
  uiPath: string,
  apiPattern: string,
  responseKey: string
): Promise<unknown[]> {
  const apiPromise = page.waitForResponse(
    (resp) => resp.url().includes(apiPattern) && resp.status() === 200,
    { timeout: 15000 }
  ).catch(() => null);

  await page.goto(`${BASE_URL}${uiPath}`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
  const apiResp = await apiPromise;

  if (apiResp) {
    try {
      const data = await apiResp.json();
      return data[responseKey] || [];
    } catch {}
  }

  return [];
}

async function main() {
  console.log("🚀 Exercise.com Full Data Export via Playwright\n");
  console.log("Strategy: Intercept SPA's own API responses\n");
  console.log("================================================\n");

  ensureDir(PROFILE_DIR);

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1200, height: 800 },
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = context.pages()[0] || (await context.newPage());

  // Authenticate
  console.log("🔐 Checking authentication...");
  await page.goto(`${BASE_URL}/ex4/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });

  const currentUrl = page.url();
  if (currentUrl.includes("login") || currentUrl.includes("sign_in")) {
    console.log("\n⚠️  Log in manually in the browser window.");
    console.log("   The script will continue after you log in.\n");
    await page.waitForURL("**/ex4/**", { timeout: 300_000 });
  }
  console.log("✅ Authenticated\n");

  // Also capture ALL API responses globally
  const allApiResponses: Record<string, unknown[]> = {};
  page.on("response", async (resp) => {
    if (resp.url().includes("/api/v4/") && resp.status() === 200) {
      try {
        const ct = resp.headers()["content-type"] || "";
        if (!ct.includes("json")) return;
        const data = await resp.json();
        const endpoint = resp.url().split("/api/v4/")[1]?.split("?")[0] || "";
        if (!allApiResponses[endpoint]) allApiResponses[endpoint] = [];
        // Store the raw response for later
        if (data[endpoint] || data[endpoint.replace(/s$/, "")]) {
          const key = data[endpoint] ? endpoint : endpoint.replace(/s$/, "");
          const items = data[key] || [];
          allApiResponses[endpoint].push(...items);
        }
      } catch {}
    }
  });

  // ── 1. Clients (774, 39 pages) ────────────
  console.log("📋 Clients (39 pages)...");
  const clients = await capturePages(
    page, "/ex4/clients", "client_page", "/api/v4/client", "client", 39
  );
  writeJson("clients-api.json", clients);

  // ── 2. Exercises (795, 40 pages) ──────────
  console.log("\n📋 Exercises (40 pages)...");
  const exercises = await capturePages(
    page, "/ex4/exercises", "exercise_page", "/api/v4/exercise", "exercise", 40
  );
  writeJson("exercises-api.json", exercises);

  // ── 3. Groups ─────────────────────────────
  console.log("\n📋 Groups...");
  const groups = await captureSinglePage(page, "/ex4/groups", "/api/v4/group", "group");
  writeJson("groups-api.json", groups);

  // ── 4. Messages ───────────────────────────
  console.log("\n📋 Messages...");
  const messages = await captureSinglePage(page, "/ex4/messages", "/api/v4/message", "message");
  // Messages page may load conversations instead
  const conversations = await captureSinglePage(page, "/ex4/messages", "/api/v4/conversation", "conversation");
  writeJson("messages-api.json", messages.length > 0 ? messages : conversations);

  // ── 5. Navigate to a client profile to capture payments ──
  console.log("\n📋 Client profiles (payment data)...");
  // Navigate to first few clients to capture their subscription/billing data
  // The client list API already includes payment info in next_payment field

  // ── 6. Automations ────────────────────────
  console.log("\n📋 Automations...");
  await page.goto(`${BASE_URL}/ex4/embed/dashboard/automations/`, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const automationText = await page.evaluate(() => document.body.innerText);
  writeJson("automations-text.json", { rawText: automationText });

  // ── 7. Services/Packages/Schedule ─────────
  console.log("\n📋 Services...");
  const services = await captureSinglePage(page, "/ex4/fbm/services", "/api/v4/service", "service");
  writeJson("services-api.json", services);

  console.log("\n📋 Visits...");
  const visits = await captureSinglePage(page, "/ex4/fbm/visits", "/api/v4/visit", "visit");
  writeJson("visits-api.json", visits);

  // ── Summary ───────────────────────────────
  console.log("\n================================================");
  console.log("✅ Export complete!\n");

  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    const size = (fs.statSync(path.join(OUTPUT_DIR, f)).size / 1024).toFixed(1);
    console.log(`  ${f} (${size} KB)`);
  }

  // Also dump any API responses we captured passively
  console.log("\n📊 Passively captured API endpoints:");
  for (const [ep, items] of Object.entries(allApiResponses)) {
    console.log(`  /api/v4/${ep}: ${items.length} records`);
  }

  await context.close();
}

main().catch((err) => {
  console.error("\n❌ Export failed:", err);
  process.exit(1);
});
