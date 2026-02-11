"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/components/ui/Toast";
import { format, startOfMonth, addDays, subDays, isToday } from "date-fns";
import type {
  Employee,
  Branch,
  AttendanceRow,
  AttendanceStats,
  AddAttendanceForm,
  DateMode,
} from "@/components/admin/attendance/types";

export function useAttendanceAdmin() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();

  // Date state
  const [dateMode, setDateMode] = useState<DateMode>("single");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [photoModal, setPhotoModal] = useState<{
    url: string;
    type: string;
  } | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddAttendanceForm>({
    employeeId: "",
    workDate: format(new Date(), "yyyy-MM-dd"),
    clockInTime: "09:00",
    clockOutTime: "18:00",
    status: "present",
    isLate: false,
  });
  const [saving, setSaving] = useState(false);

  // Fetch base data
  useEffect(() => {
    const fetchBaseData = async () => {
      const [empRes, branchRes] = await Promise.all([
        supabase
          .from("employees")
          .select("id, name, email, branch_id, role, created_at")
          .eq("account_status", "approved")
          .is("deleted_at", null)
          .neq("role", "admin")
          .order("name"),
        supabase.from("branches").select("id, name").order("name"),
      ]);
      setEmployees(empRes.data || []);
      setBranches(branchRes.data || []);
    };
    fetchBaseData();
  }, []);

  // Fetch attendance data
  const fetchAttendance = useCallback(async () => {
    if (employees.length === 0) return;

    setLoading(true);
    try {
      const fromDate =
        dateMode === "single" ? format(selectedDate, "yyyy-MM-dd") : startDate;
      const toDate =
        dateMode === "single" ? format(selectedDate, "yyyy-MM-dd") : endDate;

      const [attRes, otRes, leaveRes, wfhRes, fieldWorkRes, lateReqRes, holidayRes] =
        await Promise.all([
          supabase
            .from("attendance_logs")
            .select(
              "*, employee:employees!employee_id(id, name, email, branch_id, role)"
            )
            .gte("work_date", fromDate)
            .lte("work_date", toDate)
            .order("work_date", { ascending: false }),
          supabase
            .from("ot_requests")
            .select("*")
            .gte("request_date", fromDate)
            .lte("request_date", toDate)
            .in("status", ["approved", "started", "completed"]),
          supabase
            .from("leave_requests")
            .select("*")
            .eq("status", "approved")
            .lte("start_date", toDate)
            .gte("end_date", fromDate),
          supabase
            .from("wfh_requests")
            .select("*")
            .eq("status", "approved")
            .gte("date", fromDate)
            .lte("date", toDate),
          supabase
            .from("field_work_requests")
            .select("*")
            .eq("status", "approved")
            .gte("date", fromDate)
            .lte("date", toDate),
          supabase
            .from("late_requests")
            .select("*")
            .gte("request_date", fromDate)
            .lte("request_date", toDate),
          supabase
            .from("holidays")
            .select("date")
            .gte("date", fromDate)
            .lte("date", toDate),
        ]);

      const holidayDates: Set<string> = new Set(
        (holidayRes.data || []).map((h: { date: string }) => h.date)
      );

      const attData = attRes.data || [];
      const otData = otRes.data || [];
      const leaveData = leaveRes.data || [];
      const wfhData = wfhRes.data || [];
      const fieldWorkData = fieldWorkRes.data || [];
      const lateReqData = lateReqRes.data || [];

      // Check if before work start time
      const now = new Date();
      const currentHour = now.getHours();
      const workStartHour = 9;
      const isBeforeWorkStart = currentHour < workStartHour;
      const isTodaySelected =
        format(selectedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");

      // Build rows based on date mode
      if (dateMode === "single") {
        const rows = buildSingleDayRows(
          employees,
          attData,
          otData,
          leaveData,
          wfhData,
          fieldWorkData,
          lateReqData,
          holidayDates,
          selectedDate,
          isTodaySelected && isBeforeWorkStart
        );
        setAttendanceRows(rows);
      } else {
        const rows = buildRangeRows(
          employees,
          attData,
          otData,
          leaveData,
          wfhData,
          fieldWorkData,
          lateReqData
        );
        setAttendanceRows(rows);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      const message = error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลได้";
      toast.error("เกิดข้อผิดพลาด", message);
    } finally {
      setLoading(false);
    }
  }, [employees, dateMode, selectedDate, startDate, endDate, toast]);

  useEffect(() => {
    if (employees.length > 0) fetchAttendance();
  }, [employees, dateMode, selectedDate, startDate, endDate, fetchAttendance]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return attendanceRows.filter((row) => {
      if (
        searchTerm &&
        !row.employee.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      if (filterBranch !== "all" && row.employee.branch_id !== filterBranch) {
        return false;
      }
      if (filterStatus !== "all") {
        if (filterStatus === "present" && row.status !== "present") return false;
        if (filterStatus === "late" && !row.isLate) return false;
        if (filterStatus === "absent" && row.status !== "absent") return false;
        if (filterStatus === "leave" && !row.leaveType) return false;
        if (filterStatus === "wfh" && !row.isWFH) return false;
        if (filterStatus === "ot" && row.otCount === 0) return false;
      }
      return true;
    });
  }, [attendanceRows, searchTerm, filterBranch, filterStatus]);

  // Stats
  const stats = useMemo((): AttendanceStats => {
    const total = filteredRows.length;
    const present = filteredRows.filter(
      (r) => r.status === "present" && (!r.isLate || r.lateRequestStatus === "approved")
    ).length;
    const late = filteredRows.filter((r) => r.isLate && r.lateRequestStatus !== "approved").length;
    const absent = filteredRows.filter((r) => r.status === "absent").length;
    const leave = filteredRows.filter((r) => r.leaveType).length;
    const wfh = filteredRows.filter((r) => r.isWFH).length;
    const otHours = filteredRows.reduce((sum, r) => sum + r.otHours, 0);
    const otAmount = filteredRows.reduce((sum, r) => sum + r.otAmount, 0);
    return { total, present, late, absent, leave, wfh, otHours, otAmount };
  }, [filteredRows]);

  // Date navigation
  const goToPrevDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  // Add manual attendance
  const handleAddAttendance = async () => {
    if (!addForm.employeeId) {
      toast.error("กรุณาเลือกพนักงาน");
      return;
    }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("attendance_logs")
        .select("id")
        .eq("employee_id", addForm.employeeId)
        .eq("work_date", addForm.workDate)
        .single();

      if (existing) {
        toast.error("มีข้อมูลการเข้างานวันนี้แล้ว");
        setSaving(false);
        return;
      }

      const clockIn = new Date(`${addForm.workDate}T${addForm.clockInTime}:00`);
      const clockOut = new Date(
        `${addForm.workDate}T${addForm.clockOutTime}:00`
      );
      const totalHours =
        (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

      const { error } = await supabase.from("attendance_logs").insert({
        employee_id: addForm.employeeId,
        work_date: addForm.workDate,
        clock_in_time: clockIn.toISOString(),
        clock_out_time: clockOut.toISOString(),
        total_hours: totalHours,
        is_late: addForm.isLate,
        late_minutes: 0,
        status: addForm.status,
        auto_checkout: false,
        edited_at: new Date().toISOString(),
        edited_by: currentAdmin?.id,
      });

      if (error) throw error;

      toast.success("เพิ่มข้อมูลสำเร็จ");
      setAddModal(false);
      resetAddForm();
      fetchAttendance();
    } catch (error) {
      const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
      toast.error("เกิดข้อผิดพลาด", message);
    } finally {
      setSaving(false);
    }
  };

  const resetAddForm = () => {
    setAddForm({
      employeeId: "",
      workDate: format(new Date(), "yyyy-MM-dd"),
      clockInTime: "09:00",
      clockOutTime: "18:00",
      status: "present",
      isLate: false,
    });
  };

  return {
    // Data
    employees,
    branches,
    filteredRows,
    stats,
    loading,

    // Date state
    dateMode,
    selectedDate,
    startDate,
    endDate,

    // Filter state
    searchTerm,
    filterBranch,
    filterStatus,

    // Modal state
    photoModal,
    addModal,
    addForm,
    saving,

    // Actions
    setDateMode,
    setSelectedDate,
    setStartDate,
    setEndDate,
    setSearchTerm,
    setFilterBranch,
    setFilterStatus,
    setPhotoModal,
    setAddModal,
    setAddForm,
    goToPrevDay,
    goToNextDay,
    goToToday,
    handleAddAttendance,
    fetchAttendance,
  };
}

// Helper function for single day rows
function buildSingleDayRows(
  employees: Employee[],
  attData: any[],
  otData: any[],
  leaveData: any[],
  wfhData: any[],
  fieldWorkData: any[],
  lateReqData: any[],
  holidayDates: Set<string>,
  selectedDate: Date,
  isBeforeWorkStart: boolean
): AttendanceRow[] {
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const isHoliday = holidayDates.has(dateStr);
  const dayOfWeek = selectedDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isNonWorkingDay = isHoliday || isWeekend;

  const rows: AttendanceRow[] = [];

  employees.forEach((emp) => {
    // Skip dates before employee joined (don't show as absent)
    const empCreatedAt = emp.created_at ? new Date(emp.created_at) : null;
    if (empCreatedAt) {
      const selectedDateStart = new Date(dateStr + "T00:00:00");
      if (selectedDateStart < empCreatedAt) {
        return; // Employee hadn't joined yet - skip this row
      }
    }

    const att = attData.find((a: any) => a.employee_id === emp.id);
    const empOt = otData.filter((o: any) => o.employee_id === emp.id);
    const empLeave = leaveData.find(
      (l: any) =>
        l.employee_id === emp.id &&
        l.start_date <= dateStr &&
        l.end_date >= dateStr
    );
    const empWfh = wfhData.find(
      (w: any) => w.employee_id === emp.id && w.date === dateStr
    );
    const empFieldWork = fieldWorkData.find(
      (fw: any) => fw.employee_id === emp.id && fw.date === dateStr
    );
    const empLateReq = lateReqData.find(
      (lr: any) => lr.employee_id === emp.id && lr.request_date === dateStr
    );

    if (isNonWorkingDay && !att && empOt.length === 0) {
      return;
    }

    let status = "absent";
    if (att?.status) {
      status = att.status;
    } else if (empLeave) {
      status = "leave";
    } else if (empWfh) {
      status = "wfh";
    } else if (empFieldWork) {
      status = "present";
    } else if (isNonWorkingDay && empOt.length > 0) {
      status = "holiday_ot";
    } else if (isBeforeWorkStart) {
      status = "pending";
    }

    rows.push({
      id: att?.id || `${emp.id}-${dateStr}`,
      employee: emp,
      workDate: dateStr,
      clockIn: att?.clock_in_time || null,
      clockOut: att?.clock_out_time || null,
      workHours: att?.total_hours || null,
      isLate: att?.is_late || false,
      lateMinutes: att?.late_minutes || 0,
      status,
      autoCheckout: att?.auto_checkout || false,
      clockInPhotoUrl: att?.clock_in_photo_url || null,
      clockOutPhotoUrl: att?.clock_out_photo_url || null,
      otCount: empOt.length,
      otHours: empOt.reduce(
        (sum: number, o: any) => sum + (o.actual_ot_hours || 0),
        0
      ),
      otAmount: empOt.reduce((sum: number, o: any) => sum + (o.ot_amount || 0), 0),
      leaveType: empLeave?.leave_type || null,
      isWFH: !!empWfh,
      isFieldWork: !!empFieldWork,
      fieldWorkLocation: empFieldWork?.location || null,
      lateRequestStatus: empLateReq?.status || null,
    });
  });

  return rows;
}

// Helper function for range rows
function buildRangeRows(
  employees: Employee[],
  attData: any[],
  otData: any[],
  leaveData: any[],
  wfhData: any[],
  fieldWorkData: any[],
  lateReqData: any[]
): AttendanceRow[] {
  const rows: AttendanceRow[] = [];
  const processedKeys = new Set<string>();

  attData.forEach((att: any) => {
    const emp = att.employee || employees.find((e) => e.id === att.employee_id);
    const dateStr = att.work_date;
    const key = `${att.employee_id}-${dateStr}`;
    processedKeys.add(key);

    if (!emp) return;

    const empOt = otData.filter(
      (o: any) => o.employee_id === att.employee_id && o.request_date === dateStr
    );
    const empLeave = leaveData.find(
      (l: any) =>
        l.employee_id === att.employee_id &&
        l.start_date <= dateStr &&
        l.end_date >= dateStr
    );
    const empWfh = wfhData.find(
      (w: any) => w.employee_id === att.employee_id && w.date === dateStr
    );
    const empFieldWork = fieldWorkData.find(
      (fw: any) => fw.employee_id === att.employee_id && fw.date === dateStr
    );
    const empLateReq = lateReqData.find(
      (lr: any) =>
        lr.employee_id === att.employee_id && lr.request_date === dateStr
    );

    rows.push({
      id: att.id,
      employee: emp,
      workDate: dateStr,
      clockIn: att.clock_in_time,
      clockOut: att.clock_out_time,
      workHours: att.total_hours,
      isLate: att.is_late,
      lateMinutes: att.late_minutes || 0,
      status: att.status,
      autoCheckout: att.auto_checkout || false,
      clockInPhotoUrl: att.clock_in_photo_url,
      clockOutPhotoUrl: att.clock_out_photo_url,
      otCount: empOt.length,
      otHours: empOt.reduce(
        (sum: number, o: any) => sum + (o.actual_ot_hours || 0),
        0
      ),
      otAmount: empOt.reduce((sum: number, o: any) => sum + (o.ot_amount || 0), 0),
      leaveType: empLeave?.leave_type || null,
      isWFH: !!empWfh,
      isFieldWork: !!empFieldWork,
      fieldWorkLocation: empFieldWork?.location || null,
      lateRequestStatus: empLateReq?.status || null,
    });
  });

  otData.forEach((ot: any) => {
    const key = `${ot.employee_id}-${ot.request_date}`;
    if (!processedKeys.has(key)) {
      processedKeys.add(key);
      const emp = employees.find((e) => e.id === ot.employee_id);
      if (!emp) return;

      const dateStr = ot.request_date;
      const empOt = otData.filter(
        (o: any) => o.employee_id === ot.employee_id && o.request_date === dateStr
      );

      rows.push({
        id: `ot-${ot.id}`,
        employee: emp,
        workDate: dateStr,
        clockIn: null,
        clockOut: null,
        workHours: null,
        isLate: false,
        lateMinutes: 0,
        status: "holiday_ot",
        autoCheckout: false,
        clockInPhotoUrl: null,
        clockOutPhotoUrl: null,
        otCount: empOt.length,
        otHours: empOt.reduce(
          (sum: number, o: any) => sum + (o.actual_ot_hours || 0),
          0
        ),
        otAmount: empOt.reduce(
          (sum: number, o: any) => sum + (o.ot_amount || 0),
          0
        ),
        leaveType: null,
        isWFH: false,
        isFieldWork: false,
        fieldWorkLocation: null,
        lateRequestStatus: null,
      });
    }
  });

  rows.sort((a, b) => b.workDate.localeCompare(a.workDate));
  return rows;
}
