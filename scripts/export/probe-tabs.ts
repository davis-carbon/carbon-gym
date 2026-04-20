/**
 * Navigate to a client profile, click every tab, and capture all API request URLs.
 * This reveals the exact endpoints for measurements, notes, packages, purchases, etc.
 */
import { chromium } from "playwright";
import fs from "fs";

const BASE_URL = "https://home.carbontc.co";
const PROFILE_DIR = `${process.env.HOME}/.carbon-gym-playwright-profile`;

// Use a client who is likely active with real data (Gary Woodring - was in early probe)
// Try a few to find one with measurements/payments
const PROBE_CLIENTS = [
  { id: "848091", name: "Gary Woodring" },    // seen in earlier probe
  { id: "823010", name: "Aaron Davis" },
  { id: "857650", name: "Jesse Weissburg" },
];

async function main() {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1400, height: 900 },
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(`${BASE_URL}/ex4/dashboard`, { waitUntil: "domcontentloaded", timeout: 20000 });
  if (page.url().includes("login")) await page.waitForURL("**/ex4/**", { timeout: 300_000 });
  await new Promise(r => setTimeout(r, 1500));

  const allRequests: { url: string; client: string }[] = [];

  for (const client of PROBE_CLIENTS) {
    console.log(`\n🔍 Probing client: ${client.name} (${client.id})`);

    const captured = new Set<string>();
    const handler = (req: import("playwright").Request) => {
      if (req.url().includes("/api/")) {
        captured.add(req.url().split("?")[0] + "?" + req.url().split("?")[1]?.replace(/[0-9]{5,}/g, "ID"));
      }
    };
    page.on("request", handler);

    // Navigate to client profile
    await page.goto(`${BASE_URL}/ex4/clients/${client.id}`, {
      waitUntil: "networkidle", timeout: 20000
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // Print what loaded on initial page
    console.log("  Initial page requests:");
    for (const u of captured) {
      console.log(`    ${u}`);
    }
    captured.clear();

    // Now find and click every tab/nav item
    const tabTexts = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll(
        "a.nav-link, .nav-tabs a, .tab-pane, [data-toggle='tab'], [role='tab'], .client-nav a, nav a, ul.nav li a"
      ));
      return tabs.map(t => ({
        text: (t.textContent ?? "").trim(),
        href: (t as HTMLAnchorElement).href ?? "",
        id: t.id ?? "",
        dataTarget: t.getAttribute("data-target") ?? t.getAttribute("href") ?? "",
      }));
    });

    console.log(`  Tabs found: ${tabTexts.map(t => t.text || t.dataTarget).join(" | ")}`);

    // Click each tab
    for (const tab of tabTexts) {
      if (!tab.text && !tab.dataTarget) continue;
      try {
        const el = await page.$(`[data-target="${tab.dataTarget}"], [href="${tab.dataTarget}"], a:has-text("${tab.text}")`);
        if (el) {
          await el.click().catch(() => {});
          await new Promise(r => setTimeout(r, 1200));
        }
      } catch {}
    }

    // Also try clicking common tab names directly
    for (const keyword of ["Measurements", "Payments", "Visits", "Notes", "Packages", "Workouts", "Nutrition", "Assessments", "Files", "Billing"]) {
      try {
        const el = await page.$(`text=${keyword}`);
        if (el) {
          await el.click().catch(() => {});
          await new Promise(r => setTimeout(r, 1200));
        }
      } catch {}
    }

    page.off("request", handler);

    const tabRequests = Array.from(captured);
    if (tabRequests.length > 0) {
      console.log(`  Tab-triggered requests (${tabRequests.length}):`);
      for (const u of tabRequests.sort()) {
        console.log(`    ${u}`);
        allRequests.push({ url: u, client: client.name });
      }
    } else {
      console.log("  No additional tab requests captured.");
    }
  }

  // Summary: unique endpoints
  const unique = [...new Set(allRequests.map(r => r.url))].sort();
  console.log(`\n\n${"=".repeat(60)}`);
  console.log(`ALL unique API endpoints discovered (${unique.length}):`);
  for (const u of unique) {
    console.log(`  ${u}`);
  }

  fs.writeFileSync(
    `${process.env.HOME}/carbon-gym/data-export/_tab-probe.json`,
    JSON.stringify({ requests: allRequests, unique }, null, 2)
  );

  await ctx.close();
}

main().catch(console.error);
