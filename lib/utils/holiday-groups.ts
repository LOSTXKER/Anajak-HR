/**
 * Holiday Grouping Utility
 * =============================================
 * Groups consecutive holidays with the same name into HolidayGroup objects.
 * Used to display "long holidays" (e.g. Songkran 3 days) as a single visual block.
 */

export interface HolidayGroup {
  /** First holiday's id (for React key) */
  id: string;
  /** All holiday ids in the group */
  ids: string[];
  /** Holiday name */
  name: string;
  /** Start date (YYYY-MM-DD) */
  startDate: string;
  /** End date (YYYY-MM-DD) */
  endDate: string;
  /** Number of days */
  days: number;
  /** Holiday type */
  type: string;
  /** Whether active */
  is_active: boolean;
  /** Original holiday records */
  holidays: HolidayLike[];
}

/** Minimal holiday shape accepted by the grouping function */
export interface HolidayLike {
  id: string;
  date: string;
  name: string;
  type: string;
  is_active: boolean;
  branch_id?: string | null;
  created_at?: string;
}

/**
 * Check if two date strings (YYYY-MM-DD) are consecutive days.
 */
function isConsecutive(dateA: string, dateB: string): boolean {
  const a = new Date(dateA + "T00:00:00");
  const b = new Date(dateB + "T00:00:00");
  const diffMs = b.getTime() - a.getTime();
  return diffMs === 24 * 60 * 60 * 1000;
}

/**
 * Group an array of holidays into HolidayGroup objects.
 * Consecutive dates with the same name are merged into one group.
 * Holidays must be sorted by date ascending before calling this function,
 * or they will be sorted internally.
 */
export function groupHolidays(holidays: HolidayLike[]): HolidayGroup[] {
  if (holidays.length === 0) return [];

  // Sort by date ascending
  const sorted = [...holidays].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const groups: HolidayGroup[] = [];
  let current: HolidayLike[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (curr.name === prev.name && isConsecutive(prev.date, curr.date)) {
      current.push(curr);
    } else {
      groups.push(makeGroup(current));
      current = [curr];
    }
  }

  // Push the last group
  groups.push(makeGroup(current));

  return groups;
}

function makeGroup(holidays: HolidayLike[]): HolidayGroup {
  return {
    id: holidays[0].id,
    ids: holidays.map((h) => h.id),
    name: holidays[0].name,
    startDate: holidays[0].date,
    endDate: holidays[holidays.length - 1].date,
    days: holidays.length,
    type: holidays[0].type,
    is_active: holidays.every((h) => h.is_active),
    holidays,
  };
}
