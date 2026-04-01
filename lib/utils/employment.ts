import { supabase } from "@/lib/supabase/client";

export interface EmploymentHistoryRecord {
  employee_id: string;
  action: string;
  effective_date: string;
}

/**
 * Determine whether an employee was actively employed on a given date
 * by walking their employment_history events in chronological order.
 *
 * If no history exists the employee is assumed to have always been employed.
 * The effective_date of a "resigned"/"terminated" event is the first day
 * the employee is NO LONGER employed.
 */
export function wasEmployedOnDate(
  empId: string,
  dateStr: string,
  history: EmploymentHistoryRecord[]
): boolean {
  const empHistory = history
    .filter((h) => h.employee_id === empId)
    .sort((a, b) =>
      a.effective_date.slice(0, 10).localeCompare(b.effective_date.slice(0, 10))
    );

  if (empHistory.length === 0) return true;

  let active = true;
  for (const event of empHistory) {
    const effDate = event.effective_date.slice(0, 10);
    if (effDate > dateStr) break;
    if (event.action === "hired" || event.action === "rehired") {
      active = true;
    } else if (event.action === "resigned" || event.action === "terminated") {
      active = false;
    }
  }
  return active;
}

/**
 * Check if an employee was employed on ANY day within a date range.
 * Used to filter employee lists so resigned employees still appear
 * in payroll/reports/attendance for months they were active.
 */
export function wasEmployedDuringPeriod(
  empId: string,
  startDate: string,
  endDate: string,
  history: EmploymentHistoryRecord[]
): boolean {
  const empHistory = history
    .filter((h) => h.employee_id === empId)
    .sort((a, b) =>
      a.effective_date.slice(0, 10).localeCompare(b.effective_date.slice(0, 10))
    );

  // No history = always employed
  if (empHistory.length === 0) return true;

  // Build active periods: [start, end) pairs
  let periodStart: string | null = null;
  const periods: { from: string; to: string | null }[] = [];

  for (const event of empHistory) {
    const d = event.effective_date.slice(0, 10);
    if (event.action === "hired" || event.action === "rehired") {
      if (!periodStart) periodStart = d;
    } else if (event.action === "resigned" || event.action === "terminated") {
      if (periodStart) {
        periods.push({ from: periodStart, to: d });
        periodStart = null;
      }
    }
  }
  // Still employed — open-ended period
  if (periodStart) {
    periods.push({ from: periodStart, to: null });
  }

  // If no periods could be built (e.g. only resign events without hire),
  // assume employed from the start up to the first resign
  if (periods.length === 0) {
    const firstResign = empHistory.find(
      (h) => h.action === "resigned" || h.action === "terminated"
    );
    if (firstResign) {
      periods.push({ from: "0000-01-01", to: firstResign.effective_date.slice(0, 10) });
    } else {
      return true;
    }
  }

  // Check if any active period overlaps with [startDate, endDate]
  for (const p of periods) {
    const periodEnd = p.to ?? "9999-12-31";
    // Overlap: period.from < endDate+1 AND periodEnd > startDate
    if (p.from <= endDate && periodEnd > startDate) {
      return true;
    }
  }

  return false;
}

/**
 * Count weekdays an employee was employed within [startDate, endDate].
 * Uses period-overlap math instead of checking each day individually.
 */
export function countEmployedWeekdays(
  empId: string,
  startDate: string,
  endDate: string,
  history: EmploymentHistoryRecord[]
): number {
  const empHistory = history
    .filter((h) => h.employee_id === empId)
    .sort((a, b) =>
      a.effective_date.slice(0, 10).localeCompare(b.effective_date.slice(0, 10))
    );

  // No history = employed the entire range
  if (empHistory.length === 0) {
    return countWeekdaysInRange(startDate, endDate);
  }

  // Build active periods [from, to) -- to is exclusive (first day NOT employed)
  let periodStart: string | null = null;
  const periods: { from: string; to: string | null }[] = [];

  for (const event of empHistory) {
    const d = event.effective_date.slice(0, 10);
    if (event.action === "hired" || event.action === "rehired") {
      if (!periodStart) periodStart = d;
    } else if (event.action === "resigned" || event.action === "terminated") {
      if (periodStart) {
        periods.push({ from: periodStart, to: d });
        periodStart = null;
      }
    }
  }
  if (periodStart) {
    periods.push({ from: periodStart, to: null });
  }

  if (periods.length === 0) {
    const firstResign = empHistory.find(
      (h) => h.action === "resigned" || h.action === "terminated"
    );
    if (firstResign) {
      periods.push({ from: "0000-01-01", to: firstResign.effective_date.slice(0, 10) });
    } else {
      return countWeekdaysInRange(startDate, endDate);
    }
  }

  let total = 0;
  for (const p of periods) {
    const pEnd = p.to ?? "9999-12-31";
    // Clamp period to [startDate, endDate]
    const clampedFrom = p.from > startDate ? p.from : startDate;
    // to is exclusive, so last employed day = day before "to"
    const lastDay = pEnd <= endDate ? dayBefore(pEnd) : endDate;
    if (clampedFrom <= lastDay) {
      total += countWeekdaysInRange(clampedFrom, lastDay);
    }
  }
  return total;
}

function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function countWeekdaysInRange(from: string, to: string): number {
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  if (start > end) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Fetch all employment_history records relevant for period filtering.
 * Returns rows sorted by effective_date ascending.
 */
export async function fetchEmploymentHistory(): Promise<
  EmploymentHistoryRecord[]
> {
  const { data } = await supabase
    .from("employment_history")
    .select("employee_id, action, effective_date")
    .in("action", ["hired", "resigned", "terminated", "rehired"])
    .order("effective_date", { ascending: true });
  return data || [];
}
