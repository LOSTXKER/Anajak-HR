"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { CancelModal } from "@/components/ui/CancelModal";
import {
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Edit,
  RefreshCw,
  TrendingUp,
  User,
  Home,
  Calculator,
} from "lucide-react";
import { format, parseISO, differenceInHours } from "date-fns";
import { th } from "date-fns/locale";
import Link from "next/link";

interface Problem {
  id: string;
  type: "no_checkout" | "pending_ot_old" | "late_not_approved" | "early_checkout";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  employeeName: string;
  date: string;
  actionUrl?: string;
  canQuickFix: boolean;
  data: any;
}

const severityConfig = {
  high: { color: "text-[#ff3b30]", bgColor: "bg-[#ff3b30]/10", label: "สำคัญมาก" },
  medium: { color: "text-[#ff9500]", bgColor: "bg-[#ff9500]/10", label: "ปานกลาง" },
  low: { color: "text-[#0071e3]", bgColor: "bg-[#0071e3]/10", label: "ต่ำ" },
};

function QuickFixDashboardContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [wfhFixLoading, setWfhFixLoading] = useState(false);
  const [wfhFixResult, setWfhFixResult] = useState<{ inserted: number; missing: number } | null>(null);
  const [leaveCalcLoading, setLeaveCalcLoading] = useState(false);
  const [leaveCalcResult, setLeaveCalcResult] = useState<number | null>(null);

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    setLoading(true);
    const foundProblems: Problem[] = [];
    const today = format(new Date(), "yyyy-MM-dd");

    try {
      // 1. หาพนักงานที่ยังไม่เช็คเอาท์
      const { data: noCheckout } = await supabase
        .from("attendance_logs")
        .select("*, employee:employees!employee_id(id, name, email)")
        .eq("work_date", today)
        .is("clock_out_time", null);

      noCheckout?.forEach((log: any) => {
        if (log.employee?.role !== "admin") {
          foundProblems.push({
            id: `no_checkout_${log.id}`,
            type: "no_checkout",
            severity: "high",
            title: "ยังไม่เช็คเอาท์",
            description: `เช็คอินเมื่อ ${format(parseISO(log.clock_in_time), "HH:mm น.")}`,
            employeeName: log.employee?.name || "ไม่ทราบชื่อ",
            date: log.work_date,
            actionUrl: `/admin/attendance/edit/${log.id}`,
            canQuickFix: true,
            data: log,
          });
        }
      });

      // 2. หา OT ที่ pending นานเกิน 24 ชม.
      const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), "yyyy-MM-dd");
      const { data: oldOT } = await supabase
        .from("ot_requests")
        .select("*, employee:employees!employee_id(id, name, email)")
        .eq("status", "pending")
        .lte("request_date", yesterday);

      oldOT?.forEach((ot: any) => {
        foundProblems.push({
          id: `old_ot_${ot.id}`,
          type: "pending_ot_old",
          severity: "medium",
          title: "OT รอนานเกิน 24 ชม.",
          description: `ขอ OT วันที่ ${format(parseISO(ot.request_date), "d MMM", { locale: th })}`,
          employeeName: ot.employee?.name || "ไม่ทราบชื่อ",
          date: ot.request_date,
          actionUrl: `/admin/approvals?type=ot`,
          canQuickFix: true,
          data: ot,
        });
      });

      // 3. หาคนมาสายที่ยังไม่ได้ขออนุมัติ
      const { data: lateWithoutRequest } = await supabase
        .from("attendance_logs")
        .select(`
          *,
          employee:employees!employee_id(id, name, email),
          late_request:late_requests!employee_id(id)
        `)
        .eq("is_late", true)
        .gte("work_date", format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));

      lateWithoutRequest?.forEach((log: any) => {
        if (!log.late_request && log.employee?.role !== "admin") {
          foundProblems.push({
            id: `late_no_request_${log.id}`,
            type: "late_not_approved",
            severity: "low",
            title: "มาสายแต่ไม่ขออนุมัติ",
            description: `สาย ${log.late_minutes} นาที`,
            employeeName: log.employee?.name || "ไม่ทราบชื่อ",
            date: log.work_date,
            canQuickFix: false,
            data: log,
          });
        }
      });

      setProblems(foundProblems);
    } catch (error) {
      console.error("Error fetching problems:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  // Backfill WFH attendance records
  const fixWFHAttendance = async () => {
    setWfhFixLoading(true);
    setWfhFixResult(null);
    try {
      // ดึง work hours จาก settings
      const { data: settings } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["work_start_time", "work_end_time"]);

      const settingsMap: Record<string, string> = {};
      (settings || []).forEach((s: any) => { settingsMap[s.setting_key] = s.setting_value; });

      const workStart = settingsMap["work_start_time"] || "09:00";
      const workEnd = settingsMap["work_end_time"] || "18:00";
      const [startH, startM] = workStart.split(":").map(Number);
      const [endH, endM] = workEnd.split(":").map(Number);
      const totalHours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;

      // ดึง approved WFH requests ทั้งหมด
      const { data: wfhList, error: wfhErr } = await supabase
        .from("wfh_requests")
        .select("id, employee_id, date")
        .eq("status", "approved")
        .order("date", { ascending: true });

      if (wfhErr) throw wfhErr;
      if (!wfhList || wfhList.length === 0) {
        toast.info("ไม่มีข้อมูล", "ไม่พบ WFH ที่อนุมัติแล้ว");
        return;
      }

      // ดึง attendance_logs ที่มีอยู่
      const { data: existingLogs } = await supabase
        .from("attendance_logs")
        .select("employee_id, work_date");

      const existingSet = new Set(
        (existingLogs || []).map((l: any) => `${l.employee_id}_${l.work_date}`)
      );

      const missing = wfhList.filter(
        (w: any) => !existingSet.has(`${w.employee_id}_${w.date}`)
      );

      if (missing.length === 0) {
        toast.success("ครบแล้ว", "ทุก WFH มีข้อมูลเวลาครบแล้ว");
        setWfhFixResult({ inserted: 0, missing: 0 });
        return;
      }

      let inserted = 0;
      for (const wfh of missing) {
        const dateStr: string = wfh.date;
        const clockIn = new Date(`${dateStr}T${workStart}:00+07:00`).toISOString();
        const clockOut = new Date(`${dateStr}T${workEnd}:00+07:00`).toISOString();

        const { error: insertErr } = await supabase
          .from("attendance_logs")
          .insert({
            employee_id: wfh.employee_id,
            work_date: dateStr,
            clock_in_time: clockIn,
            clock_out_time: clockOut,
            total_hours: totalHours,
            is_late: false,
            late_minutes: 0,
            work_mode: "wfh",
            status: "present",
            note: "บันทึกย้อนหลัง WFH (auto-backfill)",
          });

        if (!insertErr || insertErr.code === "23505") {
          if (!insertErr) inserted++;
        }
      }

      setWfhFixResult({ inserted, missing: missing.length });
      toast.success("สำเร็จ", `เพิ่มข้อมูล WFH ย้อนหลัง ${inserted} รายการ`);
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด", err.message);
    } finally {
      setWfhFixLoading(false);
    }
  };

  // Recalculate leave balances excluding weekends and holidays
  const recalculateLeaveBalances = async () => {
    setLeaveCalcLoading(true);
    setLeaveCalcResult(null);
    try {
      const currentYear = new Date().getFullYear();

      // ดึง working_days จาก system_settings (1=จ, 2=อ, ..., 6=ส, 7=อา)
      const { data: wdSetting } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "working_days")
        .maybeSingle();

      const workingDayNums: number[] = wdSetting?.setting_value
        ? wdSetting.setting_value.split(",").map(Number).filter(Boolean)
        : [1, 2, 3, 4, 5]; // default จ-ศ

      // ดึง holidays ปีนี้ทั้งหมดมาไว้ใน Set
      const { data: holidays } = await supabase
        .from("holidays")
        .select("date")
        .eq("is_active", true)
        .gte("date", `${currentYear}-01-01`)
        .lte("date", `${currentYear}-12-31`);

      const holidaySet = new Set((holidays || []).map((h: any) => h.date as string));

      // นับวันทำงานจริง (ข้ามวันหยุดตามที่ตั้งในระบบ + วันหยุดนักขัตฤกษ์)
      const countWorkingDays = (startDate: string, endDate: string, isHalfDay: boolean): number => {
        if (isHalfDay) return 0.5;
        const current = new Date(startDate + "T00:00:00");
        const end = new Date(endDate + "T00:00:00");
        let count = 0;
        while (current <= end) {
          // JS: 0=อา, 1=จ, ..., 6=ส → แปลงเป็น our format: 0→7, 1→1, ..., 6→6
          const jsDow = current.getDay();
          const ourDow = jsDow === 0 ? 7 : jsDow;
          const dateStr = current.toISOString().split("T")[0];
          if (workingDayNums.includes(ourDow) && !holidaySet.has(dateStr)) {
            count++;
          }
          current.setDate(current.getDate() + 1);
        }
        return count;
      };

      // ดึง approved leave requests ปีนี้
      const { data: leaveRequests, error: leaveErr } = await supabase
        .from("leave_requests")
        .select("employee_id, leave_type, start_date, end_date, is_half_day")
        .eq("status", "approved")
        .gte("start_date", `${currentYear}-01-01`)
        .lte("start_date", `${currentYear}-12-31`);

      if (leaveErr) throw leaveErr;

      // รวมวันลาแยกตามพนักงาน
      const employeeLeave: Record<string, { sick: number; personal: number; annual: number }> = {};
      for (const lr of (leaveRequests || [])) {
        if (!employeeLeave[lr.employee_id]) {
          employeeLeave[lr.employee_id] = { sick: 0, personal: 0, annual: 0 };
        }
        const days = countWorkingDays(lr.start_date, lr.end_date, lr.is_half_day);
        if (lr.leave_type === "sick") employeeLeave[lr.employee_id].sick += days;
        else if (lr.leave_type === "personal") employeeLeave[lr.employee_id].personal += days;
        else if (lr.leave_type === "annual") employeeLeave[lr.employee_id].annual += days;
      }

      // ดึง quota ของพนักงานทุกคน
      const { data: employees } = await supabase
        .from("employees")
        .select("id, annual_leave_quota, sick_leave_quota, personal_leave_quota")
        .is("deleted_at", null);

      let updated = 0;
      for (const emp of (employees || [])) {
        const used = employeeLeave[emp.id] || { sick: 0, personal: 0, annual: 0 };
        const annualQuota = emp.annual_leave_quota || 10;
        const sickQuota = emp.sick_leave_quota || 30;
        const personalQuota = emp.personal_leave_quota || 3;

        const { error: upsertErr } = await supabase
          .from("leave_balances")
          .upsert(
            {
              employee_id: emp.id,
              year: currentYear,
              annual_leave_quota: annualQuota,
              sick_leave_quota: sickQuota,
              personal_leave_quota: personalQuota,
              annual_leave_used: used.annual,
              sick_leave_used: used.sick,
              personal_leave_used: used.personal,
              annual_leave_remaining: Math.max(0, annualQuota - used.annual),
              sick_leave_remaining: Math.max(0, sickQuota - used.sick),
              personal_leave_remaining: Math.max(0, personalQuota - used.personal),
            },
            { onConflict: "employee_id,year" }
          );

        if (!upsertErr) updated++;
      }

      setLeaveCalcResult(updated);
      toast.success("สำเร็จ", `คำนวณวันลาใหม่ ${updated} คน เรียบร้อย`);
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด", err.message);
    } finally {
      setLeaveCalcLoading(false);
    }
  };

  // Quick fix for no checkout
  const quickFixCheckout = async (problem: Problem) => {
    if (!currentAdmin) return;

    const log = problem.data;
    const clockIn = parseISO(log.clock_in_time);
    const now = new Date();
    const totalHours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

    const { error } = await supabase
      .from("attendance_logs")
      .update({
        clock_out_time: now.toISOString(),
        total_hours: totalHours,
        edited_by: currentAdmin.id,
        edited_at: now.toISOString(),
        edit_reason: "Admin แก้ไข: ลืมเช็คเอาท์",
      })
      .eq("id", log.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด", error.message);
      return;
    }

    toast.success("แก้ไขสำเร็จ", "บันทึกเวลาเช็คเอาท์เรียบร้อย");
    fetchProblems();
  };

  // Quick approve OT
  const quickApproveOT = async (problem: Problem) => {
    if (!currentAdmin) return;

    const ot = problem.data;
    const start = parseISO(ot.requested_start_time);
    const end = parseISO(ot.requested_end_time);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    const { error } = await supabase
      .from("ot_requests")
      .update({
        status: "approved",
        approved_by: currentAdmin.id,
        approved_at: new Date().toISOString(),
        approved_start_time: ot.requested_start_time,
        approved_end_time: ot.requested_end_time,
        approved_ot_hours: hours,
      })
      .eq("id", ot.id);

    if (error) {
      toast.error("เกิดข้อผิดพลาด", error.message);
      return;
    }

    toast.success("อนุมัติสำเร็จ", "อนุมัติ OT เรียบร้อยแล้ว");
    fetchProblems();
  };

  if (loading) {
    return (
      <AdminLayout title="Quick Fix Dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const highProblems = problems.filter(p => p.severity === "high");
  const mediumProblems = problems.filter(p => p.severity === "medium");
  const lowProblems = problems.filter(p => p.severity === "low");

  return (
    <AdminLayout 
      title="Quick Fix Dashboard" 
      description="ปัญหาที่ต้องแก้ไขด่วน"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff3b30]/10 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#ff3b30]" />
            </div>
            <div>
              <p className="text-[13px] text-[#86868b]">สำคัญมาก</p>
              <p className="text-[24px] font-semibold text-[#ff3b30]">{highProblems.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <p className="text-[13px] text-[#86868b]">ปานกลาง</p>
              <p className="text-[24px] font-semibold text-[#ff9500]">{mediumProblems.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0071e3]/10 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <p className="text-[13px] text-[#86868b]">ต่ำ</p>
              <p className="text-[24px] font-semibold text-[#0071e3]">{lowProblems.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#34c759]/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <p className="text-[13px] text-[#86868b]">ทั้งหมด</p>
              <p className="text-[24px] font-semibold text-[#1d1d1f]">{problems.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="mb-6 flex items-center gap-3">
        <Button onClick={fetchProblems} variant="secondary" icon={<RefreshCw className="w-4 h-4" />}>
          รีเฟรชข้อมูล
        </Button>
      </div>

      {/* WFH Backfill Section */}
      <Card elevated className="mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#0071e3]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Home className="w-6 h-6 text-[#0071e3]" />
          </div>
          <div className="flex-1">
            <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">
              เพิ่มเวลาทำงาน WFH ย้อนหลัง
            </h3>
            <p className="text-[14px] text-[#86868b] mb-4">
              ค้นหา WFH ที่อนุมัติแล้วแต่ยังไม่มีบันทึกเวลาเข้า/ออกงาน และเพิ่มเวลาทำงานตามเวลาปกติในระบบ
            </p>
            {wfhFixResult && (
              <div className={`p-3 rounded-xl mb-4 text-[14px] ${wfhFixResult.inserted > 0 ? "bg-[#34c759]/10 text-[#34c759]" : "bg-[#86868b]/10 text-[#86868b]"}`}>
                {wfhFixResult.inserted > 0
                  ? `✓ เพิ่มข้อมูลย้อนหลัง ${wfhFixResult.inserted} จาก ${wfhFixResult.missing} รายการสำเร็จ`
                  : "ข้อมูลครบแล้ว ไม่มีอะไรต้องเพิ่ม"}
              </div>
            )}
            <Button
              onClick={fixWFHAttendance}
              loading={wfhFixLoading}
              icon={<Home className="w-4 h-4" />}
            >
              เพิ่มเวลาทำงาน WFH ย้อนหลัง
            </Button>
          </div>
        </div>
      </Card>

      {/* Leave Balance Recalculation Section */}
      <Card elevated className="mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#34c759]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Calculator className="w-6 h-6 text-[#34c759]" />
          </div>
          <div className="flex-1">
            <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">
              คำนวณวันลาใหม่ (ไม่นับ Weekend & วันหยุด)
            </h3>
            <p className="text-[14px] text-[#86868b] mb-4">
              คำนวณยอดวันลาคงเหลือทุกคนใหม่ โดยนับเฉพาะวันทำงาน ไม่นับวันเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์
            </p>
            {leaveCalcResult !== null && (
              <div className="p-3 rounded-xl mb-4 text-[14px] bg-[#34c759]/10 text-[#34c759]">
                ✓ คำนวณวันลาใหม่ครบ {leaveCalcResult} คน เรียบร้อย
              </div>
            )}
            <Button
              onClick={recalculateLeaveBalances}
              loading={leaveCalcLoading}
              variant="secondary"
              icon={<Calculator className="w-4 h-4" />}
            >
              คำนวณวันลาใหม่
            </Button>
          </div>
        </div>
      </Card>

      {/* No Problems */}
      {problems.length === 0 && (
        <Card elevated className="text-center py-12">
          <div className="w-16 h-16 bg-[#34c759]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#34c759]" />
          </div>
          <h3 className="text-[20px] font-semibold text-[#1d1d1f] mb-2">
            ไม่มีปัญหาที่ต้องแก้ไข
          </h3>
          <p className="text-[15px] text-[#86868b]">
            ระบบทำงานปกติ ทุกอย่างเรียบร้อย
          </p>
        </Card>
      )}

      {/* High Priority Problems */}
      {highProblems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-[#ff3b30]" />
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              ปัญหาสำคัญมาก ({highProblems.length})
            </h3>
          </div>
          <div className="space-y-3">
            {highProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onQuickFix={quickFixCheckout}
                onRefresh={fetchProblems}
              />
            ))}
          </div>
        </div>
      )}

      {/* Medium Priority Problems */}
      {mediumProblems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-[#ff9500]" />
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              ปัญหาปานกลาง ({mediumProblems.length})
            </h3>
          </div>
          <div className="space-y-3">
            {mediumProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onQuickFix={quickApproveOT}
                onRefresh={fetchProblems}
              />
            ))}
          </div>
        </div>
      )}

      {/* Low Priority Problems */}
      {lowProblems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-[#0071e3]" />
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              ปัญหาต่ำ ({lowProblems.length})
            </h3>
          </div>
          <div className="space-y-3">
            {lowProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onQuickFix={() => {}}
                onRefresh={fetchProblems}
              />
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// Problem Card Component
function ProblemCard({ 
  problem, 
  onQuickFix, 
  onRefresh 
}: { 
  problem: Problem; 
  onQuickFix: (problem: Problem) => void;
  onRefresh: () => void;
}) {
  const config = severityConfig[problem.severity];
  
  return (
    <Card elevated className="hover:shadow-lg transition-all">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 ${config.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <AlertCircle className={`w-6 h-6 ${config.color}`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-[17px] font-semibold text-[#1d1d1f]">
                  {problem.title}
                </h4>
                <Badge 
                  variant={
                    problem.severity === "high" ? "danger" : 
                    problem.severity === "medium" ? "warning" : "default"
                  }
                >
                  {config.label}
                </Badge>
              </div>
              <p className="text-[14px] text-[#86868b]">{problem.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[13px] text-[#86868b] mb-4">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {problem.employeeName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(parseISO(problem.date), "d MMM yyyy", { locale: th })}
            </span>
          </div>

          <div className="flex gap-2">
            {problem.canQuickFix && (
              <Button
                size="sm"
                onClick={() => onQuickFix(problem)}
                icon={<CheckCircle className="w-4 h-4" />}
              >
                แก้ไขด่วน
              </Button>
            )}
            {problem.actionUrl && (
              <Link href={problem.actionUrl}>
                <Button variant="secondary" size="sm" icon={<Edit className="w-4 h-4" />}>
                  ดูรายละเอียด
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function QuickFixDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <QuickFixDashboardContent />
    </ProtectedRoute>
  );
}

