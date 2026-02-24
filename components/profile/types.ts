export interface AttendanceRecord {
  id: string;
  work_date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  total_hours: number | null;
  is_late: boolean;
  late_minutes: number;
  status: string;
  work_mode: "onsite" | "wfh" | "field" | null;
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
}

export interface WFHRecord {
  id: string;
  date: string;
  is_half_day: boolean;
  reason: string;
  status: string;
}

export interface LateRequestRecord {
  id: string;
  request_date: string;
  actual_late_minutes: number | null;
  reason: string;
  status: string;
}

export interface LeaveQuota {
  type: string;
  label: string;
  quota: number;
  used: number;
  remaining: number;
  color: string;
}

export type TabType = "overview" | "attendance" | "ot" | "leave" | "wfh" | "late" | "badges";

export interface MonthlyStats {
  workDays: number;
  lateDays: number;
  totalHours: number;
  otHours: number;
  otAmount: number;
  leaveDays: number;
  wfhDays: number;
}
