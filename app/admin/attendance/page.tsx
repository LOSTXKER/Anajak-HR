"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { TimeInput } from "@/components/ui/TimeInput";
import { DateInput } from "@/components/ui/DateInput";
import { useToast } from "@/components/ui/Toast";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  Camera,
  Plus,
  Users,
  AlertTriangle,
  CheckCircle2,
  Home,
  Calendar,
  X,
  DollarSign,
  Timer,
  UserX,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, addDays, subDays, isToday, isSameDay } from "date-fns";
import { th } from "date-fns/locale";

// Types
interface Employee {
  id: string;
  name: string;
  email: string;
  branch_id: string | null;
  role: string;
}

interface Branch {
  id: string;
  name: string;
}

interface AttendanceRow {
  id: string;
  employee: Employee;
  workDate: string;
  clockIn: string | null;
  clockOut: string | null;
  workHours: number | null;
  isLate: boolean;
  lateMinutes: number;
  status: string;
  autoCheckout: boolean;
  clockInPhotoUrl: string | null;
  clockOutPhotoUrl: string | null;
  // Related data
  otCount: number;
  otHours: number;
  otAmount: number;
  leaveType: string | null;
  isWFH: boolean;
  lateRequestStatus: string | null;
}

function AttendanceContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();

  // Date state - single date or range
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
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
  const [photoModal, setPhotoModal] = useState<{ url: string; type: string } | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
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
          .select("id, name, email, branch_id, role")
          .eq("account_status", "approved")
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
      const fromDate = dateMode === "single" ? format(selectedDate, "yyyy-MM-dd") : startDate;
      const toDate = dateMode === "single" ? format(selectedDate, "yyyy-MM-dd") : endDate;

      // Fetch all related data
      const [attRes, otRes, leaveRes, wfhRes, lateReqRes, holidayRes] = await Promise.all([
        supabase
          .from("attendance_logs")
          .select("*, employee:employees!employee_id(id, name, email, branch_id, role)")
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
      
      const holidayDates = new Set((holidayRes.data || []).map((h: any) => h.date));

      const attData = attRes.data || [];
      const otData = otRes.data || [];
      const leaveData = leaveRes.data || [];
      const wfhData = wfhRes.data || [];
      const lateReqData = lateReqRes.data || [];

      // For single date mode
      if (dateMode === "single") {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const isHoliday = holidayDates.has(dateStr);
        const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isNonWorkingDay = isHoliday || isWeekend;

        const rows: AttendanceRow[] = [];

        employees.forEach((emp) => {
          const att = attData.find((a: any) => a.employee_id === emp.id);
          const empOt = otData.filter((o: any) => o.employee_id === emp.id);
          const empLeave = leaveData.find(
            (l: any) => l.employee_id === emp.id && l.start_date <= dateStr && l.end_date >= dateStr
          );
          const empWfh = wfhData.find((w: any) => w.employee_id === emp.id && w.date === dateStr);
          const empLateReq = lateReqData.find((lr: any) => lr.employee_id === emp.id);

          // If it's a non-working day and employee has no attendance/OT, skip
          if (isNonWorkingDay && !att && empOt.length === 0) {
            return;
          }

          // Determine status
          let status = "absent";
          if (att?.status) {
            status = att.status;
          } else if (empLeave) {
            status = "leave";
          } else if (empWfh) {
            status = "wfh";
          } else if (isNonWorkingDay && empOt.length > 0) {
            status = "holiday_ot";
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
            otHours: empOt.reduce((sum: number, o: any) => sum + (o.actual_ot_hours || 0), 0),
            otAmount: empOt.reduce((sum: number, o: any) => sum + (o.ot_amount || 0), 0),
            leaveType: empLeave?.leave_type || null,
            isWFH: !!empWfh,
            lateRequestStatus: empLateReq?.status || null,
          });
        });

        setAttendanceRows(rows);
      } else {
        // Range mode - show attendance records + OT without attendance (holiday OT)
        const rows: AttendanceRow[] = [];
        const processedKeys = new Set<string>();

        // First, add all attendance records
        attData.forEach((att: any) => {
          const emp = att.employee || employees.find((e) => e.id === att.employee_id);
          const dateStr = att.work_date;
          const key = `${att.employee_id}-${dateStr}`;
          processedKeys.add(key);

          const empOt = otData.filter((o: any) => o.employee_id === att.employee_id && o.request_date === dateStr);
          const empLeave = leaveData.find(
            (l: any) => l.employee_id === att.employee_id && l.start_date <= dateStr && l.end_date >= dateStr
          );
          const empWfh = wfhData.find((w: any) => w.employee_id === att.employee_id && w.date === dateStr);
          const empLateReq = lateReqData.find(
            (lr: any) => lr.employee_id === att.employee_id && lr.request_date === dateStr
          );

          rows.push({
            id: att.id,
            employee: emp || { id: att.employee_id, name: "Unknown", email: "", branch_id: null, role: "staff" },
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
            otHours: empOt.reduce((sum: number, o: any) => sum + (o.actual_ot_hours || 0), 0),
            otAmount: empOt.reduce((sum: number, o: any) => sum + (o.ot_amount || 0), 0),
            leaveType: empLeave?.leave_type || null,
            isWFH: !!empWfh,
            lateRequestStatus: empLateReq?.status || null,
          });
        });

        // Then, add OT records that don't have attendance (holiday OT)
        otData.forEach((ot: any) => {
          const key = `${ot.employee_id}-${ot.request_date}`;
          if (!processedKeys.has(key)) {
            processedKeys.add(key);
            const emp = employees.find((e) => e.id === ot.employee_id);
            const dateStr = ot.request_date;
            const empOt = otData.filter((o: any) => o.employee_id === ot.employee_id && o.request_date === dateStr);

            rows.push({
              id: `ot-${ot.id}`,
              employee: emp || { id: ot.employee_id, name: "Unknown", email: "", branch_id: null, role: "staff" },
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
              otHours: empOt.reduce((sum: number, o: any) => sum + (o.actual_ot_hours || 0), 0),
              otAmount: empOt.reduce((sum: number, o: any) => sum + (o.ot_amount || 0), 0),
              leaveType: null,
              isWFH: false,
              lateRequestStatus: null,
            });
          }
        });

        // Sort by date descending
        rows.sort((a, b) => b.workDate.localeCompare(a.workDate));
        setAttendanceRows(rows);
      }
    } catch (error: any) {
      console.error("Error fetching attendance:", error);
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถโหลดข้อมูลได้");
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
      // Search filter
      if (searchTerm && !row.employee.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Branch filter
      if (filterBranch !== "all" && row.employee.branch_id !== filterBranch) {
        return false;
      }
      // Status filter
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
  const stats = useMemo(() => {
    const total = filteredRows.length;
    const present = filteredRows.filter((r) => r.status === "present" && !r.isLate).length;
    const late = filteredRows.filter((r) => r.isLate).length;
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
      // Check if already exists
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
      const clockOut = new Date(`${addForm.workDate}T${addForm.clockOutTime}:00`);
      const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

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
      setAddForm({
        employeeId: "",
        workDate: format(new Date(), "yyyy-MM-dd"),
        clockInTime: "09:00",
        clockOutTime: "18:00",
        status: "present",
        isLate: false,
      });
      fetchAttendance();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setSaving(false);
    }
  };

  // Status badge
  const getStatusBadge = (row: AttendanceRow) => {
    if (row.status === "holiday_ot") {
      return <Badge variant="warning">OT วันหยุด</Badge>;
    }
    if (row.leaveType) {
      const leaveLabels: Record<string, string> = {
        sick: "ลาป่วย",
        personal: "ลากิจ",
        annual: "ลาพักร้อน",
      };
      return <Badge variant="info">{leaveLabels[row.leaveType] || "ลา"}</Badge>;
    }
    if (row.isWFH) return <Badge variant="default">WFH</Badge>;
    if (row.status === "absent") return <Badge variant="danger">ขาด</Badge>;
    if (row.isLate) {
      if (row.lateRequestStatus === "approved") {
        return <Badge variant="warning">สาย (อนุมัติ)</Badge>;
      }
      return <Badge variant="warning">สาย {row.lateMinutes}น.</Badge>;
    }
    if (row.status === "present") return <Badge variant="success">ปกติ</Badge>;
    return <Badge variant="default">{row.status}</Badge>;
  };

  return (
    <AdminLayout title="การเข้างาน">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Date Mode Toggle */}
        <div className="flex items-center gap-2 bg-white border border-[#e8e8ed] rounded-xl p-1">
          <button
            onClick={() => setDateMode("single")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              dateMode === "single" ? "bg-[#0071e3] text-white" : "text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            รายวัน
          </button>
          <button
            onClick={() => setDateMode("range")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              dateMode === "range" ? "bg-[#0071e3] text-white" : "text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            ช่วงวัน
          </button>
        </div>

        {/* Date Picker */}
        {dateMode === "single" ? (
          <div className="flex items-center gap-2">
            <button onClick={goToPrevDay} className="p-2 hover:bg-[#f5f5f7] rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-4 py-2 border border-[#e8e8ed] rounded-xl text-sm"
            />
            <button onClick={goToNextDay} className="p-2 hover:bg-[#f5f5f7] rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
            {!isToday(selectedDate) && (
              <button
                onClick={goToToday}
                className="px-3 py-2 text-sm text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg"
              >
                วันนี้
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border border-[#e8e8ed] rounded-xl text-sm"
            />
            <span className="text-[#86868b]">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border border-[#e8e8ed] rounded-xl text-sm"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="secondary" onClick={fetchAttendance} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
          <Button onClick={() => setAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            เพิ่ม Manual
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#e8e8ed] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20"
          />
        </div>
        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className="px-4 py-2 border border-[#e8e8ed] rounded-xl text-sm bg-white"
        >
          <option value="all">ทุกสาขา</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-[#e8e8ed] rounded-xl text-sm bg-white"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="present">ปกติ</option>
          <option value="late">มาสาย</option>
          <option value="absent">ขาด</option>
          <option value="leave">ลา</option>
          <option value="wfh">WFH</option>
          <option value="ot">มี OT</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <Card elevated className="!p-4 text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-[#0071e3]" />
          <p className="text-xl font-bold text-[#1d1d1f]">{stats.total}</p>
          <p className="text-xs text-[#86868b]">ทั้งหมด</p>
        </Card>
        <Card elevated className="!p-4 text-center">
          <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-[#34c759]" />
          <p className="text-xl font-bold text-[#34c759]">{stats.present}</p>
          <p className="text-xs text-[#86868b]">ปกติ</p>
        </Card>
        <Card elevated className="!p-4 text-center">
          <Clock className="w-5 h-5 mx-auto mb-1 text-[#ff9500]" />
          <p className="text-xl font-bold text-[#ff9500]">{stats.late}</p>
          <p className="text-xs text-[#86868b]">สาย</p>
        </Card>
        <Card elevated className="!p-4 text-center">
          <UserX className="w-5 h-5 mx-auto mb-1 text-[#ff3b30]" />
          <p className="text-xl font-bold text-[#ff3b30]">{stats.absent}</p>
          <p className="text-xs text-[#86868b]">ขาด</p>
        </Card>
        <Card elevated className="!p-4 text-center">
          <Calendar className="w-5 h-5 mx-auto mb-1 text-[#af52de]" />
          <p className="text-xl font-bold text-[#af52de]">{stats.leave}</p>
          <p className="text-xs text-[#86868b]">ลา</p>
        </Card>
        <Card elevated className="!p-4 text-center">
          <Home className="w-5 h-5 mx-auto mb-1 text-[#5856d6]" />
          <p className="text-xl font-bold text-[#5856d6]">{stats.wfh}</p>
          <p className="text-xs text-[#86868b]">WFH</p>
        </Card>
        <Card elevated className="!p-4 text-center">
          <Timer className="w-5 h-5 mx-auto mb-1 text-[#ff9500]" />
          <p className="text-xl font-bold text-[#ff9500]">{stats.otHours.toFixed(1)}</p>
          <p className="text-xs text-[#86868b]">ชม. OT</p>
        </Card>
        <Card elevated className="!p-4 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-1 text-[#34c759]" />
          <p className="text-xl font-bold text-[#34c759]">฿{stats.otAmount.toLocaleString()}</p>
          <p className="text-xs text-[#86868b]">เงิน OT</p>
        </Card>
      </div>

      {/* Table */}
      <Card elevated className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]">
                {dateMode === "range" && <th className="px-4 py-3 text-left text-xs font-semibold text-[#86868b]">วันที่</th>}
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#86868b]">พนักงาน</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">เข้างาน</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">ออกงาน</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">ชม.ทำงาน</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">สถานะ</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">OT</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">รูป</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={dateMode === "range" ? 8 : 7} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-[#86868b]">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      กำลังโหลด...
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={dateMode === "range" ? 8 : 7} className="px-4 py-12 text-center text-[#86868b]">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#e8e8ed] hover:bg-[#f5f5f7]/50">
                    {dateMode === "range" && (
                      <td className="px-4 py-3 text-sm text-[#1d1d1f]">
                        {format(new Date(row.workDate), "d MMM", { locale: th })}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Link href={`/admin/employees/${row.employee.id}`} className="flex items-center gap-2 hover:underline">
                        <Avatar name={row.employee.name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-[#1d1d1f]">{row.employee.name}</p>
                          {row.employee.branch_id && (
                            <p className="text-xs text-[#86868b]">
                              {branches.find((b) => b.id === row.employee.branch_id)?.name}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-[#1d1d1f]">
                      {row.clockIn ? format(new Date(row.clockIn), "HH:mm") : "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-[#1d1d1f]">
                      {row.clockOut ? (
                        <span className={row.autoCheckout ? "text-[#ff9500]" : ""}>
                          {format(new Date(row.clockOut), "HH:mm")}
                          {row.autoCheckout && " (auto)"}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-[#0071e3]">
                      {row.workHours ? row.workHours.toFixed(1) : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(row)}</td>
                    <td className="px-4 py-3 text-center">
                      {row.otCount > 0 ? (
                        <div className="text-xs">
                          <p className="font-medium text-[#ff9500]">{row.otHours.toFixed(1)} ชม.</p>
                          <p className="text-[#86868b]">฿{row.otAmount.toLocaleString()}</p>
                        </div>
                      ) : (
                        <span className="text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {row.clockInPhotoUrl && (
                          <button
                            onClick={() => setPhotoModal({ url: row.clockInPhotoUrl!, type: "เข้างาน" })}
                            className="p-1.5 text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg"
                            title="รูปเข้างาน"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        )}
                        {row.clockOutPhotoUrl && (
                          <button
                            onClick={() => setPhotoModal({ url: row.clockOutPhotoUrl!, type: "ออกงาน" })}
                            className="p-1.5 text-[#34c759] hover:bg-[#34c759]/10 rounded-lg"
                            title="รูปออกงาน"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        )}
                        {!row.clockInPhotoUrl && !row.clockOutPhotoUrl && (
                          <span className="text-[#86868b]">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Photo Modal */}
      {photoModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPhotoModal(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-[#ff3b30]"
            >
              <X className="w-8 h-8" />
            </button>
            <p className="text-white text-center mb-4 text-lg font-medium">รูปถ่าย{photoModal.type}</p>
            <img src={photoModal.url} alt={`รูป${photoModal.type}`} className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="เพิ่มการเข้างาน Manual" size="md">
        <div className="space-y-4">
          <Select
            label="พนักงาน"
            value={addForm.employeeId}
            onChange={(v) => setAddForm({ ...addForm, employeeId: v })}
            options={[
              { value: "", label: "เลือกพนักงาน" },
              ...employees.map((e) => ({ value: e.id, label: e.name })),
            ]}
          />
          <DateInput
            label="วันที่"
            value={addForm.workDate}
            onChange={(v) => setAddForm({ ...addForm, workDate: v })}
          />
          <div className="grid grid-cols-2 gap-4">
            <TimeInput
              label="เวลาเข้างาน"
              value={addForm.clockInTime}
              onChange={(v) => setAddForm({ ...addForm, clockInTime: v })}
            />
            <TimeInput
              label="เวลาออกงาน"
              value={addForm.clockOutTime}
              onChange={(v) => setAddForm({ ...addForm, clockOutTime: v })}
            />
          </div>
          <Select
            label="สถานะ"
            value={addForm.status}
            onChange={(v) => setAddForm({ ...addForm, status: v })}
            options={[
              { value: "present", label: "ปกติ" },
              { value: "late", label: "มาสาย" },
            ]}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isLate"
              checked={addForm.isLate}
              onChange={(e) => setAddForm({ ...addForm, isLate: e.target.checked })}
              className="w-4 h-4 rounded border-[#d2d2d7]"
            />
            <label htmlFor="isLate" className="text-sm text-[#1d1d1f]">มาสาย</label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => setAddModal(false)} className="flex-1">
            ยกเลิก
          </Button>
          <Button onClick={handleAddAttendance} loading={saving} className="flex-1">
            บันทึก
          </Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}

export default function AttendancePage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AttendanceContent />
    </ProtectedRoute>
  );
}
