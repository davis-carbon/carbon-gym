/**
 * Extract the auth token Exercise.com stores in the browser,
 * then test per-client endpoints with it.
 */

import { chromium } from "playwright";

const BASE_URL = "https://home.carbontc.co";
const PROFILE_DIR = `${process.env.HOME}/.carbon-gym-playwright-profile`;
const CLIENT_ID = "823010";
const USER_ID   = "1327064";

async function main() {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1200, height: 800 },
  });
  const page = ctx.pages()[0] || (await ctx.newPage());

  await page.goto(`${BASE_URL}/ex4/clients/${CLIENT_ID}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (page.url().includes("login")) {
    await page.waitForURL("**/ex4/**", { timeout: 300_000 });
  }
  await new Promise(r => setTimeout(r, 3000));

  // ── Extract all possible auth tokens ─────────────────────────────────
  const authData = await page.evaluate(() => {
    const result: Record<string, unknown> = {};

    // localStorage
    const ls: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      ls[k] = localStorage.getItem(k)!;
    }
    result.localStorage = ls;

    // sessionStorage
    const ss: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)!;
      ss[k] = sessionStorage.getItem(k)!;
    }
    result.sessionStorage = ss;

    // cookies
    result.cookies = document.cookie;

    // window globals that might hold token
    const win = window as Record<string, unknown>;
    result.windowKeys = Object.keys(win).filter(k =>
      k.toLowerCase().includes("token") ||
      k.toLowerCase().includes("auth") ||
      k.toLowerCase().includes("trainer") ||
      k.toLowerCase().includes("user") ||
      k.toLowerCase().includes("api") ||
      k.toLowerCase().includes("jwt")
    );
    for (const k of result.windowKeys as string[]) {
      result[`window.${k}`] = win[k];
    }

    // meta tags
    const metas: Record<string, string> = {};
    document.querySelectorAll("meta").forEach(m => {
      if (m.name) metas[m.name] = m.content;
    });
    result.metas = metas;

    return result;
  });

  console.log("\n=== localStorage ===");
  const ls = authData.localStorage as Record<string, string>;
  for (const [k, v] of Object.entries(ls)) {
    console.log(`  ${k}: ${String(v).slice(0, 120)}`);
  }

  console.log("\n=== sessionStorage ===");
  const ss = authData.sessionStorage as Record<string, string>;
  for (const [k, v] of Object.entries(ss)) {
    console.log(`  ${k}: ${String(v).slice(0, 120)}`);
  }

  console.log("\n=== meta tags ===");
  const metas = authData.metas as Record<string, string>;
  for (const [k, v] of Object.entries(metas)) {
    console.log(`  ${k}: ${v.slice(0, 80)}`);
  }

  console.log("\n=== window token vars ===");
  for (const k of (authData.windowKeys as string[])) {
    console.log(`  window.${k}: ${String((authData as Record<string, unknown>)[`window.${k}`]).slice(0, 120)}`);
  }

  // ── Capture actual request headers from a real SPA API call ──────────
  console.log("\n=== Capturing real request headers ===");
  const capturedHeaders: Record<string, string>[] = [];

  page.on("request", (req) => {
    if (req.url().includes("/api/") && req.method() === "GET") {
      const headers = req.headers();
      capturedHeaders.push({ url: req.url().split("?")[0], ...headers });
    }
  });

  // Trigger some navigation to get real API calls
  await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  // Click a tab to trigger lazy-loaded data
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll("a, li, [role='tab'], .nav-link"));
    for (const t of tabs) {
      const text = (t.textContent ?? "").toLowerCase();
      if (text.includes("measure") || text.includes("payment") || text.includes("visit")) {
        try { (t as HTMLElement).click(); break; } catch {}
      }
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  if (capturedHeaders.length > 0) {
    console.log(`\nCaptured ${capturedHeaders.length} API requests. First request headers:`);
    const first = capturedHeaders[0];
    for (const [k, v] of Object.entries(first)) {
      console.log(`  ${k}: ${String(v).slice(0, 120)}`);
    }
  } else {
    console.log("No API requests captured during reload.");
  }

  // ── Now test endpoints WITH the auth header if we found one ──────────
  const token = Object.entries(ls).find(([k]) =>
    k.toLowerCase().includes("token") || k.toLowerCase().includes("auth") || k.toLowerCase().includes("jwt")
  )?.[1];

  if (token) {
    console.log(`\n✅ Found token in localStorage: ${token.slice(0, 40)}...`);

    const testUrl = `${BASE_URL}/api/v3/measurements?client_id=${CLIENT_ID}`;
    const result = await page.evaluate(async ([u, t]: [string, string]) => {
      const r = await fetch(u, {
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${t}`,
        },
      });
      return { status: r.status, body: await r.text().then(t => t.slice(0, 300)) };
    }, [testUrl, token] as [string, string]);

    console.log(`  Test with Bearer: status=${result.status}, body=${result.body}`);
  } else {
    console.log("\n⚠️  No token found in localStorage. Checking cookies...");
    console.log(`  Cookies: ${String(authData.cookies).slice(0, 200)}`);
  }

  await ctx.close();
}

main().catch(err => { console.error(err); process.exit(1); });
