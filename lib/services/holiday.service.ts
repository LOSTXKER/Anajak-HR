/**
 * Holiday Service
 * =============================================
 * Service for holiday and day type operations
 * Refactored from lib/utils/holiday.ts with better structure
 */

import { supabase } from "@/lib/supabase/client";
import { getSystemSettings } from "./settings.service";
import { parseLocalDate, formatLocalDate } from "@/lib/utils/date";
import type { Holiday, DayType, DayInfo, OTRateInfo } from "@/lib/types";

// Cache for working days
let workingDaysCache: number[] | null = null;
let workingDaysCacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get working days from settings
 * @returns Array of day numbers (1=Monday, ..., 7=Sunday)
 */
export async function getWorkingDays(): Promise<number[]> {
    const now = Date.now();
    if (workingDaysCache && now - workingDaysCacheTimestamp < CACHE_DURATION) {
        return workingDaysCache;
    }

    const settings = await getSystemSettings();
    workingDaysCache = settings.workingDays;
    workingDaysCacheTimestamp = now;
    return workingDaysCache;
}

/**
 * Check if a date is a weekend (non-working day based on settings)
 * @param date - Date string in format 'YYYY-MM-DD'
 */
export async function isWeekend(date: string): Promise<boolean> {
    const workingDays = await getWorkingDays();
    // Use parseLocalDate to avoid UTC parsing issues
    const dateObj = parseLocalDate(date);
    // JavaScript: 0=Sunday, 1=Monday, ..., 6=Saturday
    // Our system: 1=Monday, ..., 7=Sunday
    const dayOfWeek = dateObj.getDay();
    const ourDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    return !workingDays.includes(ourDayOfWeek);
}

/**
 * Check if a date is a holiday
 * @param date - Date string in format 'YYYY-MM-DD'
 * @param branchId - Optional branch ID for branch-specific holidays
 */
export async function isHoliday(date: string, branchId?: string): Promise<Holiday | null> {
    try {
        let typeCondition = "type.eq.public,type.eq.company";
        if (branchId) {
            typeCondition += `,and(type.eq.branch,branch_id.eq.${branchId})`;
        }

        const { data, error } = await supabase
            .from("holidays")
            .select("*")
            .eq("date", date)
            .eq("is_active", true)
            .or(typeCondition)
            .limit(1)
            .maybeSingle();

        if (error) return null;
        return data || null;
    } catch {
        return null;
    }
}

/**
 * Get day type for a given date
 * @param date - Date string in format 'YYYY-MM-DD'
 * @param branchId - Optional branch ID
 */
export async function getDayType(date: string, branchId?: string): Promise<DayInfo> {
    // Check holiday first (highest priority)
    const holiday = await isHoliday(date, branchId);
    if (holiday) {
        return { type: "holiday", holidayName: holiday.name };
    }

    // Check weekend
    const weekend = await isWeekend(date);
    if (weekend) {
        return { type: "weekend" };
    }

    return { type: "workday" };
}

/**
 * Get OT rate information for a given date
 * @param date - Date string in format 'YYYY-MM-DD'
 * @param branchId - Optional branch ID
 */
export async function getOTRateForDate(date: string, branchId?: string): Promise<OTRateInfo> {
    const dayType = await getDayType(date, branchId);
    const settings = await getSystemSettings();

    // Simplified logic:
    // - Holiday/Weekend: No check-in required (OT start = arrival)
    // - Workday: Must check-in first (already at work)

    switch (dayType.type) {
        case "holiday":
            return {
                rate: settings.otRateHoliday,
                type: "holiday",
                typeName: `วันหยุดนักขัตฤกษ์ (${dayType.holidayName})`,
                requireCheckin: false, // Never require check-in for holidays
                holidayName: dayType.holidayName,
            };
        case "weekend":
            return {
                rate: settings.otRateWeekend,
                type: "weekend",
                typeName: "วันหยุดสุดสัปดาห์",
                requireCheckin: false, // Never require check-in for weekends
            };
        case "workday":
        default:
            return {
                rate: settings.otRateWorkday,
                type: "workday",
                typeName: "วันทำงานปกติ",
                requireCheckin: true, // Always require check-in for workdays
            };
    }
}

/**
 * Get all holidays for a date range
 * @param startDate - Start date in format 'YYYY-MM-DD'
 * @param endDate - End date in format 'YYYY-MM-DD'
 * @param branchId - Optional branch ID
 */
export async function getHolidaysInRange(
    startDate: string,
    endDate: string,
    branchId?: string
): Promise<Holiday[]> {
    try {
        let query = supabase
            .from("holidays")
            .select("*")
            .gte("date", startDate)
            .lte("date", endDate)
            .eq("is_active", true)
            .order("date");

        if (branchId) {
            query = query.or(`type.eq.public,type.eq.company,and(type.eq.branch,branch_id.eq.${branchId})`);
        } else {
            query = query.or("type.eq.public,type.eq.company");
        }

        const { data, error } = await query;

        if (error) throw error;
        return (data || []) as Holiday[];
    } catch {
        return [];
    }
}

/**
 * Get today's holiday if any
 * @param branchId - Optional branch ID
 */
export async function getTodayHoliday(branchId?: string): Promise<Holiday | null> {
    const today = formatLocalDate(new Date());
    return isHoliday(today, branchId);
}

/**
 * Get upcoming holidays (next N days)
 * @param days - Number of days to look ahead (default: 30)
 * @param limit - Maximum number of results (default: 5)
 * @param branchId - Optional branch ID
 */
export async function getUpcomingHolidays(
    days: number = 30,
    limit: number = 5,
    branchId?: string
): Promise<Holiday[]> {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const startStr = formatLocalDate(today);
    const endStr = formatLocalDate(endDate);

    try {
        let query = supabase
            .from("holidays")
            .select("*")
            .gte("date", startStr)
            .lte("date", endStr)
            .eq("is_active", true)
            .order("date")
            .limit(limit);

        if (branchId) {
            query = query.or(`type.eq.public,type.eq.company,and(type.eq.branch,branch_id.eq.${branchId})`);
        } else {
            query = query.or("type.eq.public,type.eq.company");
        }

        const { data, error } = await query;

        if (error) throw error;
        return (data || []) as Holiday[];
    } catch {
        return [];
    }
}

/**
 * Check if a date is a working day
 * @param date - Date string in format 'YYYY-MM-DD'
 * @param branchId - Optional branch ID
 */
export async function isWorkingDay(date: string, branchId?: string): Promise<boolean> {
    const dayInfo = await getDayType(date, branchId);
    return dayInfo.type === "workday";
}

/**
 * Calculate OT amount
 * @param hours - Number of OT hours
 * @param baseSalaryRate - Employee's hourly rate
 * @param otRate - OT rate multiplier
 */
export function calculateOTAmount(hours: number, baseSalaryRate: number, otRate: number): number {
    return hours * baseSalaryRate * otRate;
}

/**
 * Clear holiday cache
 */
export function invalidateHolidayCache(): void {
    workingDaysCache = null;
    workingDaysCacheTimestamp = 0;
}
