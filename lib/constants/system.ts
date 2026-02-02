/**
 * System Constants
 * =============================================
 * System-wide constants and configuration values
 */

/**
 * System user email for auto-approved requests
 */
export const SYSTEM_USER_EMAIL = "system@anajak.com";

/**
 * Default pagination limits
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * File upload limits
 */
export const FILE_LIMITS = {
  MAX_FILE_SIZE_MB: 5,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  ALLOWED_DOCUMENT_TYPES: ["application/pdf", "image/jpeg", "image/png"],
} as const;

/**
 * Time-related constants
 */
export const TIME_CONSTANTS = {
  MILLISECONDS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_WEEK: 7,
} as const;

/**
 * Cache durations (in milliseconds)
 */
export const CACHE_DURATION = {
  SHORT: 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
} as const;
