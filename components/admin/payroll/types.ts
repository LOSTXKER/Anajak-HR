/**
 * Admin Payroll Types
 * =============================================
 */

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  branch_id: string | null;
  base_salary: number;
  commission: number;
  is_system_account?: boolean;
}

export interface Branch {
  id: string;
  name: string;
}

export interface PayrollSettings {
  work_hours_per_day: number;
  late_deduction_per_minute: number;
  days_per_month: number;
  work_start_time: string;
}

export interface PayrollData {
  employee: Employee;
  workDays: number;
  totalWorkHours: number;
  lateDays: number;
  lateMinutes: number;
  leaveDays: number;
  ot1xHours: number;
  ot1xAmount: number;
  ot15xHours: number;
  ot15xAmount: number;
  ot2xHours: number;
  ot2xAmount: number;
  otTotalAmount: number;
  basePay: number;
  commission: number;
  latePenalty: number;
  totalPay: number;
}

export interface PayrollSummary {
  totalEmployees: number;
  totalBasePay: number;
  totalCommission: number;
  totalOT1x: number;
  totalOT15x: number;
  totalOT2x: number;
  totalOTPay: number;
  totalLatePenalty: number;
  totalPay: number;
}

export interface OTDetail {
  id: string;
  request_date: string;
  actual_ot_hours: number;
  ot_amount: number;
  ot_rate: number;
  ot_type: string;
  status: string;
}

// Helper function
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
