"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Briefcase,
  DollarSign,
  Edit,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  Home,
  Timer,
  FileText,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { th } from "date-fns/locale";
import Link from "next/link";

// Types
interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  position: string | null;
  branch_id: string | null;
  hire_date: string | null;
  base_salary: number | null;
  account_status: string;
  created_at: string;
  sick_leave_quota: number;
  personal_leave_quota: number;
  annual_leave_quota: number;
  branch?: { id: string; name: string };
}

interface AttendanceRecord {
  id: string;
  work_date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_hours: number | null;
  is_late: boolean;
  late_minutes: number;
  status: string;
  auto_checkout: boolean;
}

interface OTRecord {
  id: string;
  request_date: string;
  ot_type: string;
  approved_ot_hours: number | null;
  actual_ot_hours: number | null;
  ot_amount: number | null;
  ot_rate: number | null;
  status: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  reason: string;
}

interface LeaveRecord {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  reason: string;
  status: string;
  created_at: string;
}

interface WFHRecord {
  id: string;
  date: string;
  is_half_day: boolean;
  reason: string;
  status: string;
  created_at: string;
}

interface LateRequestRecord {
  id: string;
  request_date: string;
  actual_clock_in_time: string;
  reason: string;
  status: string;
  created_at: string;
}

interface MonthlyStats {
  workDays: number;
  lateDays: number;
  absentDays: number;
  otHours: number;
  otAmount: number;
  leaveDays: number;
  wfhDays: number;
}

type TabType = "info" | "attendance" | "ot" | "leave" | "wfh" | "late";

