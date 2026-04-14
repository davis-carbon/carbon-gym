/**
 * Run all data export scripts in sequence.
 *
 * Usage: npx tsx scripts/export/run-all.ts
 *
 * On first run, a browser window will open — log into home.carbontc.co manually.
 * The session will be persisted for subsequent runs.
 *
 * Each script saves its output to data-export/*.json and is resumable
 * (skips already-exported items on re-run).
 */

import { closeBrowser, ensureOutputDir } from "./browser";
import { exportClients } from "./clients";
import { exportExercises } from "./exercises";
import { exportPlans } from "./plans";
import { exportGroups } from "./groups";
import { exportServices } from "./services";

async function main() {
  console.log("🚀 Carbon Training Centre — Data Export");
  console.log("========================================\n");

  ensureOutputDir();

  try {
    // Run in dependency order
    await exportServices();
    await exportGroups();
    await exportExercises();
    await exportPlans();
    await exportClients(); // Slowest — does it last

    console.log("\n========================================");
    console.log("✅ All exports complete!");
    console.log("📁 Output: data-export/");
  } catch (err) {
    console.error("\n❌ Export failed:", err);
  } finally {
    await closeBrowser();
  }
}

main();
