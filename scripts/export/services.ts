/**
 * Export all services from Exercise.com
 *
 * Output: data-export/services.json
 */

import { getPage, writeJson, delay } from "./browser";
import { CONFIG } from "./config";

export async function exportServices(): Promise<void> {
  console.log("📅 Starting services export...");

  const page = await getPage();
  await page.goto(`${CONFIG.baseUrl}/fbm/services`, { waitUntil: "networkidle" });
  await delay(CONFIG.pageLoadDelay);

  const services = await page.$$eval("table tbody tr", (trs) =>
    trs.map((tr) => {
      const cells = tr.querySelectorAll("td");
      return {
        name: cells[0]?.textContent?.trim() ?? "",
        type: cells[1]?.textContent?.trim() ?? "",
        duration: parseInt(cells[2]?.textContent?.trim() ?? "60") || 60,
        category: cells[3]?.textContent?.trim() ?? "",
        createdAt: cells[4]?.textContent?.trim() ?? "",
      };
    })
  );

  writeJson("services.json", services);
  console.log(`✅ Exported ${services.length} services`);
}
