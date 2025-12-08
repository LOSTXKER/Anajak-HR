import { supabase } from "@/lib/supabase/client";

/**
 * Check if a given date is a holiday
 * @param date - Date string in format 'YYYY-MM-DD'
 * @param branchId - Optional branch ID for branch-specific holidays
 * @returns Holiday info if it's a holiday, null otherwise
 */
export async function isHoliday(date: string, branchId?: string) {
  try {
    let query = supabase
      .from("holidays")
      .select("*")
      .eq("date", date)
      .eq("is_active", true);

    // Get public holidays and company-wide holidays
    query = query.or("type.eq.public,type.eq.company");

    // If branch ID is provided, also get branch-specific holidays
    if (branchId) {
      query = query.or(`branch_id.eq.${branchId}`);
    }

    const { data, error } = await query.single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error("Error checking holiday:", error);
    return null;
  }
}

/**
 * Get OT rate multiplier based on OT type and whether it's a holiday
 * @param otType - 'normal', 'holiday', or 'pre_shift'
 * @param date - Date string in format 'YYYY-MM-DD'
 * @param branchId - Optional branch ID
 * @param employeeRates - Employee's custom rates (optional)
 * @returns OT rate multiplier
 */
export async function getOTRate(
  otType: string,
  date: string,
  branchId?: string,
  employeeRates?: { ot_rate_1x?: number; ot_rate_1_5x?: number; ot_rate_2x?: number }
) {
  const holidayInfo = await isHoliday(date, branchId);

  // Default rates
  const defaultRates = {
    ot_rate_1x: employeeRates?.ot_rate_1x || 1.0,
    ot_rate_1_5x: employeeRates?.ot_rate_1_5x || 1.5,
    ot_rate_2x: employeeRates?.ot_rate_2x || 2.0,
  };

  // If it's a holiday, use 2x rate regardless of OT type
  if (holidayInfo) {
    return {
      rate: defaultRates.ot_rate_2x,
      isHoliday: true,
      holidayName: holidayInfo.name,
    };
  }

  // Normal day rates
  switch (otType) {
    case "holiday":
      return { rate: defaultRates.ot_rate_2x, isHoliday: false };
    case "pre_shift":
      return { rate: defaultRates.ot_rate_1x, isHoliday: false };
    case "normal":
    default:
      return { rate: defaultRates.ot_rate_1_5x, isHoliday: false };
  }
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

