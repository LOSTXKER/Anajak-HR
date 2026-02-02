/**
 * Holiday Utilities
 * =============================================
 * This file re-exports functions from holiday.service.ts
 * for backward compatibility.
 * 
 * @deprecated Use lib/services/holiday.service.ts directly instead.
 */

import { supabase } from "@/lib/supabase/client";
import { parseLocalDate } from "./date";

// Re-export some functions from service (that are not defined locally)
export {
  getTodayHoliday,
  getUpcomingHolidays,
  isWorkingDay,
} from "@/lib/services/holiday.service";

/**
 * Get working days from settings
 * @returns Array of working day numbers (1=Monday, ..., 7=Sunday)
 * @deprecated Use getWorkingDays from lib/services/holiday.service.ts instead
 */
export async function getWorkingDays(): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "working_days")
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (data?.setting_value) {
      return data.setting_value.split(",").map(Number).filter(Boolean);
    }

    // Default: Monday-Friday
    return [1, 2, 3, 4, 5];
  } catch (error) {
    console.error("Error getting working days:", error);
    return [1, 2, 3, 4, 5];
  }
}

/**
 * Check if a given date is a weekend (non-working day)
 * @param date - Date string in format 'YYYY-MM-DD'
 * @returns true if it's a weekend
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
 * Check if a given date is a holiday
 * @param date - Date string in format 'YYYY-MM-DD'
 * @param branchId - Optional branch ID for branch-specific holidays
 * @returns Holiday info if it's a holiday, null otherwise
 */
export async function isHoliday(date: string, branchId?: string) {
  try {
    // Build OR condition for type
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

    if (error) {
      console.error("Error checking holiday:", error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("Error checking holiday:", error);
    return null;
  }
}

/**
 * Get day type for a given date
 * @param date - Date string in format 'YYYY-MM-DD'
 * @param branchId - Optional branch ID
 * @returns 'holiday' | 'weekend' | 'workday'
 */
export async function getDayType(
  date: string,
  branchId?: string
): Promise<{ type: "holiday" | "weekend" | "workday"; holidayName?: string }> {
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
 * Get OT settings from database
 */
export async function getOTSettings() {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "ot_rate_workday",
        "ot_rate_weekend",
        "ot_rate_holiday",
        "ot_require_checkin_workday",
        "ot_require_checkin_weekend",
        "ot_require_checkin_holiday",
      ]);

    if (error) throw error;

    const settings: Record<string, string> = {};
    data?.forEach((item: any) => {
      settings[item.setting_key] = item.setting_value;
    });

    return {
      otRateWorkday: parseFloat(settings.ot_rate_workday) || 1.5,
      otRateWeekend: parseFloat(settings.ot_rate_weekend) || 1.5,
      otRateHoliday: parseFloat(settings.ot_rate_holiday) || 2.0,
      requireCheckinWorkday: settings.ot_require_checkin_workday !== "false",
      requireCheckinWeekend: settings.ot_require_checkin_weekend === "true",
      requireCheckinHoliday: settings.ot_require_checkin_holiday === "true",
    };
  } catch (error) {
    console.error("Error getting OT settings:", error);
    return {
      otRateWorkday: 1.5,
      otRateWeekend: 1.5,
      otRateHoliday: 2.0,
      requireCheckinWorkday: true,
      requireCheckinWeekend: false,
      requireCheckinHoliday: false,
    };
  }
}

/**
 * Get OT rate multiplier based on date
 * @param date - Date string in format 'YYYY-MM-DD'
 * @param branchId - Optional branch ID
 * @returns OT rate info including rate, type, and whether check-in is required
 */
export async function getOTRateForDate(
  date: string,
  branchId?: string
) {
  const dayType = await getDayType(date, branchId);
  const settings = await getOTSettings();

  // Simplified logic:
  // - Holiday/Weekend: No check-in required (OT start = arrival)
  // - Workday: Must check-in first (already at work)

  switch (dayType.type) {
    case "holiday":
      return {
        rate: settings.otRateHoliday,
        type: "holiday" as const,
        typeName: `วันหยุดนักขัตฤกษ์ (${dayType.holidayName})`,
        requireCheckin: false, // Never require check-in for holidays
        holidayName: dayType.holidayName,
      };
    case "weekend":
      return {
        rate: settings.otRateWeekend,
        type: "weekend" as const,
        typeName: "วันหยุดสุดสัปดาห์",
        requireCheckin: false, // Never require check-in for weekends
      };
    case "workday":
    default:
      return {
        rate: settings.otRateWorkday,
        type: "workday" as const,
        typeName: "วันทำงานปกติ",
        requireCheckin: true, // Always require check-in for workdays
      };
  }
}

/**
 * Get OT rate multiplier based on OT type and whether it's a holiday
 * @deprecated Use getOTRateForDate instead
 */
export async function getOTRate(
  otType: string,
  date: string,
  branchId?: string,
  employeeRates?: { ot_rate_1x?: number; ot_rate_1_5x?: number; ot_rate_2x?: number }
) {
  const rateInfo = await getOTRateForDate(date, branchId);

  return {
    rate: rateInfo.rate,
    isHoliday: rateInfo.type === "holiday",
    isWeekend: rateInfo.type === "weekend",
    holidayName: rateInfo.holidayName,
    requireCheckin: rateInfo.requireCheckin,
  };
}

/**
 * Calculate OT amount
 * @param hours - Number of OT hours
 * @param baseSalaryRate - Employee's base hourly rate
 * @param otRate - OT rate multiplier
 * @returns OT amount in baht
 */
export function calculateOTAmount(hours: number, baseSalaryRate: number, otRate: number) {
  return hours * baseSalaryRate * otRate;
}

/**
 * Get all holidays for a date range
 * @param startDate - Start date in format 'YYYY-MM-DD'
 * @param endDate - End date in format 'YYYY-MM-DD'
 * @param branchId - Optional branch ID
 * @returns Array of holidays
 */
export async function getHolidaysInRange(
  startDate: string,
  endDate: string,
  branchId?: string
) {
  try {
    let query = supabase
      .from("holidays")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("is_active", true)
      .order("date");

    // Filter by public and company holidays, and branch-specific if provided
    if (branchId) {
      query = query.or(`type.eq.public,type.eq.company,and(type.eq.branch,branch_id.eq.${branchId})`);
    } else {
      query = query.or("type.eq.public,type.eq.company");
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return [];
  }
}
