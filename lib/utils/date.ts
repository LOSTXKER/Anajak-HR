/**
 * Date Utilities
 * =============================================
 * Utility functions for handling dates with proper timezone support.
 * 
 * IMPORTANT: When parsing date strings like "YYYY-MM-DD", 
 * new Date() will parse it as UTC midnight which can cause 
 * timezone issues. Always use these helper functions.
 */

import { format } from "date-fns";

/**
 * Parse a date string as local timezone
 * Fixes the issue where "YYYY-MM-DD" is parsed as UTC by default
 * 
 * @param dateStr - Date string in format 'YYYY-MM-DD'
 * @returns Date object in local timezone
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) {
    return new Date();
  }
  
  // If already has time component, parse directly
  if (dateStr.includes("T")) {
    return new Date(dateStr);
  }
  
  // Add T00:00:00 to force local timezone parsing
  return new Date(dateStr + "T00:00:00");
}

/**
 * Format a date to local date string
 * 
 * @param date - Date object or date string
 * @returns Date string in format 'YYYY-MM-DD'
 */
export function formatLocalDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? parseLocalDate(date) : date;
  return format(dateObj, "yyyy-MM-dd");
}

/**
 * Get the day of week for a date string
 * Returns: 0=Sunday, 1=Monday, ..., 6=Saturday
 * 
 * @param dateStr - Date string in format 'YYYY-MM-DD'
 * @returns Day of week number (0-6)
 */
export function getLocalDayOfWeek(dateStr: string): number {
  return parseLocalDate(dateStr).getDay();
}

/**
 * Get today's date as a string in local timezone
 * 
 * @returns Today's date in format 'YYYY-MM-DD'
 */
export function getLocalToday(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Get current timestamp as ISO string
 * 
 * @returns Current timestamp in ISO format
 */
export function getNowISO(): string {
  return new Date().toISOString();
}

/**
 * Check if a date string is in the past (before today)
 * 
 * @param dateStr - Date string in format 'YYYY-MM-DD'
 * @returns true if the date is before today
 */
export function isDateInPast(dateStr: string): boolean {
  const date = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Check if a date string is today
 * 
 * @param dateStr - Date string in format 'YYYY-MM-DD'
 * @returns true if the date is today
 */
export function isDateToday(dateStr: string): boolean {
  return formatLocalDate(dateStr) === getLocalToday();
}

/**
 * Calculate the difference in days between two dates (inclusive)
 * 
 * @param startDateStr - Start date string in format 'YYYY-MM-DD'
 * @param endDateStr - End date string in format 'YYYY-MM-DD'
 * @returns Number of days (inclusive)
 */
export function calculateDaysInclusive(startDateStr: string, endDateStr: string): number {
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  return Math.max(1, diffDays);
}

/**
 * Check if date1 is before date2
 * 
 * @param date1 - First date string in format 'YYYY-MM-DD'
 * @param date2 - Second date string in format 'YYYY-MM-DD'
 * @returns true if date1 is before date2
 */
export function isDateBefore(date1: string, date2: string): boolean {
  return parseLocalDate(date1) < parseLocalDate(date2);
}

/**
 * Check if date1 is after date2
 * 
 * @param date1 - First date string in format 'YYYY-MM-DD'
 * @param date2 - Second date string in format 'YYYY-MM-DD'
 * @returns true if date1 is after date2
 */
export function isDateAfter(date1: string, date2: string): boolean {
  return parseLocalDate(date1) > parseLocalDate(date2);
}

/**
 * Check if two dates are the same day
 * 
 * @param date1 - First date string in format 'YYYY-MM-DD'
 * @param date2 - Second date string in format 'YYYY-MM-DD'
 * @returns true if both dates are the same day
 */
export function isSameDay(date1: string, date2: string): boolean {
  return formatLocalDate(date1) === formatLocalDate(date2);
}
