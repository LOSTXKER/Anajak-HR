"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
} from "date-fns";
import { th } from "date-fns/locale";
import type {
  Branch,
  Employee,
  AttendanceLog,
  OTRequest,
  LeaveRequest,
  WFHRequest,
  EmployeeReport,
  ReportSummary,
  DailyStat,
  BranchStat,
  OTTypeStat,
} from "@/components/admin/reports/types";

interface UseReportDataOptions {
  currentMonth: Date;
  searchTerm: string;
  selectedBranch: string;
  selectedRole: string;
}

export function useReportData({
  currentMonth,
  searchTerm,
  selectedBranch,
  selectedRole,
}: UseReportDataOptions) {
  // State
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [otRequests, setOtRequests] = useState<OTRequest[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [wfhRequests, setWfhRequests] = useState<WFHRequest[]>([]);
  const [approvedLateRequests, setApprovedLateRequests] = useState<
    { employee_id: string; request_date: string }[]
  >([]);

  // Fetch branches on mount
  useEffect(() => {
    const fetchBranches = async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Error fetching branches:", error);
      }
      setBranches(data || []);
    };
    fetchBranches();
  }, []);

  // Main data fetch
  const fetchAllData = useCallback(async () => {
    setLoading(true);

    try {
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);
      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");

      const [employeesRes, attendanceRes, otRes, leaveRes, wfhRes, lateReqRes] =
        await Promise.all([
          supabase
            .from("employees")
            .select("id, name, email, role, branch_id")
            .eq("account_status", "approved")
            .is("deleted_at", null)
            .neq("role", "admin"),
          supabase
            .from("attendance_logs")
            .select("*")
            .gte("work_date", startStr)
            .lte("work_date", endStr),
          supabase
            .from("ot_requests")
            .select("*")
            .in("status", ["approved", "completed"])
            .gte("request_date", startStr)
            .lte("request_date", endStr),
          supabase
            .from("leave_requests")
            .select("*")
            .eq("status", "approved")
            .lte("start_date", endStr)
            .gte("end_date", startStr),
          supabase
            .from("wfh_requests")
            .select("*")
            .eq("status", "approved")
            .gte("date", startStr)
            .lte("date", endStr),
          supabase
            .from("late_requests")
            .select("employee_id, request_date")
            .eq("status", "approved")
            .gte("request_date", startStr)
            .lte("request_date", endStr),
        ]);

      setEmployees(employeesRes.data || []);
      setAttendanceLogs(attendanceRes.data || []);
      setOtRequests(otRes.data || []);
      setLeaveRequests(leaveRes.data || []);
      setWfhRequests(wfhRes.data || []);
      setApprovedLateRequests(lateReqRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  // Fetch when month changes
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Get branch name helper
  const getBranchName = useCallback(
    (branchId: string | null): string => {
      if (!branchId) return "ไม่ระบุสาขา";
      const branch = branches.find((b) => b.id === branchId);
      return branch?.name || "ไม่ระบุสาขา";
    },
    [branches]
  );

  // Calculate report for each employee
  const employeeReports = useMemo((): EmployeeReport[] => {
    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);

    return employees.map((emp) => {
      const empAttendance = attendanceLogs.filter(
        (a) => a.employee_id === emp.id
      );
      const empOT = otRequests.filter((o) => o.employee_id === emp.id);
      const empLeave = leaveRequests.filter((l) => l.employee_id === emp.id);
      const empWFH = wfhRequests.filter((w) => w.employee_id === emp.id);

      // Build set of approved late dates for this employee
      const empApprovedLateDates = new Set(
        approvedLateRequests
          .filter((r) => r.employee_id === emp.id)
          .map((r) => r.request_date)
      );

      const workDays = empAttendance.filter(
        (a) => a.status === "present" || a.status === "wfh"
      ).length;

      const workHours = empAttendance.reduce(
        (sum, a) => sum + (a.total_hours || 0),
        0
      );

      const lateDays = empAttendance.filter(
        (a) => a.is_late && !empApprovedLateDates.has(a.work_date)
      ).length;
      const lateMinutes = empAttendance.reduce(
        (sum, a) =>
          sum +
          (a.is_late && !empApprovedLateDates.has(a.work_date)
            ? a.late_minutes || 0
            : 0),
        0
      );

      let leaveDays = 0;
      empLeave.forEach((leave) => {
        if (leave.is_half_day) {
          leaveDays += 0.5;
        } else {
          const leaveStart = new Date(leave.start_date);
          const leaveEnd = new Date(leave.end_date);
          const effectiveStart = leaveStart < startDate ? startDate : leaveStart;
          const effectiveEnd = leaveEnd > endDate ? endDate : leaveEnd;

          let days = 0;
          const current = new Date(effectiveStart);
          while (current <= effectiveEnd) {
            if (!isWeekend(current)) {
              days++;
            }
            current.setDate(current.getDate() + 1);
          }
          leaveDays += days;
        }
      });

      let wfhDays = 0;
      empWFH.forEach((w) => {
        wfhDays += w.is_half_day ? 0.5 : 1;
      });

      let otHours = 0;
      let otAmount = 0;
      empOT.forEach((ot) => {
        const hours = ot.actual_ot_hours ?? ot.approved_ot_hours ?? 0;
        otHours += hours;
        otAmount += ot.ot_amount || 0;
      });

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        branch_id: emp.branch_id,
        branchName: getBranchName(emp.branch_id),
        workDays,
        workHours,
        lateDays,
        lateMinutes,
        leaveDays,
        wfhDays,
        otHours,
        otAmount,
      };
    });
  }, [
    employees,
    attendanceLogs,
    otRequests,
    leaveRequests,
    wfhRequests,
    approvedLateRequests,
    currentMonth,
    getBranchName,
  ]);

  // Filter reports
  const filteredReports = useMemo(() => {
    return employeeReports.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchBranch =
        selectedBranch === "all" ||
        (selectedBranch === "none" && !r.branch_id) ||
        r.branch_id === selectedBranch;

      const matchRole = selectedRole === "all" || r.role === selectedRole;

      return matchSearch && matchBranch && matchRole;
    });
  }, [employeeReports, searchTerm, selectedBranch, selectedRole]);

  // Summary stats
  const summary = useMemo((): ReportSummary => {
    return {
      totalEmployees: filteredReports.length,
      totalWorkDays: filteredReports.reduce((sum, r) => sum + r.workDays, 0),
      totalWorkHours: filteredReports.reduce((sum, r) => sum + r.workHours, 0),
      totalLateDays: filteredReports.reduce((sum, r) => sum + r.lateDays, 0),
      totalLeaveDays: filteredReports.reduce((sum, r) => sum + r.leaveDays, 0),
      totalWFHDays: filteredReports.reduce((sum, r) => sum + r.wfhDays, 0),
      totalOTHours: filteredReports.reduce((sum, r) => sum + r.otHours, 0),
      totalOTAmount: filteredReports.reduce((sum, r) => sum + r.otAmount, 0),
    };
  }, [filteredReports]);

  // Daily stats for chart
  const dailyStats = useMemo((): DailyStat[] => {
    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Build set of approved late keys (employee_id + date) for quick lookup
    const approvedLateKeys = new Set(
      approvedLateRequests.map((r) => `${r.employee_id}:${r.request_date}`)
    );

    return days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");

      const dayAttendance = attendanceLogs.filter(
        (a) => a.work_date === dateStr
      );
      const dayOT = otRequests.filter((o) => o.request_date === dateStr);
      const dayLeave = leaveRequests.filter(
        (l) => l.start_date <= dateStr && l.end_date >= dateStr
      );
      const dayWFH = wfhRequests.filter((w) => w.date === dateStr);

      return {
        date: format(day, "d", { locale: th }),
        fullDate: dateStr,
        attendance: dayAttendance.length,
        late: dayAttendance.filter(
          (a) => a.is_late && !approvedLateKeys.has(`${a.employee_id}:${dateStr}`)
        ).length,
        otHours: dayOT.reduce(
          (sum, o) => sum + (o.actual_ot_hours ?? o.approved_ot_hours ?? 0),
          0
        ),
        leave: dayLeave.length,
        wfh: dayWFH.length,
      };
    });
  }, [attendanceLogs, otRequests, leaveRequests, wfhRequests, approvedLateRequests, currentMonth]);

  // Branch stats
  const branchStats = useMemo((): BranchStat[] => {
    const branchMap = new Map<
      string,
      { name: string; otHours: number; lateDays: number; employees: number }
    >();

    filteredReports.forEach((r) => {
      const branchName = r.branchName;
      if (!branchMap.has(branchName)) {
        branchMap.set(branchName, {
          name: branchName,
          otHours: 0,
          lateDays: 0,
          employees: 0,
        });
      }
      const b = branchMap.get(branchName)!;
      b.otHours += r.otHours;
      b.lateDays += r.lateDays;
      b.employees += 1;
    });

    return Array.from(branchMap.values());
  }, [filteredReports]);

  // OT Type distribution
  const otTypeStats = useMemo((): OTTypeStat[] => {
    const typeMap = new Map<string, number>();

    otRequests.forEach((ot) => {
      const type = ot.ot_type || "normal";
      const hours = ot.actual_ot_hours ?? ot.approved_ot_hours ?? 0;
      typeMap.set(type, (typeMap.get(type) || 0) + hours);
    });

    const colors: Record<string, string> = {
      normal: "#0071e3",
      holiday: "#ff9500",
      pre_shift: "#af52de",
    };

    const labels: Record<string, string> = {
      normal: "OT ปกติ",
      holiday: "OT วันหยุด",
      pre_shift: "OT ก่อนเวลา",
    };

    return Array.from(typeMap.entries()).map(([type, hours]) => ({
      name: labels[type] || type,
      value: hours,
      color: colors[type] || "#86868b",
    }));
  }, [otRequests]);

  // Export function
  const exportToCSV = useCallback(() => {
    if (!filteredReports.length) return;

    const getRoleLabel = (role: string) => {
      switch (role) {
        case "admin":
          return "Admin";
        case "supervisor":
          return "Supervisor";
        default:
          return "พนักงาน";
      }
    };

    const headers = [
      "ชื่อ",
      "อีเมล",
      "ตำแหน่ง",
      "สาขา",
      "วันทำงาน",
      "ชั่วโมงทำงาน",
      "วันสาย",
      "นาทีสาย",
      "วันลา",
      "วัน WFH",
      "ชั่วโมง OT",
      "เงิน OT",
    ];

    const rows = filteredReports.map((r) => [
      r.name,
      r.email,
      getRoleLabel(r.role),
      r.branchName,
      r.workDays,
      r.workHours.toFixed(1),
      r.lateDays,
      r.lateMinutes,
      r.leaveDays,
      r.wfhDays,
      r.otHours.toFixed(1),
      r.otAmount.toFixed(0),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `report-${format(currentMonth, "yyyy-MM")}.csv`;
    link.click();
  }, [filteredReports, currentMonth]);

  return {
    loading,
    branches,
    filteredReports,
    summary,
    dailyStats,
    branchStats,
    otTypeStats,
    fetchAllData,
    exportToCSV,
  };
}
