/**
 * Export all groups from Exercise.com
 *
 * Output: data-export/groups.json
 */

import { getPage, writeJson, delay } from "./browser";
import { CONFIG } from "./config";

interface ExportedGroup {
  name: string;
  memberCount: number;
  createdBy: string;
}

export async function exportGroups(): Promise<void> {
  console.log("👥 Starting groups export...");

  const page = await getPage();
  await page.goto(`${CONFIG.baseUrl}/groups`, { waitUntil: "networkidle" });
  await delay(CONFIG.pageLoadDelay);

  const groups = await page.$$eval("table tbody tr", (trs) =>
    trs.map((tr) => {
      const cells = tr.querySelectorAll("td");
      return {
        name: cells[0]?.textContent?.trim() ?? "",
        memberCount: parseInt(cells[1]?.textContent?.trim() ?? "0") || 0,
        createdBy: cells[2]?.textContent?.trim() ?? "",
      };
    })
  );

  writeJson("groups.json", groups);
  console.log(`✅ Exported ${groups.length} groups`);
}
