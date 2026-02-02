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
}

export interface EditFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  baseSalary: string;
  annualQuota: number;
  sickQuota: number;
  personalQuota: number;
}
