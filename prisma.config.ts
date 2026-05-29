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
    url: process.env.DATABASE_URL,
  },
});
