/**
 * Prisma Client Singleton
 * ===========================================
 * Use this for all server-side database operations (API routes)
 * 
 * Note: This bypasses Supabase RLS - handle authorization in code
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

// Re-export types for convenience
export type { 
  employees,
  attendance_logs,
  ot_requests,
  leave_requests,
  wfh_requests,
  field_work_requests,
  late_requests,
  holidays,
  branches,
  announcements,
  announcement_reads,
  system_settings,
  push_subscriptions,
  leave_balances,
  attendance_anomalies,
} from "@prisma/client";
