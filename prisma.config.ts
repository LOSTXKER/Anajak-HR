// Prisma Configuration for Anajak HR System
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local for local development
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL for migrations (direct connection, no pgbouncer)
    // Prisma Client will use DATABASE_URL for queries (with pgbouncer)
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
