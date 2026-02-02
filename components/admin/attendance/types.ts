/**
 * Admin Attendance Types
 * =============================================
 */

export interface Employee {
  id: string;
  name: string;
  email: string;
  branch_id: string | null;
  role: string;
}

export interface Branch {
  id: string;
  name: string;
}

export interface AttendanceRow {
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
  isFieldWork: boolean;
  fieldWorkLocation: string | null;
  lateRequestStatus: string | null;
}

export interface AttendanceStats {
  total: number;
  present: number;
  late: number;
  absent: number;
  leave: number;
  wfh: number;
  otHours: number;
  otAmount: number;
}

export interface AddAttendanceForm {
  employeeId: string;
  workDate: string;
  clockInTime: string;
  clockOutTime: string;
  status: string;
  isLate: boolean;
}

export type DateMode = "single" | "range";