function EmployeeProfileContent() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const employeeId = params.id as string;

  // State
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Data for tabs
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [otData, setOtData] = useState<OTRecord[]>([]);
  const [leaveData, setLeaveData] = useState<LeaveRecord[]>([]);
  const [wfhData, setWfhData] = useState<WFHRecord[]>([]);
  const [lateData, setLateData] = useState<LateRequestRecord[]>([]);
  
  // Leave balance (yearly)
  const [leaveBalance, setLeaveBalance] = useState<{
    sick_used: number;
    personal_used: number;
    annual_used: number;
  }>({ sick_used: 0, personal_used: 0, annual_used: 0 });

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{ type: string; id: string; name: string } | null>(null);
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

  // Fetch tab data
  const fetchTabData = useCallback(async () => {
    if (!employeeId) return;

    const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    try {
      if (activeTab === "attendance") {
        const { data } = await supabase
          .from("attendance_logs")
          .select("*")
          .eq("employee_id", employeeId)
          .gte("work_date", startDate)
          .lte("work_date", endDate)
          .order("work_date", { ascending: false });
        setAttendanceData(data || []);
      } else if (activeTab === "ot") {
        const { data } = await supabase
          .from("ot_requests")
          .select("*")
          .eq("employee_id", employeeId)
          .gte("request_date", startDate)
          .lte("request_date", endDate)
          .order("request_date", { ascending: false });
        setOtData(data || []);
      } else if (activeTab === "leave") {
        // Fetch leave data for current month
        const { data } = await supabase
          .from("leave_requests")
          .select("*")
          .eq("employee_id", employeeId)
          .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
          .order("start_date", { ascending: false });
        setLeaveData(data || []);
        
        // Fetch yearly leave usage (approved only)
        const currentYear = new Date().getFullYear();
        const yearStart = `${currentYear}-01-01`;
        const yearEnd = `${currentYear}-12-31`;
        
        const { data: yearlyLeave } = await supabase
          .from("leave_requests")
          .select("leave_type, start_date, end_date, is_half_day")
          .eq("employee_id", employeeId)
          .eq("status", "approved")
          .gte("start_date", yearStart)
          .lte("start_date", yearEnd);
        
        // Calculate used days per type
        const usedDays = { sick_used: 0, personal_used: 0, annual_used: 0 };
        (yearlyLeave || []).forEach((leave: any) => {
          const start = new Date(leave.start_date);
          const end = new Date(leave.end_date);
          const days = leave.is_half_day ? 0.5 : Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          if (leave.leave_type === "sick") usedDays.sick_used += days;
          else if (leave.leave_type === "personal") usedDays.personal_used += days;
          else if (leave.leave_type === "annual") usedDays.annual_used += days;
        });
        setLeaveBalance(usedDays);
      } else if (activeTab === "wfh") {
        const { data } = await supabase
          .from("wfh_requests")
          .select("*")
          .eq("employee_id", employeeId)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false });
        setWfhData(data || []);
      } else if (activeTab === "late") {
        const { data } = await supabase
          .from("late_requests")
          .select("*")
          .eq("employee_id", employeeId)
          .gte("request_date", startDate)
          .lte("request_date", endDate)
          .order("request_date", { ascending: false });
        setLateData(data || []);
      }
    } catch (error) {
      console.error("Error fetching tab data:", error);
    }
  }, [employeeId, activeTab, currentMonth]);

  // Effects
  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  useEffect(() => {
    if (activeTab !== "info") {
      fetchTabData();
    }
  }, [activeTab, currentMonth, fetchTabData]);

  // Monthly stats
  const monthlyStats = useMemo((): MonthlyStats => {
    return {
      workDays: attendanceData.filter((a) => a.clock_in_time).length,
      lateDays: attendanceData.filter((a) => a.is_late).length,
      absentDays: 0, // Calculate based on expected work days
      otHours: otData
        .filter((o) => o.status === "completed" || o.status === "approved")
        .reduce((sum, o) => sum + (o.actual_ot_hours || o.approved_ot_hours || 0), 0),
      otAmount: otData
        .filter((o) => o.status === "completed" || o.status === "approved")
        .reduce((sum, o) => sum + (o.ot_amount || 0), 0),
      leaveDays: leaveData.filter((l) => l.status === "approved").length,
      wfhDays: wfhData.filter((w) => w.status === "approved").length,
    };
  }, [attendanceData, otData, leaveData, wfhData]);

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

      toast.success("บันทึกสำเร็จ", "อัปเดตข้อมูลพนักงานเรียบร้อย");
      setEditMode(false);
      fetchEmployee();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถบันทึกได้");
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
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถลบได้");
    } finally {
      setDeleting(false);
    }
  };

  // Helper functions
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">อนุมัติ</Badge>;
      case "pending":
        return <Badge variant="warning">รออนุมัติ</Badge>;
      case "rejected":
        return <Badge variant="danger">ปฏิเสธ</Badge>;
      case "completed":
        return <Badge variant="success">เสร็จสิ้น</Badge>;
      case "started":
        return <Badge variant="info">กำลังทำ</Badge>;
      case "cancelled":
        return <Badge variant="default">ยกเลิก</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getOTTypeLabel = (type: string) => {
    switch (type) {
      case "weekday":
        return "วันทำงาน";
      case "weekend":
        return "วันหยุด";
      case "holiday":
        return "นักขัตฤกษ์";
      default:
        return type;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case "sick":
        return "ลาป่วย";
      case "personal":
        return "ลากิจ";
      case "annual":
        return "ลาพักร้อน";
      case "maternity":
        return "ลาคลอด";
      default:
        return type;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "ผู้ดูแลระบบ";
      case "supervisor":
        return "หัวหน้างาน";
      case "employee":
        return "พนักงาน";
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <AdminLayout title="โปรไฟล์พนักงาน">
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-3 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!employee) {
    return (
      <AdminLayout title="โปรไฟล์พนักงาน">
        <div className="text-center py-20">
          <User className="w-16 h-16 mx-auto text-[#86868b] mb-4" />
          <p className="text-[#86868b]">ไม่พบข้อมูลพนักงาน</p>
          <Link href="/admin/employees" className="text-[#0071e3] mt-2 inline-block">
            ← กลับไปหน้ารายชื่อ
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={employee.name}>
      {/* Back Button */}
      <Link
        href="/admin/employees"
        className="inline-flex items-center gap-1.5 text-[#0071e3] hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        กลับไปหน้ารายชื่อพนักงาน
      </Link>

      {/* Profile Header */}
      <Card elevated className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <Avatar name={employee.name} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-[#1d1d1f]">{employee.name}</h1>
              <Badge variant={employee.account_status === "approved" ? "success" : "warning"}>
                {employee.account_status === "approved" ? "Active" : employee.account_status}
              </Badge>
              <Badge variant="default">{getRoleLabel(employee.role)}</Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-[#86868b]">
              {employee.position && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {employee.position}
                </span>
              )}
              {employee.branch?.name && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {employee.branch.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {employee.email}
              </span>
              {employee.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {employee.phone}
                </span>
              )}
            </div>
          </div>
          {!editMode && activeTab === "info" && (
            <Button onClick={() => setEditMode(true)}>
              <Edit className="w-4 h-4" />
              แก้ไข
            </Button>
          )}
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "วันทำงาน", value: monthlyStats.workDays, icon: Calendar, color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
          { label: "วันสาย", value: monthlyStats.lateDays, icon: AlertTriangle, color: "text-[#ff9500]", bg: "bg-[#ff9500]/10" },
          { label: "ชม. OT", value: monthlyStats.otHours.toFixed(1), icon: Clock, color: "text-[#0071e3]", bg: "bg-[#0071e3]/10" },
          { label: "เงิน OT", value: `฿${monthlyStats.otAmount.toLocaleString()}`, icon: DollarSign, color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
          { label: "วันลา", value: monthlyStats.leaveDays, icon: FileText, color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10" },
          { label: "วัน WFH", value: monthlyStats.wfhDays, icon: Home, color: "text-[#af52de]", bg: "bg-[#af52de]/10" },
        ].map((stat, i) => (
          <Card key={i} elevated className="!p-3">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-[#86868b]">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#f5f5f7] rounded-xl mb-6 overflow-x-auto">
        {[
          { id: "info", label: "ข้อมูล", icon: User },
          { id: "attendance", label: "Attendance", icon: Clock },
          { id: "ot", label: "OT", icon: Timer },
          { id: "leave", label: "ลา", icon: Calendar },
          { id: "wfh", label: "WFH", icon: Home },
          { id: "late", label: "สาย", icon: AlertTriangle },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as TabType);
              setEditMode(false);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-white shadow-sm text-[#1d1d1f]"
                : "text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Month Navigation (for tabs except info) */}
      {activeTab !== "info" && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
          </button>
          <h3 className="text-lg font-semibold text-[#1d1d1f] min-w-[160px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: th })}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "info" && (
        <Card elevated>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#1d1d1f] border-b border-[#e8e8ed] pb-2">ข้อมูลพื้นฐาน</h3>
              {editMode ? (
                <>
                  <Input
                    label="ชื่อ-นามสกุล"
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <Input
                    label="อีเมล"
                    type="email"
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                  <Input
                    label="เบอร์โทร"
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                  <Input
                    label="ตำแหน่ง"
                    value={editForm.position || ""}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  />
                  <Select
                    label="สาขา"
                    value={editForm.branch_id || ""}
                    onChange={(v) => setEditForm({ ...editForm, branch_id: v })}
                    options={[{ value: "", label: "ไม่ระบุ" }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
                  />
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-[#f5f5f7]">
                    <span className="text-[#86868b]">ชื่อ-นามสกุล</span>
                    <span className="font-medium text-[#1d1d1f]">{employee.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#f5f5f7]">
                    <span className="text-[#86868b]">อีเมล</span>
                    <span className="font-medium text-[#1d1d1f]">{employee.email}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#f5f5f7]">
                    <span className="text-[#86868b]">เบอร์โทร</span>
                    <span className="font-medium text-[#1d1d1f]">{employee.phone || "-"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#f5f5f7]">
                    <span className="text-[#86868b]">ตำแหน่ง</span>
                    <span className="font-medium text-[#1d1d1f]">{employee.position || "-"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#f5f5f7]">
                    <span className="text-[#86868b]">สาขา</span>
                    <span className="font-medium text-[#1d1d1f]">{employee.branch?.name || "-"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#f5f5f7]">
                    <span className="text-[#86868b]">วันเริ่มงาน</span>
                    <span className="font-medium text-[#1d1d1f]">
                      {employee.hire_date ? format(new Date(employee.hire_date), "d MMMM yyyy", { locale: th }) : "-"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Salary & Leave Quota */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#1d1d1f] border-b border-[#e8e8ed] pb-2">เงินเดือน & โควต้าลา</h3>
              {editMode ? (
                <>
                  <Input
                    label="เงินเดือน (฿)"
                    type="number"
                    value={editForm.base_salary?.toString() || ""}
                    onChange={(e) => setEditForm({ ...editForm, base_salary: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    label="โควต้าลาป่วย (วัน)"
                    type="number"
                    value={editForm.sick_leave_quota?.toString() || ""}
                    onChange={(e) => setEditForm({ ...editForm, sick_leave_quota: parseInt(e.target.value) || 0 })}
                  />
                  <Input
                    label="โควต้าลากิจ (วัน)"
                    type="number"
                    value={editForm.personal_leave_quota?.toString() || ""}
                    onChange={(e) => setEditForm({ ...editForm, personal_leave_quota: parseInt(e.target.value) || 0 })}
                  />
                  <Input
                    label="โควต้าลาพักร้อน (วัน)"
                    type="number"
                    value={editForm.annual_leave_quota?.toString() || ""}
                    onChange={(e) => setEditForm({ ...editForm, annual_leave_quota: parseInt(e.target.value) || 0 })}
                  />
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-[#f5f5f7]">
                    <span className="text-[#86868b]">เงินเดือน</span>
                    <span className="font-medium text-[#34c759]">
                      ฿{employee.base_salary?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#f5f5f7]">
                    <span className="text-[#86868b]">โควต้าลาป่วย</span>
                    <span className="font-medium text-[#1d1d1f]">{employee.sick_leave_quota || 0} วัน</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#f5f5f7]">
                    <span className="text-[#86868b]">โควต้าลากิจ</span>
                    <span className="font-medium text-[#1d1d1f]">{employee.personal_leave_quota || 0} วัน</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#f5f5f7]">
                    <span className="text-[#86868b]">โควต้าลาพักร้อน</span>
                    <span className="font-medium text-[#1d1d1f]">{employee.annual_leave_quota || 0} วัน</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Edit Actions */}
          {editMode && (
            <div className="flex gap-3 mt-6 pt-6 border-t border-[#e8e8ed]">
              <Button variant="secondary" onClick={() => { setEditMode(false); setEditForm(employee); }} className="flex-1">
                <X className="w-4 h-4" />
                ยกเลิก
              </Button>
              <Button onClick={handleSave} loading={saving} className="flex-1">
                <Save className="w-4 h-4" />
                บันทึก
              </Button>
            </div>
          )}
        </Card>
      )}

      {activeTab === "attendance" && (
        <Card elevated padding="none">
          {attendanceData.length === 0 ? (
            <div className="text-center py-16 text-[#86868b]">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>ไม่มีข้อมูลการเข้างานในเดือนนี้</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase">วันที่</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">เข้า</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">ออก</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">ชม.</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">สถานะ</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8ed]">
                  {attendanceData.map((att) => (
                    <tr key={att.id} className="hover:bg-[#f5f5f7]/50">
                      <td className="px-4 py-3 text-sm font-medium text-[#1d1d1f]">
                        {format(new Date(att.work_date), "d MMM yyyy", { locale: th })}
                      </td>
                      <td className="text-center px-3 py-3 text-sm text-[#1d1d1f]">
                        {att.clock_in_time ? format(new Date(att.clock_in_time), "HH:mm") : "-"}
                      </td>
                      <td className="text-center px-3 py-3 text-sm text-[#1d1d1f]">
                        {att.clock_out_time ? format(new Date(att.clock_out_time), "HH:mm") : "-"}
                      </td>
                      <td className="text-center px-3 py-3 text-sm font-semibold text-[#0071e3]">
                        {att.total_hours?.toFixed(1) || "-"}
                      </td>
                      <td className="text-center px-3 py-3">
                        {att.is_late ? (
                          <Badge variant="warning">สาย {att.late_minutes}น.</Badge>
                        ) : att.status === "holiday" ? (
                          <Badge variant="info">วันหยุด</Badge>
                        ) : (
                          <Badge variant="success">ปกติ</Badge>
                        )}
                        {att.auto_checkout && <span className="ml-1 text-[10px] text-[#0071e3]">Auto</span>}
                      </td>
                      <td className="text-right px-4 py-3">
                        <Link
                          href={`/admin/attendance/edit/${att.id}`}
                          className="text-xs text-[#0071e3] hover:underline"
                        >
                          แก้ไข
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "ot" && (
        <Card elevated padding="none">
          {otData.length === 0 ? (
            <div className="text-center py-16 text-[#86868b]">
              <Timer className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>ไม่มีข้อมูล OT ในเดือนนี้</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase">วันที่</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">ประเภท</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">ชม.</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">อัตรา</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">เงิน</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">สถานะ</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8ed]">
                  {otData.map((ot) => (
                    <tr key={ot.id} className="hover:bg-[#f5f5f7]/50">
                      <td className="px-4 py-3 text-sm font-medium text-[#1d1d1f]">
                        {format(new Date(ot.request_date), "d MMM yyyy", { locale: th })}
                      </td>
                      <td className="text-center px-3 py-3 text-sm text-[#1d1d1f]">
                        {getOTTypeLabel(ot.ot_type)}
                      </td>
                      <td className="text-center px-3 py-3 text-sm font-semibold text-[#0071e3]">
                        {ot.actual_ot_hours?.toFixed(1) || ot.approved_ot_hours?.toFixed(1) || "-"}
                      </td>
                      <td className="text-center px-3 py-3 text-sm text-[#86868b]">
                        {ot.ot_rate?.toFixed(1)}x
                      </td>
                      <td className="text-right px-3 py-3 text-sm font-semibold text-[#34c759]">
                        ฿{ot.ot_amount?.toLocaleString() || 0}
                      </td>
                      <td className="text-center px-3 py-3">
                        {getStatusBadge(ot.status)}
                      </td>
                      <td className="text-right px-4 py-3">
                        <button
                          onClick={() => setDeleteModal({ type: "ot", id: ot.id, name: `OT ${format(new Date(ot.request_date), "d MMM", { locale: th })}` })}
                          className="text-xs text-[#ff3b30] hover:underline"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "leave" && (
        <>
          {/* Leave Quota Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { 
                type: "ลาป่วย", 
                quota: employee.sick_leave_quota || 0, 
                used: leaveBalance.sick_used,
                color: "text-[#ff3b30]", 
                bg: "bg-[#ff3b30]/10" 
              },
              { 
                type: "ลากิจ", 
                quota: employee.personal_leave_quota || 0, 
                used: leaveBalance.personal_used,
                color: "text-[#ff9500]", 
                bg: "bg-[#ff9500]/10" 
              },
              { 
                type: "ลาพักร้อน", 
                quota: employee.annual_leave_quota || 0, 
                used: leaveBalance.annual_used,
                color: "text-[#0071e3]", 
                bg: "bg-[#0071e3]/10" 
              },
            ].map((q, i) => {
              const remaining = q.quota - q.used;
              return (
                <Card key={i} elevated className="!p-4">
                  <div className={`text-xs font-medium ${q.color} mb-1`}>{q.type}</div>
                  <div className="text-2xl font-bold text-[#1d1d1f]">{remaining}</div>
                  <div className="text-xs text-[#86868b]">
                    คงเหลือ <span className="text-[#1d1d1f]">({q.used}/{q.quota} วัน)</span>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card elevated padding="none">
            {leaveData.length === 0 ? (
              <div className="text-center py-16 text-[#86868b]">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>ไม่มีข้อมูลการลาในเดือนนี้</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase">วันที่</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">ประเภท</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">เหตุผล</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">สถานะ</th>
                      <th className="text-right px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e8ed]">
                    {leaveData.map((leave) => (
                      <tr key={leave.id} className="hover:bg-[#f5f5f7]/50">
                        <td className="px-4 py-3 text-sm font-medium text-[#1d1d1f]">
                          {format(new Date(leave.start_date), "d MMM", { locale: th })}
                          {leave.start_date !== leave.end_date && (
                            <> - {format(new Date(leave.end_date), "d MMM", { locale: th })}</>
                          )}
                          {leave.is_half_day && <span className="text-xs text-[#86868b]"> (ครึ่งวัน)</span>}
                        </td>
                        <td className="text-center px-3 py-3">
                          <Badge variant="info">{getLeaveTypeLabel(leave.leave_type)}</Badge>
                        </td>
                        <td className="px-3 py-3 text-sm text-[#86868b] max-w-[200px] truncate">
                          {leave.reason || "-"}
                        </td>
                        <td className="text-center px-3 py-3">
                          {getStatusBadge(leave.status)}
                        </td>
                        <td className="text-right px-4 py-3">
                          {leave.status === "pending" && (
                            <button
                              onClick={() => setDeleteModal({ type: "leave", id: leave.id, name: `ลา ${getLeaveTypeLabel(leave.leave_type)}` })}
                              className="text-xs text-[#ff3b30] hover:underline"
                            >
                              ยกเลิก
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === "wfh" && (
        <Card elevated padding="none">
          {wfhData.length === 0 ? (
            <div className="text-center py-16 text-[#86868b]">
              <Home className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>ไม่มีข้อมูล WFH ในเดือนนี้</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase">วันที่</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">ประเภท</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">เหตุผล</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">สถานะ</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8ed]">
                  {wfhData.map((wfh) => (
                    <tr key={wfh.id} className="hover:bg-[#f5f5f7]/50">
                      <td className="px-4 py-3 text-sm font-medium text-[#1d1d1f]">
                        {format(new Date(wfh.date), "d MMM yyyy", { locale: th })}
                      </td>
                      <td className="text-center px-3 py-3 text-sm text-[#1d1d1f]">
                        {wfh.is_half_day ? "ครึ่งวัน" : "เต็มวัน"}
                      </td>
                      <td className="px-3 py-3 text-sm text-[#86868b] max-w-[200px] truncate">
                        {wfh.reason || "-"}
                      </td>
                      <td className="text-center px-3 py-3">
                        {getStatusBadge(wfh.status)}
                      </td>
                      <td className="text-right px-4 py-3">
                        {wfh.status === "pending" && (
                          <button
                            onClick={() => setDeleteModal({ type: "wfh", id: wfh.id, name: `WFH ${format(new Date(wfh.date), "d MMM", { locale: th })}` })}
                            className="text-xs text-[#ff3b30] hover:underline"
                          >
                            ยกเลิก
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "late" && (
        <Card elevated padding="none">
          {lateData.length === 0 ? (
            <div className="text-center py-16 text-[#86868b]">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>ไม่มีคำขอมาสายในเดือนนี้</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#86868b] uppercase">วันที่</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">เวลาเข้างาน</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">เหตุผล</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8ed]">
                  {lateData.map((late) => (
                    <tr key={late.id} className="hover:bg-[#f5f5f7]/50">
                      <td className="px-4 py-3 text-sm font-medium text-[#1d1d1f]">
                        {format(new Date(late.request_date), "d MMM yyyy", { locale: th })}
                      </td>
                      <td className="text-center px-3 py-3 text-sm text-[#ff9500] font-medium">
                        {late.actual_clock_in_time ? format(new Date(late.actual_clock_in_time), "HH:mm") : "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-[#86868b] max-w-[200px] truncate">
                        {late.reason || "-"}
                      </td>
                      <td className="text-center px-3 py-3">
                        {getStatusBadge(late.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="ยืนยันการลบ"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-[#ff3b30]/10 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-[#ff3b30]" />
          </div>
          <p className="text-[#1d1d1f] mb-2">
            ต้องการลบ <strong>{deleteModal?.name}</strong> หรือไม่?
          </p>
          <p className="text-sm text-[#86868b]">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="secondary" onClick={() => setDeleteModal(null)} className="flex-1">
            ยกเลิก
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting} className="flex-1">
            ลบ
          </Button>
        </div>
      </Modal>
    </AdminLayout>
  );
}

export default function EmployeeProfilePage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <EmployeeProfileContent />
    </ProtectedRoute>
  );
}

