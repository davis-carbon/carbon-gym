/**
 * Export all clients from Exercise.com
 *
 * Navigates to Accounts page, iterates through all client rows,
 * clicks into each profile, and extracts all tab data.
 *
 * Output: data-export/clients.json
 */

import { getPage, writeJson, readJson, delay } from "./browser";
import { CONFIG } from "./config";
import type { Page } from "playwright";

interface ExportedClient {
  externalId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  birthDate: string;
  location: string;
  height: string;
  weight: string;
  aboutMe: string;
  signupDate: string;
  status: string;
  billingStatus: string;
  lifecycleStage: string;
  assignedTo: string;
  profileImageUrl: string;
  tags: string[];
  // Sub-data from tabs
  packages: unknown[];
  payments: unknown[];
  measurements: unknown[];
  trainerNotes: unknown[];
  visits: unknown[];
}

export async function exportClients(): Promise<void> {
  console.log("📋 Starting client export...");

  // Check for existing partial export
  const existing = readJson<ExportedClient[]>("clients.json");
  const exportedIds = new Set(existing?.map((c) => c.externalId) ?? []);
  const clients: ExportedClient[] = existing ?? [];

  const page = await getPage();

  // Navigate to clients page
  await page.goto(`${CONFIG.baseUrl}/clients`, { waitUntil: "networkidle" });
  await delay(CONFIG.pageLoadDelay);

  // Get total number of client rows
  const clientLinks = await page.$$eval(
    "table tbody tr",
    (rows) =>
      rows.map((row) => {
        const link = row.querySelector("td a, td [class*='cursor']");
        const nameEl = row.querySelector("td:first-child");
        const name = nameEl?.textContent?.trim() ?? "";
        // Get the URL from onclick or href
        const href = (row as HTMLElement).getAttribute("data-href") || "";
        return { name, href, id: href.split("/").pop() ?? "" };
      })
  );

  // Alternative: extract client IDs from the page URLs
  // Navigate into each client by clicking the row
  const allRows = await page.$$("table tbody tr");
  console.log(`  Found ${allRows.length} client rows on current page`);

  for (let i = 0; i < allRows.length; i++) {
    // Re-query rows each time since DOM may have changed
    await page.goto(`${CONFIG.baseUrl}/clients`, { waitUntil: "networkidle" });
    await delay(CONFIG.pageLoadDelay);

    const rows = await page.$$("table tbody tr");
    if (i >= rows.length) break;

    // Click into the client
    await rows[i].click();
    await delay(CONFIG.pageLoadDelay);

    // Extract the current URL to get the client ID
    const url = page.url();
    const externalId = url.split("/").pop() ?? `client-${i}`;

    if (exportedIds.has(externalId)) {
      console.log(`  ⏭ Skipping already-exported client ${externalId}`);
      continue;
    }

    console.log(`  Extracting client ${i + 1}/${allRows.length}: ${externalId}`);

    try {
      const client = await extractClientProfile(page, externalId);
      clients.push(client);
      exportedIds.add(externalId);

      // Save after each client (resumable)
      writeJson("clients.json", clients);
    } catch (err) {
      console.error(`  ✗ Failed to extract client ${externalId}:`, err);
    }
  }

  console.log(`✅ Exported ${clients.length} clients`);
}

async function extractClientProfile(page: Page, externalId: string): Promise<ExportedClient> {
  // Extract basic info from the profile header and Personal Info tab
  const basicInfo = await page.evaluate(() => {
    const getText = (selector: string) =>
      document.querySelector(selector)?.textContent?.trim() ?? "";

    // Try to find name from the header
    const heading = document.querySelector("h1, [class*='header'] [class*='name']");
    const fullName = heading?.textContent?.trim() ?? "";
    const parts = fullName.split(" ");
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ") ?? "";

    // Look for status badges
    const badges = Array.from(document.querySelectorAll("[class*='badge'], [class*='Badge'], [class*='tag']"));
    const badgeTexts = badges.map((b) => b.textContent?.trim() ?? "");

    return { firstName, lastName, badgeTexts, fullName };
  });

  // Extract personal info fields
  const personalInfo = await page.evaluate(() => {
    const fields: Record<string, string> = {};
    // Look for label-value pairs
    const labels = document.querySelectorAll("label, [class*='label'], dt, th");
    labels.forEach((label) => {
      const key = label.textContent?.trim().toLowerCase() ?? "";
      const value =
        label.nextElementSibling?.textContent?.trim() ??
        (label as HTMLElement).parentElement?.querySelector("input, select, [class*='value']")?.textContent?.trim() ??
        "";
      if (key && value) fields[key] = value;
    });
    return fields;
  });

  return {
    externalId,
    firstName: basicInfo.firstName || personalInfo["first name"] || "",
    lastName: basicInfo.lastName || personalInfo["last name"] || "",
    email: personalInfo["email"] || "",
    phone: personalInfo["phone number"] || personalInfo["phone"] || "",
    gender: personalInfo["gender"] || "",
    birthDate: personalInfo["birth date"] || "",
    location: personalInfo["location"] || "",
    height: personalInfo["height"] || "",
    weight: personalInfo["weight"] || "",
    aboutMe: personalInfo["about me"] || "",
    signupDate: "",
    status: basicInfo.badgeTexts.find((b) => ["Active", "Inactive", "Pending Cancellation"].includes(b)) || "Active",
    billingStatus: basicInfo.badgeTexts.find((b) => ["Paid", "Non-Billed", "Billed"].includes(b)) || "",
    lifecycleStage: basicInfo.badgeTexts.find((b) => ["Client", "Lead", "Prospect"].includes(b)) || "Client",
    assignedTo: personalInfo["assigned to"] || "",
    profileImageUrl: "",
    tags: [],
    packages: [],
    payments: [],
    measurements: [],
    trainerNotes: [],
    visits: [],
  };
}
