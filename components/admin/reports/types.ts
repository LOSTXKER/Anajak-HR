/**
 * Reports Types
 * =============================================
 */

export interface Branch {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  branch_id: string | null;
}

export interface AttendanceLog {
  id: string;
  employee_id: string;
  work_date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_hours: number | null;
  is_late: boolean;
  late_minutes: number | null;
  status: string;
}

export interface OTRequest {
  id: string;
  employee_id: string;
  request_date: string;
  ot_type: string;
  status: string;
  actual_ot_hours: number | null;
  approved_ot_hours: number | null;
  ot_amount: number | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  status: string;
}

export interface WFHRequest {
  id: string;
  employee_id: string;
  date: string;
  is_half_day: boolean;
  status: string;
}

export interface EmployeeReport {
  id: string;
  name: string;
  email: string;
  role: string;
  branch_id: string | null;
  branchName: string;
  workDays: number;
  workHours: number;
  lateDays: number;
  lateMinutes: number;
  leaveDays: number;
  wfhDays: number;
  otHours: number;
  otAmount: number;
}

export interface ReportSummary {
  totalEmployees: number;
  totalWorkDays: number;
  totalWorkHours: number;
  totalLateDays: number;
  totalLeaveDays: number;
  totalWFHDays: number;
  totalOTHours: number;
  totalOTAmount: number;
}

export interface DailyStat {
  date: string;
  fullDate: string;
  attendance: number;
  late: number;
  otHours: number;
  leave: number;
  wfh: number;
}

export interface BranchStat {
  name: string;
  otHours: number;
  lateDays: number;
  employees: number;
}

export interface OTTypeStat {
  [key: string]: string | number;
  name: string;
  value: number;
  color: string;
}

// Helper function
export function getRoleLabel(role: string): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "supervisor":
      return "Supervisor";
    default:
      return "พนักงาน";
  }
}
