/**
 * Request Fetching Hook
 * =============================================
 * Hook for fetching requests, employees, and settings
 */

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { format, getDay } from "date-fns";
import {
  RequestItem,
  Employee,
  Holiday,
  OTSettings,
  OTRateInfo,
} from "@/lib/types/request";
import { processAllRequests } from "@/lib/utils/request-processor";

interface DateRange {
  start: string;
  end: string;
}

interface UseRequestFetchingOptions {
  dateRange?: DateRange;
}

interface UseRequestFetchingReturn {
  // Data
  requests: RequestItem[];
  employees: Employee[];
  holidays: Holiday[];
  otSettings: OTSettings;
  workingDays: number[];
  loading: boolean;
  detectedOTInfo: OTRateInfo | null;

  // Actions
  fetchRequests: () => Promise<void>;
  fetchEmployees: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  detectOTRate: (dateStr: string) => OTRateInfo;
  setRequests: React.Dispatch<React.SetStateAction<RequestItem[]>>;
}

const defaultDateRange: DateRange = {
  start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  end: format(new Date(), "yyyy-MM-dd"),
};

export function useRequestFetching(
  options: UseRequestFetchingOptions = {}
): UseRequestFetchingReturn {
  const { dateRange = defaultDateRange } = options;

  // Data state
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [otSettings, setOtSettings] = useState<OTSettings>({
    workday: 1.5,
    weekend: 1.5,
    holiday: 2,
  });
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [loading, setLoading] = useState(true);
  const [detectedOTInfo, setDetectedOTInfo] = useState<OTRateInfo | null>(null);

  // Fetch all requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [otRes, leaveRes, wfhRes, lateRes, fieldWorkRes] = await Promise.all([
        supabase
          .from("ot_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("request_date", dateRange.start)
          .lte("request_date", dateRange.end)
          .order("created_at", { ascending: false }),
        supabase
          .from("leave_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("start_date", dateRange.start)
          .lte("start_date", dateRange.end)
          .order("created_at", { ascending: false }),
        supabase
          .from("wfh_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("date", dateRange.start)
          .lte("date", dateRange.end)
          .order("created_at", { ascending: false }),
        supabase
          .from("late_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("request_date", dateRange.start)
          .lte("request_date", dateRange.end)
          .order("created_at", { ascending: false }),
        supabase
          .from("field_work_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("date", dateRange.start)
          .lte("date", dateRange.end)
          .order("created_at", { ascending: false }),
      ]);

      const allRequests = processAllRequests(
        otRes.data || [],
        leaveRes.data || [],
        wfhRes.data || [],
        lateRes.data || [],
        fieldWorkRes.data || []
      );

      setRequests(allRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, name, email, base_salary")
      .is("deleted_at", null)
      .neq("role", "admin")
      .order("name");
    setEmployees(data || []);
  }, []);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const { data: holidaysData } = await supabase
        .from("holidays")
        .select("date, name");
      setHolidays(holidaysData || []);

      const { data: settingsData } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "ot_rate_workday",
          "ot_rate_weekend",
          "ot_rate_holiday",
          "working_days",
        ]);

      const settings: Record<string, string> = {};
      settingsData?.forEach((item: any) => {
        settings[item.setting_key] = item.setting_value;
      });

      setOtSettings({
        workday: parseFloat(settings.ot_rate_workday) || 1.5,
        weekend: parseFloat(settings.ot_rate_weekend) || 1.5,
        holiday: parseFloat(settings.ot_rate_holiday) || 2,
      });

      if (settings.working_days) {
        setWorkingDays(settings.working_days.split(",").map(Number));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  }, []);

  // Detect OT rate
  const detectOTRate = useCallback(
    (dateStr: string): OTRateInfo => {
      const date = new Date(dateStr);
      const dayOfWeek = getDay(date);
      const dayOfWeekISO = dayOfWeek === 0 ? 7 : dayOfWeek;

      // Check if holiday
      const holiday = holidays.find((h) => h.date === dateStr);
      if (holiday) {
        const info: OTRateInfo = {
          rate: otSettings.holiday,
          type: "holiday",
          typeName: `วันหยุดนักขัตฤกษ์ (${holiday.name})`,
          holidayName: holiday.name,
        };
        setDetectedOTInfo(info);
        return info;
      }

      // Check if weekend
      if (!workingDays.includes(dayOfWeekISO)) {
        const info: OTRateInfo = {
          rate: otSettings.weekend,
          type: "weekend",
          typeName: "วันหยุดสุดสัปดาห์",
        };
        setDetectedOTInfo(info);
        return info;
      }

      // Workday
      const info: OTRateInfo = {
        rate: otSettings.workday,
        type: "workday",
        typeName: "วันทำงานปกติ",
      };
      setDetectedOTInfo(info);
      return info;
    },
    [holidays, otSettings, workingDays]
  );

  // Initial fetch
  useEffect(() => {
    fetchRequests();
    fetchEmployees();
    fetchSettings();
  }, [fetchRequests, fetchEmployees, fetchSettings]);

  return {
    // Data
    requests,
    employees,
    holidays,
    otSettings,
    workingDays,
    loading,
    detectedOTInfo,

    // Actions
    fetchRequests,
    fetchEmployees,
    fetchSettings,
    detectOTRate,
    setRequests,
  };
}
