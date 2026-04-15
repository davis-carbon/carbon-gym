import { defineConfig } from "prisma/config";

// On Vercel, env vars are injected at build time.
// Locally, load from .env.local.
if (!process.env.DATABASE_URL) {
  try {
    require("dotenv").config({ path: ".env.local" });
  } catch {}
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
