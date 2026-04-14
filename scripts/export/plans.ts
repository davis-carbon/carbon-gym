/**
 * Export all workout plans from Exercise.com
 *
 * Output: data-export/plans.json
 */

import { getPage, writeJson, delay } from "./browser";
import { CONFIG } from "./config";

interface ExportedPlan {
  externalId: string;
  name: string;
  sizeWeeks: number;
  status: string;
  createdBy: string;
  createdAt: string;
  routines: unknown[];
}

export async function exportPlans(): Promise<void> {
  console.log("📋 Starting plans export...");

  const plans: ExportedPlan[] = [];
  const page = await getPage();

  await page.goto(`${CONFIG.baseUrl}/workout-plans`, { waitUntil: "networkidle" });
  await delay(CONFIG.pageLoadDelay);

  const rows = await page.$$eval("table tbody tr", (trs) =>
    trs.map((tr) => {
      const cells = tr.querySelectorAll("td");
      return {
        name: cells[1]?.textContent?.trim() ?? cells[0]?.textContent?.trim() ?? "",
        sizeWeeks: cells[2]?.textContent?.trim() ?? "",
        status: cells[3]?.textContent?.trim() ?? "",
        createdBy: cells[4]?.textContent?.trim() ?? "",
        createdAt: cells[5]?.textContent?.trim() ?? "",
      };
    })
  );

  for (const row of rows) {
    plans.push({
      externalId: `plan-${plans.length + 1}`,
      name: row.name,
      sizeWeeks: parseInt(row.sizeWeeks) || 4,
      status: row.status.toUpperCase().replace(/\s+/g, "_"),
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      routines: [], // Would need to click into each plan to get routine details
    });
  }

  writeJson("plans.json", plans);
  console.log(`✅ Exported ${plans.length} plans`);
}
