/**
 * OT Amount Calculator
 * =============================================
 * Single source of truth for all OT amount calculations.
 * Used by: admin create, admin edit, OT end session.
 *
 * Formula:
 *   Hourly Rate = baseSalary ÷ daysPerMonth ÷ hoursPerDay
 *   OT Amount   = otHours × hourlyRate × otRate
 */

import { TIME_CONSTANTS } from "@/lib/constants";

export interface OTCalcParams {
  startTime: string | Date;
  endTime: string | Date;
  baseSalary: number;
  otRate: number;
  daysPerMonth: number;
  hoursPerDay: number;
}

export interface OTCalcResult {
  hours: number;
  hourlyRate: number;
  amount: number | null;
}

export function calculateOTAmount(params: OTCalcParams): OTCalcResult {
  const { startTime, endTime, baseSalary, otRate, daysPerMonth, hoursPerDay } = params;

  const start = typeof startTime === "string" ? new Date(startTime) : startTime;
  const end = typeof endTime === "string" ? new Date(endTime) : endTime;

  const hours = Math.round(
    ((end.getTime() - start.getTime()) / TIME_CONSTANTS.MS_PER_HOUR) * 100
  ) / 100;

  if (baseSalary <= 0 || daysPerMonth <= 0 || hoursPerDay <= 0) {
    return { hours, hourlyRate: 0, amount: null };
  }

  const hourlyRate = baseSalary / daysPerMonth / hoursPerDay;
  const amount = Math.round(hours * hourlyRate * otRate * 100) / 100;

  return { hours, hourlyRate, amount };
}

/**
 * Build ISO datetime string from a date string and HH:mm time, in local timezone
 */
export function buildLocalISO(dateStr: string, timeHHMM: string): string {
  return new Date(`${dateStr}T${timeHHMM}:00`).toISOString();
}
