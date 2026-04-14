import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { CONFIG } from "./config";
import fs from "fs";

let browser: Browser;
let context: BrowserContext;

export async function getBrowser(): Promise<BrowserContext> {
  if (context) return context;

  // Ensure user data dir exists
  if (!fs.existsSync(CONFIG.userDataDir)) {
    fs.mkdirSync(CONFIG.userDataDir, { recursive: true });
  }

  // Launch with persistent context to reuse authenticated session
  context = await chromium.launchPersistentContext(CONFIG.userDataDir, {
    headless: false, // Run headed so you can log in on first run
    viewport: { width: 1400, height: 900 },
    args: ["--disable-blink-features=AutomationControlled"],
  });

  return context;
}

export async function getPage(): Promise<Page> {
  const ctx = await getBrowser();
  const pages = ctx.pages();
  return pages.length > 0 ? pages[0] : await ctx.newPage();
}

export async function closeBrowser(): Promise<void> {
  if (context) await context.close();
}

export function ensureOutputDir(): void {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
}

export function writeJson(filename: string, data: unknown): void {
  ensureOutputDir();
  const filepath = `${CONFIG.outputDir}/${filename}`;
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`  ✓ Wrote ${filepath}`);
}

export function readJson<T>(filename: string): T | null {
  const filepath = `${CONFIG.outputDir}/${filename}`;
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, "utf-8"));
}

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
