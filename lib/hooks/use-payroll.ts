"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type {
  Employee,
  Branch,
  PayrollData,
  PayrollSummary,
  PayrollSettings,
  OTDetail,
} from "@/components/admin/payroll/types";
import {
  wasEmployedOnDate,
  wasEmployedDuringPeriod,
  countEmployedWeekdays,
  fetchEmploymentHistory,
  type EmploymentHistoryRecord,
} from "@/lib/utils/employment";

const DEFAULT_SETTINGS: PayrollSettings = {
  work_hours_per_day: 8,
  late_deduction_per_minute: 0,
  days_per_month: 26,
  work_start_time: "09:00",
};

export function usePayroll() {
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [settings, setSettings] = useState<PayrollSettings>(DEFAULT_SETTINGS);
  const [summary, setSummary] = useState<PayrollSummary>({
    totalEmployees: 0,
    totalBasePay: 0,
    totalCommission: 0,
    totalOT1x: 0,
    totalOT15x: 0,
    totalOT2x: 0,
    totalOTPay: 0,
    totalLatePenalty: 0,
    totalPay: 0,
  });

  // OT Detail Modal
  const [showOTModal, setShowOTModal] = useState(false);
  const [selectedOTEmployee, setSelectedOTEmployee] = useState<Employee | null>(
    null
  );
  const [otDetails, setOtDetails] = useState<OTDetail[]>([]);
  const [loadingOT, setLoadingOT] = useState(false);

  const [employmentHistory, setEmploymentHistory] = useState<EmploymentHistoryRecord[]>([]);

  // Fetch base data
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const [, , , history] = await Promise.all([
        fetchEmployees(),
        fetchBranches(),
        fetchSettings(),
        fetchEmploymentHistory(),
      ]);
      if (!cancelled) setEmploymentHistory(history);
    };
    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate payroll when filters change
  useEffect(() => {
    if (employees.length > 0 && employmentHistory.length > 0) {
      calculatePayroll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, selectedEmployee, selectedBranch, employees, settings, searchTerm, employmentHistory]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from("branches")
      .select("id, name")
      .order("name");
    setBranches(data || []);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select(
        "id, name, email, role, branch_id, base_salary, commission, is_system_account"
      )
      .eq("account_status", "approved")
      .neq("role", "admin")
      .order("name");

    const includedEmployees = (data || []).filter(
      (e: Employee & { is_system_account?: boolean }) => !e.is_system_account
    );
    setEmployees(includedEmployees);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "hours_per_day",
        "late_deduction_per_minute",
        "days_per_month",
        "work_start_time",
      ]);

    if (data) {
      const settingsObj: Record<string, string> = {};
      data.forEach((s: { setting_key: string; setting_value: string }) => {
        settingsObj[s.setting_key] = s.setting_value;
      });
      setSettings({
        work_hours_per_day: parseFloat(settingsObj.hours_per_day) || 8,
        late_deduction_per_minute:
          parseFloat(settingsObj.late_deduction_per_minute) || 0,
        days_per_month: parseFloat(settingsObj.days_per_month) || 26,
        work_start_time: settingsObj.work_start_time || "09:00",
      });
    }
  };

  const calculatePayroll = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      // Only include employees who were employed during any day of this period
      let employeesToProcess = employees.filter((e) =>
        wasEmployedDuringPeriod(e.id, startDate, endDate, employmentHistory)
      );

      if (selectedEmployee !== "all") {
        employeesToProcess = employeesToProcess.filter((e) => e.id === selectedEmployee);
      }

      if (selectedBranch !== "all") {
        employeesToProcess = employeesToProcess.filter((e) =>
          selectedBranch === "none"
            ? !e.branch_id
            : e.branch_id === selectedBranch
        );
      }

      const empIds = employeesToProcess.map((e) => e.id);

      // Batch all queries: 5 total calls instead of 4*N
      const [salaryHistoryRes, allAttendanceRes, allOTRes, allLeaveRes, allLateReqRes] = await Promise.all([
        supabase
          .from("salary_history")
          .select("employee_id, base_salary, commission, effective_date")
          .in("employee_id", empIds)
          .lte("effective_date", endDate)
          .order("effective_date", { ascending: false }),
        supabase
          .from("attendance_logs")
          .select("employee_id, status, total_hours, is_late, clock_in_time, late_minutes, work_date")
          .in("employee_id", empIds)
          .gte("work_date", startDate)
          .lte("work_date", endDate),
        supabase
          .from("ot_requests")
          .select("employee_id, actual_ot_hours, ot_amount, ot_rate, request_date")
          .in("employee_id", empIds)
          .in("status", ["approved", "completed"])
          .not("actual_end_time", "is", null)
          .gte("request_date", startDate)
          .lte("request_date", endDate),
        supabase
          .from("leave_requests")
          .select("employee_id, start_date, end_date, is_half_day")
          .in("employee_id", empIds)
          .eq("status", "approved")
          .gte("start_date", startDate)
          .lte("end_date", endDate),
        supabase
          .from("late_requests")
          .select("employee_id, request_date")
          .in("employee_id", empIds)
          .eq("status", "approved")
          .gte("request_date", startDate)
          .lte("request_date", endDate),
      ]);

      // Group data by employee_id
      function groupBy(rows: any[]): Record<string, any[]> {
        const map: Record<string, any[]> = {};
        for (const row of rows) {
          const id = row.employee_id as string;
          (map[id] ??= []).push(row);
        }
        return map;
      }

      const salaryAtMonth: Record<string, { base_salary: number; commission: number }> = {};
      (salaryHistoryRes.data || []).forEach((row: { employee_id: string; base_salary: number; commission: number }) => {
        if (!salaryAtMonth[row.employee_id]) {
          salaryAtMonth[row.employee_id] = {
            base_salary: Number(row.base_salary),
            commission: Number(row.commission),
          };
        }
      });

      const attendanceByEmp = groupBy(allAttendanceRes.data || []);
      const otByEmp = groupBy(allOTRes.data || []);
      const leaveByEmp = groupBy(allLeaveRes.data || []);
      const lateByEmp = groupBy(allLateReqRes.data || []);

      const results = employeesToProcess.map((emp) => {
        const attendance = (attendanceByEmp[emp.id] || []).filter(
          (a: { work_date: string }) => wasEmployedOnDate(emp.id, a.work_date, employmentHistory)
        );
        const otLogs = (otByEmp[emp.id] || []).filter(
          (o: { request_date: string }) => wasEmployedOnDate(emp.id, o.request_date, employmentHistory)
        );
        const leaves = leaveByEmp[emp.id] || [];

        const approvedLateDates = new Set(
          (lateByEmp[emp.id] || []).map(
            (r) => r.request_date
          )
        );

        const workDays = attendance.filter(
          (a: { status: string }) => a.status !== "holiday"
        ).length;
        const totalWorkHours = attendance.reduce(
          (sum: number, a: { total_hours?: number }) =>
            sum + (a.total_hours || 0),
          0
        );
        const lateDays = attendance.filter(
          (a: { is_late: boolean }) => a.is_late
        ).length;

        // Calculate late minutes
        let lateMinutes = 0;
        const [startHour, startMinute] = settings.work_start_time
          .split(":")
          .map(Number);
        const MAX_LATE_MINUTES = 120;

        attendance.forEach(
          (a: {
            is_late: boolean;
            clock_in_time?: string;
            late_minutes?: number;
            work_date: string;
          }) => {
            if (approvedLateDates.has(a.work_date)) return;

            if (a.is_late && a.clock_in_time) {
              if (a.late_minutes && a.late_minutes > 0) {
                lateMinutes += Math.min(a.late_minutes, MAX_LATE_MINUTES);
              } else {
                const clockIn = new Date(a.clock_in_time);
                const clockInTotalMinutes =
                  clockIn.getHours() * 60 + clockIn.getMinutes();
                const workStartTotalMinutes = startHour * 60 + startMinute;

                if (clockInTotalMinutes > workStartTotalMinutes) {
                  const mins = clockInTotalMinutes - workStartTotalMinutes;
                  lateMinutes += Math.min(mins, MAX_LATE_MINUTES);
                }
              }
            }
          }
        );

        // Calculate leave days (exclude weekends, clip to month boundaries)
        let leaveDays = 0;
        const monthStart = new Date(startDate);
        const monthEnd = new Date(endDate);
        leaves.forEach(
          (l: {
            start_date: string;
            end_date: string;
            is_half_day: boolean;
          }) => {
            if (l.is_half_day) {
              leaveDays += 0.5;
            } else {
              // Clip leave dates to current month
              const leaveStart = new Date(l.start_date);
              const leaveEnd = new Date(l.end_date);
              const clippedStart = leaveStart < monthStart ? monthStart : leaveStart;
              const clippedEnd = leaveEnd > monthEnd ? monthEnd : leaveEnd;

              // Count only weekdays
              let days = 0;
              const current = new Date(clippedStart);
              while (current <= clippedEnd) {
                const dayOfWeek = current.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                  days++;
                }
                current.setDate(current.getDate() + 1);
              }
              leaveDays += days;
            }
          }
        );

        // Calculate OT
        let ot1xHours = 0,
          ot1xAmount = 0;
        let ot15xHours = 0,
          ot15xAmount = 0;
        let ot2xHours = 0,
          ot2xAmount = 0;

        otLogs.forEach(
          (ot: {
            actual_ot_hours?: number;
            ot_amount?: number;
            ot_rate?: number;
          }) => {
            const hours = ot.actual_ot_hours || 0;
            const amount = ot.ot_amount || 0;
            const rate = ot.ot_rate || 1.5;

            if (rate <= 1) {
              ot1xHours += hours;
              ot1xAmount += amount;
            } else if (rate <= 1.5) {
              ot15xHours += hours;
              ot15xAmount += amount;
            } else {
              ot2xHours += hours;
              ot2xAmount += amount;
            }
          }
        );

        const otTotalAmount = ot1xAmount + ot15xAmount + ot2xAmount;

        // Resolve salary for this specific month from salary_history
        const historicalSalary = salaryAtMonth[emp.id];
        const historicalBaseSalary = historicalSalary ? historicalSalary.base_salary : (emp.base_salary || 0);
        const historicalCommission = historicalSalary ? historicalSalary.commission : (emp.commission || 0);

        // Prorate using period-overlap weekday count
        const totalWorkingDaysInMonth = settings.days_per_month || 26;
        const employedWorkingDays = countEmployedWeekdays(
          emp.id, startDate, endDate, employmentHistory
        );

        const prorateRatio = Math.min(1, employedWorkingDays / totalWorkingDaysInMonth);
        const basePay = Math.round(historicalBaseSalary * prorateRatio);
        const commission = Math.round(historicalCommission * prorateRatio);
        const latePenalty = lateMinutes * settings.late_deduction_per_minute;
        const totalPay = basePay + commission + otTotalAmount - latePenalty;

        return {
          employee: emp,
          historicalBaseSalary,
          historicalCommission,
          workDays,
          totalWorkHours,
          lateDays,
          lateMinutes,
          leaveDays,
          ot1xHours,
          ot1xAmount,
          ot15xHours,
          ot15xAmount,
          ot2xHours,
          ot2xAmount,
          otTotalAmount,
          basePay,
          commission,
          latePenalty,
          totalPay: Math.max(0, totalPay),
        } as PayrollData;
      });

      const filteredResults = results.filter(
        (r) =>
          r.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.employee.email.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setPayrollData(filteredResults);

      setSummary({
        totalEmployees: filteredResults.length,
        totalBasePay: filteredResults.reduce((sum, r) => sum + r.basePay, 0),
        totalCommission: filteredResults.reduce(
          (sum, r) => sum + r.commission,
          0
        ),
        totalOT1x: filteredResults.reduce((sum, r) => sum + r.ot1xAmount, 0),
        totalOT15x: filteredResults.reduce((sum, r) => sum + r.ot15xAmount, 0),
        totalOT2x: filteredResults.reduce((sum, r) => sum + r.ot2xAmount, 0),
        totalOTPay: filteredResults.reduce(
          (sum, r) => sum + r.otTotalAmount,
          0
        ),
        totalLatePenalty: filteredResults.reduce(
          (sum, r) => sum + r.latePenalty,
          0
        ),
        totalPay: filteredResults.reduce((sum, r) => sum + r.totalPay, 0),
      });
    } catch (error) {
      console.error("Error calculating payroll:", error);
    } finally {
      setLoading(false);
    }
  }, [
    currentMonth,
    selectedEmployee,
    selectedBranch,
    employees,
    settings,
    searchTerm,
    employmentHistory,
  ]);

  const fetchOTDetails = async (emp: Employee) => {
    setSelectedOTEmployee(emp);
    setShowOTModal(true);
    setLoadingOT(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const { data } = await supabase
        .from("ot_requests")
        .select(
          "id, request_date, actual_ot_hours, ot_amount, ot_rate, ot_type, status"
        )
        .eq("employee_id", emp.id)
        .in("status", ["approved", "completed"])
        .not("actual_ot_hours", "is", null)
        .gte("request_date", startDate)
        .lte("request_date", endDate)
        .order("request_date");

      setOtDetails(data || []);
    } catch (error) {
      console.error("Error fetching OT details:", error);
    } finally {
      setLoadingOT(false);
    }
  };

  const exportToCSV = () => {
    if (!payrollData.length) return;

    const headers = [
      "ชื่อพนักงาน",
      "อีเมล",
      "เงินเดือนตั้ง",
      "วันทำงาน",
      "ชั่วโมงทำงาน",
      "วันลา",
      "วันสาย",
      "นาทีสาย",
      "OT รวม (บาท)",
      "เงินเดือนพื้นฐาน",
      "คอมมิชชั่น",
      "หักสาย",
      "รวมเงิน",
    ];

    const rows = payrollData.map((r) => [
      r.employee.name,
      r.employee.email,
      r.employee.base_salary,
      r.workDays,
      r.totalWorkHours.toFixed(1),
      r.leaveDays,
      r.lateDays,
      r.lateMinutes,
      r.otTotalAmount.toFixed(2),
      r.basePay.toFixed(2),
      r.commission.toFixed(2),
      r.latePenalty.toFixed(2),
      r.totalPay.toFixed(2),
    ]);

    const escapeCSV = (val: any) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const csv = [headers.map(escapeCSV).join(","), ...rows.map((r) => r.map(escapeCSV).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `payroll-${format(currentMonth, "yyyy-MM")}.csv`;
    link.click();
  };

  return {
    // Data
    payrollData,
    employees,
    branches,
    summary,
    settings,
    loading,

    // Filters
    currentMonth,
    selectedEmployee,
    selectedBranch,
    searchTerm,

    // OT Modal
    showOTModal,
    selectedOTEmployee,
    otDetails,
    loadingOT,

    // Actions
    setCurrentMonth,
    setSelectedEmployee,
    setSelectedBranch,
    setSearchTerm,
    setShowOTModal,
    fetchOTDetails,
    exportToCSV,
  };
}
