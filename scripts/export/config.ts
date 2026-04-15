import path from "path";

export const CONFIG = {
  baseUrl: "https://home.carbontc.co/ex4",
  outputDir: path.resolve(__dirname, "../../data-export"),
  // Delays to avoid rate limiting
  pageLoadDelay: 2000,
  actionDelay: 500,
  // User data dir for persistent browser context (reuses your Chrome login)
  userDataDir: path.resolve(__dirname, "../../.carbon-gym-playwright-profile"),
};
