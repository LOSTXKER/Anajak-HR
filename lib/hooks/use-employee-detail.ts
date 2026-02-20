"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type {
  Employee,
  Branch,
  AttendanceRecord,
  OTRecord,
  LeaveRecord,
  WFHRecord,
  LateRequestRecord,
  LeaveBalance,
  MonthlyStats,
  TabType,
} from "@/components/admin/employee-detail/types";

interface UseEmployeeDetailOptions {
  employeeId: string;
}

export function useEmployeeDetail({ employeeId }: UseEmployeeDetailOptions) {
  const router = useRouter();
  const toast = useToast();

  // State
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Data for tabs
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [otData, setOtData] = useState<OTRecord[]>([]);
  const [leaveData, setLeaveData] = useState<LeaveRecord[]>([]);
  const [wfhData, setWfhData] = useState<WFHRecord[]>([]);
  const [lateData, setLateData] = useState<LateRequestRecord[]>([]);
  const [approvedLateDates, setApprovedLateDates] = useState<Set<string>>(
    new Set()
  );

  // Leave balance (yearly)
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({
    sick_used: 0,
    personal_used: 0,
    annual_used: 0,
  });

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{
    type: string;
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch employee
  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, branchRes] = await Promise.all([
        supabase
          .from("employees")
          .select("*, branch:branches(id, name)")
          .eq("id", employeeId)
          .single(),
        supabase.from("branches").select("id, name").order("name"),
      ]);

      if (empRes.error) throw empRes.error;
      setEmployee(empRes.data);
      setEditForm(empRes.data);
      setBranches(branchRes.data || []);
    } catch (error) {
      console.error("Error fetching employee:", error);
      toast.error("ไม่พบข้อมูลพนักงาน", "");
      router.push("/admin/employees");
    } finally {
      setLoading(false);
    }
  }, [employeeId, router, toast]);

  // Fetch all tab data in parallel — ดึงทั้งหมดพร้อมกันเพื่อให้ stats cards แสดงครบตั้งแต่แรก
  const fetchTabData = useCallback(async () => {
    if (!employeeId) return;

    const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    try {
      const [attRes, lateReqRes, otRes, leaveRes, yearlyLeaveRes, wfhRes, lateDataRes] =
        await Promise.all([
          supabase
            .from("attendance_logs")
            .select("*")
            .eq("employee_id", employeeId)
            .gte("work_date", startDate)
            .lte("work_date", endDate)
            .order("work_date", { ascending: false }),
          supabase
            .from("late_requests")
            .select("request_date")
            .eq("employee_id", employeeId)
            .eq("status", "approved")
            .gte("request_date", startDate)
            .lte("request_date", endDate),
          supabase
            .from("ot_requests")
            .select("*")
            .eq("employee_id", employeeId)
            .gte("request_date", startDate)
            .lte("request_date", endDate)
            .order("request_date", { ascending: false }),
          supabase
            .from("leave_requests")
            .select("*")
            .eq("employee_id", employeeId)
            .lte("start_date", endDate)
            .gte("end_date", startDate)
            .order("start_date", { ascending: false }),
          supabase
            .from("leave_requests")
            .select("leave_type, start_date, end_date, is_half_day")
            .eq("employee_id", employeeId)
            .eq("status", "approved")
            .gte("start_date", yearStart)
            .lte("start_date", yearEnd),
          supabase
            .from("wfh_requests")
            .select("*")
            .eq("employee_id", employeeId)
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: false }),
          supabase
            .from("late_requests")
            .select("*")
            .eq("employee_id", employeeId)
            .gte("request_date", startDate)
            .lte("request_date", endDate)
            .order("request_date", { ascending: false }),
        ]);

      setAttendanceData(attRes.data || []);
      setApprovedLateDates(
        new Set(
          (lateReqRes.data || []).map(
            (r: { request_date: string }) => r.request_date
          )
        )
      );
      setOtData(otRes.data || []);
      setLeaveData(leaveRes.data || []);
      setWfhData(wfhRes.data || []);
      setLateData(lateDataRes.data || []);

      // คำนวณ leave balance จาก yearly data
      const usedDays = { sick_used: 0, personal_used: 0, annual_used: 0 };
      (yearlyLeaveRes.data || []).forEach((leave: LeaveRecord) => {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const days = leave.is_half_day
          ? 0.5
          : Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (leave.leave_type === "sick") usedDays.sick_used += days;
        else if (leave.leave_type === "personal") usedDays.personal_used += days;
        else if (leave.leave_type === "annual") usedDays.annual_used += days;
      });
      setLeaveBalance(usedDays);
    } catch (error) {
      console.error("Error fetching tab data:", error);
    }
  }, [employeeId, currentMonth]);

  // Effects
  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  useEffect(() => {
    fetchTabData();
  }, [currentMonth, fetchTabData]);

  // Monthly stats
  const monthlyStats = useMemo((): MonthlyStats => {
    return {
      workDays: attendanceData.filter((a) => a.clock_in_time).length,
      lateDays: attendanceData.filter(
        (a) => a.is_late && !approvedLateDates.has(a.work_date)
      ).length,
      absentDays: 0,
      otHours: otData
        .filter((o) => o.status === "completed" || o.status === "approved")
        .reduce((sum, o) => sum + (o.actual_ot_hours || o.approved_ot_hours || 0), 0),
      otAmount: otData
        .filter((o) => o.status === "completed" || o.status === "approved")
        .reduce((sum, o) => sum + (o.ot_amount || 0), 0),
      leaveDays: leaveData.filter((l) => l.status === "approved").length,
      wfhDays: new Set([
        ...wfhData.filter((w) => w.status === "approved").map((w: any) => w.date),
        ...attendanceData.filter((a: any) => a.work_mode === "wfh").map((a: any) => a.work_date),
      ]).size,
    };
  }, [attendanceData, otData, leaveData, wfhData, approvedLateDates]);

  // Save employee
  const handleSave = async () => {
    if (!employee) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          position: editForm.position,
          branch_id: editForm.branch_id || null,
          base_salary: editForm.base_salary,
          sick_leave_quota: editForm.sick_leave_quota,
          personal_leave_quota: editForm.personal_leave_quota,
          annual_leave_quota: editForm.annual_leave_quota,
        })
        .eq("id", employee.id);

      if (error) throw error;

      // If salary or commission changed, record a new salary history entry
      const salaryChanged =
        Number(editForm.base_salary ?? 0) !== Number(employee.base_salary ?? 0) ||
        Number(editForm.commission ?? 0) !== Number(employee.commission ?? 0);

      if (salaryChanged) {
        const today = new Date().toISOString().split("T")[0];
        await supabase.from("salary_history").insert({
          employee_id: employee.id,
          base_salary: editForm.base_salary ?? 0,
          commission: editForm.commission ?? 0,
          effective_date: today,
        });
      }

      toast.success("บันทึกสำเร็จ", "อัปเดตข้อมูลพนักงานเรียบร้อย");
      setEditMode(false);
      fetchEmployee();
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : "ไม่สามารถบันทึกได้";
      toast.error("เกิดข้อผิดพลาด", message);
    } finally {
      setSaving(false);
    }
  };

  // Delete record
  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      let table = "";
      if (deleteModal.type === "ot") table = "ot_requests";
      else if (deleteModal.type === "leave") table = "leave_requests";
      else if (deleteModal.type === "wfh") table = "wfh_requests";
      else if (deleteModal.type === "late") table = "late_requests";
      else if (deleteModal.type === "attendance") table = "attendance_logs";

      const { error } = await supabase.from(table).delete().eq("id", deleteModal.id);
      if (error) throw error;

      toast.success("ลบสำเร็จ", "ลบรายการเรียบร้อย");
      setDeleteModal(null);
      fetchTabData();
    } catch (error: Error | unknown) {
      const message = error instanceof Error ? error.message : "ไม่สามารถลบได้";
      toast.error("เกิดข้อผิดพลาด", message);
    } finally {
      setDeleting(false);
    }
  };

  return {
    // Data
    employee,
    branches,
    loading,
    activeTab,
    currentMonth,
    attendanceData,
    otData,
    leaveData,
    wfhData,
    lateData,
    leaveBalance,
    monthlyStats,

    // Edit state
    editMode,
    editForm,
    saving,

    // Delete state
    deleteModal,
    deleting,

    // Actions
    setActiveTab,
    setCurrentMonth,
    setEditMode,
    setEditForm,
    setDeleteModal,
    handleSave,
    handleDelete,
    fetchEmployee,
    fetchTabData,
  };
}
