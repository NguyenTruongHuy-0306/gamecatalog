import "dotenv/config";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local values, overriding .env (Next.js convention)
dotenv.config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations require a direct (non-pooled) connection for advisory lock support.
    // Set DIRECT_DATABASE_URL to the Neon direct URL (hostname without -pooler).
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL,
  },
});
