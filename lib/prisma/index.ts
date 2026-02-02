/**
 * Prisma Exports
 * ===========================================
 */

export { prisma, default } from "./client";

// Re-export all model types
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
} from "./client";
