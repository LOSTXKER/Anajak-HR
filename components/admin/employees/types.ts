/**
 * Employee Types
 * =============================================
 */

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  base_salary: number | null;
  annual_leave_quota: number;
  sick_leave_quota: number;
  personal_leave_quota: number;
  account_status: string;
  branch_id: string | null;
  branch?: { name: string } | null;
  is_system_account?: boolean;
  work_arrangement?: string | null;
  created_at?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  employment_status?: string | null;
  resignation_date?: string | null;
  last_working_date?: string | null;
  resignation_reason?: string | null;
}

export interface LeaveBalance {
  annual_used: number;
  annual_remaining: number;
  sick_used: number;
  sick_remaining: number;
  personal_used: number;
  personal_remaining: number;
}

export interface EmployeeStats {
  total: number;
  approved: number;
  pending: number;
  admins: number;
  deleted?: number;
}

export interface EditFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  baseSalary: string;
  workArrangement: string;
  annualQuota: number;
  sickQuota: number;
  personalQuota: number;
}

export interface ResignFormData {
  type: "resigned" | "terminated";
  resignationDate: string;
  lastWorkingDate: string;
  reason: string;
}

export interface EmploymentHistoryEntry {
  id: string;
  employee_id: string;
  action: string;
  effective_date: string;
  reason: string | null;
  performed_by: string | null;
  created_at: string;
  performer?: { name: string } | null;
}
