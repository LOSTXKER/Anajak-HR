/**
 * use-requests-query
 * =============================================
 * Responsible only for fetching and caching request data from Supabase.
 * Extracted from use-requests.ts to keep that file focused on orchestration.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { RequestItem, RequestType, Employee, Holiday, OTSettings } from "@/lib/types/request";
import { processAllRequests } from "@/lib/utils/request-processor";

interface DateRange {
  start: string;
  end: string;
}

interface UseRequestsQueryReturn {
  pendingRequests: RequestItem[];
  allRequests: RequestItem[];
  employees: Employee[];
  holidays: Holiday[];
  otSettings: OTSettings;
  workingDays: number[];
  daysPerMonth: number;
  hoursPerDay: number;
  loading: boolean;
  setPendingRequests: React.Dispatch<React.SetStateAction<RequestItem[]>>;
  setAllRequests: React.Dispatch<React.SetStateAction<RequestItem[]>>;
  fetchPending: () => Promise<void>;
  fetchAll: (dateRange?: DateRange | null) => Promise<void>;
  fetchEmployees: () => Promise<void>;
  fetchSettings: () => Promise<void>;
}

const SELECT_QUERY = "*, employee:employees!employee_id(id, name, email)";

export function useRequestsQuery(): UseRequestsQueryReturn {
  const [pendingRequests, setPendingRequests] = useState<RequestItem[]>([]);
  const [allRequests, setAllRequests] = useState<RequestItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [otSettings, setOtSettings] = useState<OTSettings>({ workday: 1.5, weekend: 1.5, holiday: 2 });
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [daysPerMonth, setDaysPerMonth] = useState<number>(26);
  const [hoursPerDay, setHoursPerDay] = useState<number>(8);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const [otRes, leaveRes, wfhRes, lateRes, fieldWorkRes] = await Promise.all([
        supabase.from("ot_requests").select(SELECT_QUERY).eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("leave_requests").select(SELECT_QUERY).eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("wfh_requests").select(SELECT_QUERY).eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("late_requests").select(SELECT_QUERY).eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("field_work_requests").select(SELECT_QUERY).eq("status", "pending").order("created_at", { ascending: false }),
      ]);

      setPendingRequests(
        processAllRequests(
          otRes.data || [],
          leaveRes.data || [],
          wfhRes.data || [],
          lateRes.data || [],
          fieldWorkRes.data || []
        )
      );
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async (dateRange?: DateRange | null) => {
    setLoading(true);
    try {
      const buildQuery = (table: string, dateCol: string) => {
        let q = supabase.from(table).select(SELECT_QUERY);
        if (dateRange) {
          q = q.gte(dateCol, dateRange.start).lte(dateCol, dateRange.end);
        }
        return q.order("created_at", { ascending: false });
      };

      const [otRes, leaveRes, wfhRes, lateRes, fieldWorkRes] = await Promise.all([
        buildQuery("ot_requests", "request_date"),
        buildQuery("leave_requests", "start_date"),
        buildQuery("wfh_requests", "date"),
        buildQuery("late_requests", "request_date"),
        buildQuery("field_work_requests", "date"),
      ]);

      setAllRequests(
        processAllRequests(
          otRes.data || [],
          leaveRes.data || [],
          wfhRes.data || [],
          lateRes.data || [],
          fieldWorkRes.data || []
        )
      );
    } catch (error) {
      console.error("Error fetching all requests:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, name, email, base_salary")
      .is("deleted_at", null)
      .neq("role", "admin")
      .order("name");
    setEmployees(data || []);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const { data: holidaysData } = await supabase.from("holidays").select("date, name");
      setHolidays(holidaysData || []);

      const { data: settingsData } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["ot_rate_workday", "ot_rate_weekend", "ot_rate_holiday", "working_days", "days_per_month", "hours_per_day"]);

      const settings: Record<string, string> = {};
      settingsData?.forEach((item: any) => { settings[item.setting_key] = item.setting_value; });

      setOtSettings({
        workday: parseFloat(settings.ot_rate_workday) || 1.5,
        weekend: parseFloat(settings.ot_rate_weekend) || 1.5,
        holiday: parseFloat(settings.ot_rate_holiday) || 2,
      });

      if (settings.working_days) {
        setWorkingDays(settings.working_days.split(",").map(Number));
      }

      if (settings.days_per_month) {
        setDaysPerMonth(parseFloat(settings.days_per_month) || 26);
      }
      if (settings.hours_per_day) {
        setHoursPerDay(parseFloat(settings.hours_per_day) || 8);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  }, []);

  return {
    pendingRequests,
    allRequests,
    employees,
    holidays,
    otSettings,
    workingDays,
    daysPerMonth,
    hoursPerDay,
    loading,
    setPendingRequests,
    setAllRequests,
    fetchPending,
    fetchAll,
    fetchEmployees,
    fetchSettings,
  };
}
