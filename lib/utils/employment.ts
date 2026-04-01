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
