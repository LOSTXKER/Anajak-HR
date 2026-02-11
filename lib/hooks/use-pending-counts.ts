/**
 * Pending Counts Hook
 * =============================================
 * Hook to fetch pending counts for admin sidebar
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { REQUEST_STATUS, ACCOUNT_STATUS } from "@/lib/constants/status";

interface PendingCounts {
  employees: number;
  ot: number;
  leave: number;
  wfh: number;
  fieldWork: number;
  late: number;
  total: number;
}

/**
 * Hook to get pending request counts for admin dashboard/sidebar
 */
export function usePendingCounts() {
  const [counts, setCounts] = useState<PendingCounts>({
    employees: 0,
    ot: 0,
    leave: 0,
    wfh: 0,
    fieldWork: 0,
    late: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all pending counts in parallel
      const [employeesRes, otRes, leaveRes, wfhRes, fieldWorkRes, lateRes] =
        await Promise.all([
          supabase
            .from("employees")
            .select("id", { count: "exact", head: true })
            .eq("account_status", ACCOUNT_STATUS.PENDING)
            .is("deleted_at", null),
          supabase
            .from("ot_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", REQUEST_STATUS.PENDING),
          supabase
            .from("leave_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", REQUEST_STATUS.PENDING),
          supabase
            .from("wfh_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", REQUEST_STATUS.PENDING),
          supabase
            .from("field_work_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", REQUEST_STATUS.PENDING),
          supabase
            .from("late_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", REQUEST_STATUS.PENDING),
        ]);

      const newCounts = {
        employees: employeesRes.count || 0,
        ot: otRes.count || 0,
        leave: leaveRes.count || 0,
        wfh: wfhRes.count || 0,
        fieldWork: fieldWorkRes.count || 0,
        late: lateRes.count || 0,
        total: 0,
      };

      newCounts.total =
        newCounts.employees +
        newCounts.ot +
        newCounts.leave +
        newCounts.wfh +
        newCounts.fieldWork +
        newCounts.late;

      setCounts(newCounts);
    } catch (err: any) {
      console.error("Error fetching pending counts:", err);
      setError(err.message || "Failed to fetch pending counts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();

    // Optionally set up realtime subscription
    // const subscription = supabase.channel('pending-counts')...
    // return () => subscription.unsubscribe();
  }, []);

  return {
    counts,
    isLoading,
    error,
    refetch: fetchCounts,
  };
}
