/**
 * Application-wide constants
 * =============================================
 * Centralised place for magic numbers, status strings, and delays
 * that were previously scattered across the codebase.
 */

// ─── Time ─────────────────────────────────────────────────

export const TIME_CONSTANTS = {
  MS_PER_SECOND: 1000,
  MS_PER_MINUTE: 1000 * 60,
  MS_PER_HOUR: 1000 * 60 * 60,
  MS_PER_DAY: 1000 * 60 * 60 * 24,

  /** GPS position timeout in ms */
  GPS_TIMEOUT: 15000,

  /** Polling interval for real-time data in ms */
  REFRESH_INTERVAL: 30000,

  /** Clock ticker interval (1 second) */
  CLOCK_INTERVAL: 1000,
} as const;

// ─── UI ───────────────────────────────────────────────────

export const UI_DELAYS = {
  /** Delay (ms) before redirecting after a successful form submission */
  SUCCESS_REDIRECT: 2000,
} as const;

// ─── Request statuses ─────────────────────────────────────

export const REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export type RequestStatusValue = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

// ─── Work modes ───────────────────────────────────────────

export const WORK_MODE = {
  ONSITE: "onsite",
  FIELD: "field",
  WFH: "wfh",
} as const;

// ─── Colors (design-system tokens) ───────────────────────

export const COLORS = {
  SUCCESS: "#34c759",
  ERROR: "#ff3b30",
  WARNING: "#ff9500",
  PRIMARY: "#0071e3",
  SECONDARY: "#86868b",
  SURFACE: "#f5f5f7",
  BACKGROUND: "#fbfbfd",
  BORDER: "#e8e8ed",
  TEXT_PRIMARY: "#1d1d1f",
} as const;
