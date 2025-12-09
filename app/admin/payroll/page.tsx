"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  DollarSign,
  Clock,
  AlertTriangle,
  FileText,
  Calculator,
  Users
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, differenceInMinutes } from "date-fns";
import { th } from "date-fns/locale";

interface PayrollData {
  employee: {
    id: string;
    name: string;
    email: string;
    role: string;
    base_salary_rate: number | null;
    ot_rate_1_5x: number | null;
    ot_rate_2x: number | null;
  };
  workDays: number;
  totalWorkHours: number;
  lateDays: number;
  lateMinutes: number;
  otHours: number;
  otAmount: number;
  basePay: number;
  latePenalty: number;
  totalPay: number;
}

interface Settings {
  work_hours_per_day: number;
  late_penalty_per_minute: number;
  days_per_month: number;
}

function PayrollContent() {
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [employees, setEmployees] = useState<any[]>([]);
  const [settings, setSettings] = useState<Settings>({
    work_hours_per_day: 8,
    late_penalty_per_minute: 0,
    days_per_month: 26,
  });
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalBasePay: 0,
    totalOTPay: 0,
    totalLatePenalty: 0,
    totalPay: 0,
  });

  useEffect(() => {
    fetchEmployees();
    fetchSettings();
  }, []);

  useEffect(() => {
    calculatePayroll();
  }, [currentMonth, selectedEmployee, employees, settings]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, name, email, role, base_salary_rate, ot_rate_1_5x, ot_rate_2x")
      .neq("role", "admin")
      .order("name");
    
    setEmployees(data || []);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["work_hours_per_day", "late_penalty_per_minute", "days_per_month"]);

    if (data) {
      const settingsObj: any = {};
      data.forEach((s: any) => {
        settingsObj[s.key] = parseFloat(s.value) || 0;
      });
      setSettings({
        work_hours_per_day: settingsObj.work_hours_per_day || 8,
        late_penalty_per_minute: settingsObj.late_penalty_per_minute || 0,
        days_per_month: settingsObj.days_per_month || 26,
      });
    }
  };

  const calculatePayroll = async () => {
    if (employees.length === 0) return;
    
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const employeesToProcess = selectedEmployee === "all" 
        ? employees 
        : employees.filter(e => e.id === selectedEmployee);

      const payrollPromises = employeesToProcess.map(async (emp) => {
        // ดึงข้อมูลการเข้างาน
        const { data: attendance } = await supabase
          .from("attendance_logs")
          .select("*")
          .eq("employee_id", emp.id)
          .gte("work_date", startDate)
          .lte("work_date", endDate);

        // ดึงข้อมูล OT ที่ completed
        const { data: otLogs } = await supabase
          .from("ot_requests")
          .select("*")
          .eq("employee_id", emp.id)
          .eq("status", "completed")
          .gte("request_date", startDate)
          .lte("request_date", endDate);

        // ดึงข้อมูลการลา (approved)
        const { data: leaves } = await supabase
          .from("leave_requests")
          .select("*")
          .eq("employee_id", emp.id)
          .eq("status", "approved")
          .gte("start_date", startDate)
          .lte("end_date", endDate);

        // คำนวณข้อมูล
        const workDays = attendance?.length || 0;
        const totalWorkHours = attendance?.reduce((sum: number, a: any) => sum + (a.total_hours || 0), 0) || 0;
        const lateDays = attendance?.filter((a: any) => a.is_late).length || 0;
        
        // คำนวณนาทีสาย (สมมติว่าเริ่มงาน 09:00)
        let lateMinutes = 0;
        attendance?.forEach((a: any) => {
          if (a.is_late && a.clock_in_time) {
            const clockIn = new Date(a.clock_in_time);
            const workStart = new Date(a.clock_in_time);
            workStart.setHours(9, 0, 0, 0);
            if (clockIn > workStart) {
              lateMinutes += differenceInMinutes(clockIn, workStart);
            }
          }
        });

        // คำนวณ OT
        const otHours = otLogs?.reduce((sum: number, ot: any) => sum + (ot.actual_ot_hours || 0), 0) || 0;
        const otAmount = otLogs?.reduce((sum: number, ot: any) => sum + (ot.ot_amount || 0), 0) || 0;

        // คำนวณเงินเดือน
        const baseSalaryRate = emp.base_salary_rate || 0;
        const dailyRate = baseSalaryRate / settings.days_per_month;
        const basePay = workDays * dailyRate;
        
        // หัก penalty สาย
        const latePenalty = lateMinutes * settings.late_penalty_per_minute;

        // รวมทั้งหมด
        const totalPay = basePay + otAmount - latePenalty;

        return {
          employee: emp,
          workDays,
          totalWorkHours,
          lateDays,
          lateMinutes,
          otHours,
          otAmount,
          basePay,
          latePenalty,
          totalPay: Math.max(0, totalPay),
        } as PayrollData;
      });

      const results = await Promise.all(payrollPromises);
      setPayrollData(results);

      // Calculate summary
      setSummary({
        totalEmployees: results.length,
        totalBasePay: results.reduce((sum, r) => sum + r.basePay, 0),
        totalOTPay: results.reduce((sum, r) => sum + r.otAmount, 0),
        totalLatePenalty: results.reduce((sum, r) => sum + r.latePenalty, 0),
        totalPay: results.reduce((sum, r) => sum + r.totalPay, 0),
      });
    } catch (error) {
      console.error("Error calculating payroll:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!payrollData.length) return;

    const headers = [
      "ชื่อพนักงาน",
      "อีเมล",
      "วันทำงาน",
      "ชั่วโมงทำงาน",
      "วันสาย",
      "นาทีสาย",
      "ชั่วโมง OT",
      "เงินเดือนพื้นฐาน",
      "เงิน OT",
      "หักสาย",
      "รวมเงิน",
    ];

    const rows = payrollData.map((r) => [
      r.employee.name,
      r.employee.email,
      r.workDays,
      r.totalWorkHours.toFixed(1),
      r.lateDays,
      r.lateMinutes,
      r.otHours.toFixed(1),
      r.basePay.toFixed(2),
      r.otAmount.toFixed(2),
      r.latePenalty.toFixed(2),
      r.totalPay.toFixed(2),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `payroll-${format(currentMonth, "yyyy-MM")}.csv`;
    link.click();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AdminLayout title="ระบบเงินเดือน (Payroll)">
      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
          </button>
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] min-w-[180px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: th })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
          </button>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-3">
          <Select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            options={[
              { value: "all", label: "พนักงานทั้งหมด" },
              ...employees.map((e) => ({ value: e.id, label: e.name })),
            ]}
          />
          <Button variant="secondary" size="sm" onClick={exportToCSV} disabled={!payrollData.length}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <p className="text-[24px] font-semibold text-[#1d1d1f]">{summary.totalEmployees}</p>
              <p className="text-[12px] text-[#86868b]">พนักงาน</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <p className="text-[20px] font-semibold text-[#34c759]">{formatCurrency(summary.totalBasePay)}</p>
              <p className="text-[12px] text-[#86868b]">เงินเดือน</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <p className="text-[20px] font-semibold text-[#ff9500]">{formatCurrency(summary.totalOTPay)}</p>
              <p className="text-[12px] text-[#86868b]">OT</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff3b30]/10 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#ff3b30]" />
            </div>
            <div>
              <p className="text-[20px] font-semibold text-[#ff3b30]">-{formatCurrency(summary.totalLatePenalty)}</p>
              <p className="text-[12px] text-[#86868b]">หักสาย</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#af52de]/10 rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5 text-[#af52de]" />
            </div>
            <div>
              <p className="text-[20px] font-semibold text-[#af52de]">{formatCurrency(summary.totalPay)}</p>
              <p className="text-[12px] text-[#86868b]">รวมทั้งหมด</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card elevated padding="none">
        <div className="px-6 py-4 border-b border-[#e8e8ed] flex items-center justify-between">
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">รายละเอียดเงินเดือน</h3>
          <Badge variant="info">{format(currentMonth, "MMMM yyyy", { locale: th })}</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payrollData.length === 0 ? (
          <div className="text-center py-20 text-[#86868b]">ไม่มีข้อมูล</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]">
                  <th className="text-left px-6 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                    พนักงาน
                  </th>
                  <th className="text-center px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                    วันทำงาน
                  </th>
                  <th className="text-center px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                    ชั่วโมง
                  </th>
                  <th className="text-center px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                    สาย
                  </th>
                  <th className="text-center px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                    OT
                  </th>
                  <th className="text-right px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                    เงินเดือน
                  </th>
                  <th className="text-right px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                    เงิน OT
                  </th>
                  <th className="text-right px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                    หักสาย
                  </th>
                  <th className="text-right px-6 py-4 text-[12px] font-semibold text-[#86868b] uppercase">
                    รวม
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8ed]">
                {payrollData.map((row) => (
                  <tr key={row.employee.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.employee.name} size="sm" />
                        <div>
                          <p className="text-[14px] font-medium text-[#1d1d1f]">{row.employee.name}</p>
                          <p className="text-[12px] text-[#86868b]">{row.employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-[14px] text-[#1d1d1f]">{row.workDays}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-[14px] text-[#0071e3]">{row.totalWorkHours.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {row.lateDays > 0 ? (
                        <span className="text-[14px] text-[#ff9500]">{row.lateDays} ({row.lateMinutes} นาที)</span>
                      ) : (
                        <span className="text-[14px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {row.otHours > 0 ? (
                        <span className="text-[14px] text-[#ff9500]">{row.otHours.toFixed(1)} ชม.</span>
                      ) : (
                        <span className="text-[14px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-[14px] text-[#1d1d1f]">{formatCurrency(row.basePay)}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {row.otAmount > 0 ? (
                        <span className="text-[14px] font-medium text-[#ff9500]">+{formatCurrency(row.otAmount)}</span>
                      ) : (
                        <span className="text-[14px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {row.latePenalty > 0 ? (
                        <span className="text-[14px] font-medium text-[#ff3b30]">-{formatCurrency(row.latePenalty)}</span>
                      ) : (
                        <span className="text-[14px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[15px] font-semibold text-[#34c759]">{formatCurrency(row.totalPay)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#f5f5f7] border-t-2 border-[#d2d2d7]">
                  <td colSpan={5} className="px-6 py-4 text-[14px] font-semibold text-[#1d1d1f]">
                    รวมทั้งหมด
                  </td>
                  <td className="px-4 py-4 text-right text-[14px] font-semibold text-[#1d1d1f]">
                    {formatCurrency(summary.totalBasePay)}
                  </td>
                  <td className="px-4 py-4 text-right text-[14px] font-semibold text-[#ff9500]">
                    +{formatCurrency(summary.totalOTPay)}
                  </td>
                  <td className="px-4 py-4 text-right text-[14px] font-semibold text-[#ff3b30]">
                    -{formatCurrency(summary.totalLatePenalty)}
                  </td>
                  <td className="px-6 py-4 text-right text-[16px] font-bold text-[#34c759]">
                    {formatCurrency(summary.totalPay)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Info */}
      <div className="mt-6 p-4 bg-[#f5f5f7] rounded-xl">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-[#86868b] mt-0.5" />
          <div className="text-[13px] text-[#86868b]">
            <p className="font-medium text-[#1d1d1f] mb-1">หมายเหตุ:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>เงินเดือนพื้นฐาน = (เงินเดือนเต็ม ÷ {settings.days_per_month} วัน) × วันทำงานจริง</li>
              <li>เงิน OT คำนวณตาม rate ที่ตั้งไว้ในระบบ (1.5x / 2x)</li>
              <li>หักสาย = นาทีสาย × {settings.late_penalty_per_minute} บาท/นาที</li>
              <li>กรุณาตรวจสอบข้อมูลก่อนดำเนินการจ่ายเงินเดือน</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function PayrollPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <PayrollContent />
    </ProtectedRoute>
  );
}

