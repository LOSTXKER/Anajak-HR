/**
 * Employee Detail Types
 * =============================================
 */

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  position: string | null;
  branch_id: string | null;
  hire_date: string | null;
  base_salary: number | null;
  commission: number | null;
  account_status: string;
  created_at: string;
  sick_leave_quota: number;
  personal_leave_quota: number;
  annual_leave_quota: number;
  branch?: { id: string; name: string };
}

export interface Branch {
  id: string;
  name: string;
}

export interface AttendanceRecord {
  id: string;
  work_date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_hours: number | null;
  is_late: boolean;
  late_minutes: number;
  status: string;
  work_mode: "onsite" | "wfh" | "field" | null;
  auto_checkout: boolean;
  note: string | null;
}

export interface OTRecord {
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

export interface LeaveRecord {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  reason: string;
  status: string;
  created_at: string;
}

export interface WFHRecord {
  id: string;
  date: string;
  is_half_day: boolean;
  reason: string;
  status: string;
  created_at: string;
}

export interface LateRequestRecord {
  id: string;
  request_date: string;
  actual_late_minutes: number | null;
  reason: string;
  status: string;
  created_at: string;
}

export interface LeaveBalance {
  sick_used: number;
  personal_used: number;
  annual_used: number;
}

export interface MonthlyStats {
  workDays: number;
  lateDays: number;
  absentDays: number;
  otHours: number;
  otAmount: number;
  leaveDays: number;
  wfhDays: number;
}

export type TabType = "info" | "attendance" | "ot" | "leave" | "wfh" | "late";

// Helper functions
export function getStatusBadgeVariant(status: string): "success" | "warning" | "danger" | "info" | "default" {
  switch (status) {
    case "approved":
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "danger";
    case "started":
      return "info";
    case "cancelled":
    default:
      return "default";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "approved":
      return "อนุมัติ";
    case "pending":
      return "รออนุมัติ";
    case "rejected":
      return "ปฏิเสธ";
    case "completed":
      return "เสร็จสิ้น";
    case "started":
      return "กำลังทำ";
    case "cancelled":
      return "ยกเลิก";
    default:
      return status;
  }
}

export function getOTTypeLabel(type: string): string {
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
}

export function getLeaveTypeLabel(type: string): string {
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
}

export function getRoleLabel(role: string): string {
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
}
