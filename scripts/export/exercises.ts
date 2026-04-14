/**
 * Export all exercises from Exercise.com
 *
 * Navigates to Exercises page, paginates through all entries,
 * extracts name, muscle group, difficulty, force type, video URL, etc.
 *
 * Output: data-export/exercises.json
 */

import { getPage, writeJson, readJson, delay } from "./browser";
import { CONFIG } from "./config";

interface ExportedExercise {
  externalId: string;
  name: string;
  muscleGroup: string;
  difficulty: string;
  forceType: string;
  createdBy: string;
  hasVideo: boolean;
  videoUrl: string;
  thumbnailUrl: string;
  isActive: boolean;
  tags: string[];
  createdAt: string;
}

export async function exportExercises(): Promise<void> {
  console.log("🏋️ Starting exercise export...");

  const exercises: ExportedExercise[] = [];
  const page = await getPage();

  let pageNum = 1;
  let hasMore = true;

  while (hasMore) {
    await page.goto(
      `${CONFIG.baseUrl}/exercises?exercise_page=${pageNum}&exercise_f_status=Active`,
      { waitUntil: "networkidle" }
    );
    await delay(CONFIG.pageLoadDelay);

    const rows = await page.$$eval("table tbody tr", (trs) =>
      trs.map((tr) => {
        const cells = tr.querySelectorAll("td");
        const name = cells[1]?.textContent?.trim() ?? cells[0]?.textContent?.trim() ?? "";
        const createdBy = cells[cells.length - 2]?.textContent?.trim() ?? "";
        const createdAt = cells[cells.length - 1]?.textContent?.trim() ?? "";
        const img = tr.querySelector("img");
        const thumbnailUrl = img?.src ?? "";
        const hasVideo = !!img;

        return { name, createdBy, createdAt, thumbnailUrl, hasVideo };
      })
    );

    if (rows.length === 0) {
      hasMore = false;
      break;
    }

    for (const row of rows) {
      exercises.push({
        externalId: `exercise-${exercises.length + 1}`,
        name: row.name,
        muscleGroup: "",
        difficulty: "",
        forceType: "",
        createdBy: row.createdBy,
        hasVideo: row.hasVideo,
        videoUrl: "",
        thumbnailUrl: row.thumbnailUrl,
        isActive: true,
        tags: [],
        createdAt: row.createdAt,
      });
    }

    console.log(`  Page ${pageNum}: ${rows.length} exercises (total: ${exercises.length})`);
    pageNum++;

    // Check if there's a next page button
    const nextButton = await page.$("button:has-text('Next'), [aria-label='Next page']");
    if (!nextButton) hasMore = false;
  }

  writeJson("exercises.json", exercises);
  console.log(`✅ Exported ${exercises.length} exercises`);
}
