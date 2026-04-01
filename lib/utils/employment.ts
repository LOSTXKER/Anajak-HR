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
