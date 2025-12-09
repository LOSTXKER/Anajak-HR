"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  DollarSign,
  Clock,
  AlertTriangle,
  FileText,
  Calculator,
  Users,
  Gift,
  Search,
  Building2,
  Filter,
  HelpCircle,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, differenceInMinutes } from "date-fns";
import { th } from "date-fns/locale";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  branch_id: string | null;
  base_salary: number;
  commission: number;
  is_system_account: boolean;
}

interface PayrollData {
  employee: Employee;
  workDays: number;
  totalWorkHours: number;
  lateDays: number;
  lateMinutes: number;
  leaveDays: number;
  otHours: number;
  otAmount: number;
  basePay: number;
  commission: number;
  latePenalty: number;
  totalPay: number;
}

interface Settings {
  work_hours_per_day: number;
  late_deduction_per_minute: number;
  days_per_month: number;
  work_start_time: string;
}

interface Branch {
  id: string;
  name: string;
}

function PayrollContent() {
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [settings, setSettings] = useState<Settings>({
    work_hours_per_day: 8,
    late_deduction_per_minute: 0,
    days_per_month: 26,
    work_start_time: "09:00",
  });
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalBasePay: 0,
    totalCommission: 0,
    totalOTPay: 0,
    totalLatePenalty: 0,
    totalPay: 0,
  });

  useEffect(() => {
    fetchEmployees();
    fetchBranches();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      calculatePayroll();
    }
  }, [currentMonth, selectedEmployee, selectedBranch, employees, settings]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from("branches")
      .select("id, name")
      .order("name");
    setBranches(data || []);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, name, email, role, branch_id, base_salary, commission, is_system_account")
      .eq("account_status", "approved")
      .order("name");
    
    // Filter out system accounts (not real employees)
    const includedEmployees = (data || []).filter(e => !e.is_system_account);
    setEmployees(includedEmployees);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["hours_per_day", "late_deduction_per_minute", "days_per_month", "work_start_time"]);

    if (data) {
      const settingsObj: any = {};
      data.forEach((s: any) => {
        settingsObj[s.setting_key] = s.setting_value;
      });
      setSettings({
        work_hours_per_day: parseFloat(settingsObj.hours_per_day) || 8,
        late_deduction_per_minute: parseFloat(settingsObj.late_deduction_per_minute) || 0,
        days_per_month: parseFloat(settingsObj.days_per_month) || 26,
        work_start_time: settingsObj.work_start_time || "09:00",
      });
    }
  };

  const calculatePayroll = async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      // Filter employees
      let employeesToProcess = employees;
      
      if (selectedEmployee !== "all") {
        employeesToProcess = employees.filter(e => e.id === selectedEmployee);
      }
      
      if (selectedBranch !== "all") {
        employeesToProcess = employeesToProcess.filter(e => 
          selectedBranch === "none" ? !e.branch_id : e.branch_id === selectedBranch
        );
      }

      const payrollPromises = employeesToProcess.map(async (emp) => {
        // ดึงข้อมูลการเข้างาน
        const { data: attendance } = await supabase
          .from("attendance_logs")
          .select("*")
          .eq("employee_id", emp.id)
          .gte("work_date", startDate)
          .lte("work_date", endDate);

        // ดึงข้อมูล OT ที่มี actual_end_time (เสร็จแล้ว)
        const { data: otLogs } = await supabase
          .from("ot_requests")
          .select("*")
          .eq("employee_id", emp.id)
          .not("actual_end_time", "is", null)
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

        // ดึงคำขอมาสายที่อนุมัติแล้ว (ไม่หักเงินสาย)
        const { data: approvedLateRequests } = await supabase
          .from("late_requests")
          .select("request_date")
          .eq("employee_id", emp.id)
          .eq("status", "approved")
          .gte("request_date", startDate)
          .lte("request_date", endDate);
        
        const approvedLateDates = new Set(
          (approvedLateRequests || []).map(r => r.request_date)
        );

        // คำนวณข้อมูล
        const workDays = attendance?.filter(a => a.status !== "holiday").length || 0;
        const totalWorkHours = attendance?.reduce((sum: number, a: any) => sum + (a.total_hours || 0), 0) || 0;
        const lateDays = attendance?.filter((a: any) => a.is_late).length || 0;
        
        // คำนวณนาทีสาย (ไม่รวมวันที่มี approved late request)
        let lateMinutes = 0;
        const [startHour, startMinute] = settings.work_start_time.split(":").map(Number);
        const MAX_LATE_MINUTES = 120; // สูงสุด 2 ชั่วโมง ถ้าเกินถือว่าไม่ใช่การมาสาย
        
        attendance?.forEach((a: any) => {
          // ถ้าวันนี้มี approved late request ไม่นับเป็นสาย
          if (approvedLateDates.has(a.work_date)) {
            return;
          }
          
          if (a.is_late && a.clock_in_time) {
            // ถ้ามี late_minutes ในฐานข้อมูลให้ใช้เลย
            if (a.late_minutes && a.late_minutes > 0) {
              lateMinutes += Math.min(a.late_minutes, MAX_LATE_MINUTES);
            } else {
              // คำนวณเอง
              const clockIn = new Date(a.clock_in_time);
              const clockInHour = clockIn.getHours();
              const clockInMinute = clockIn.getMinutes();
              
              const clockInTotalMinutes = clockInHour * 60 + clockInMinute;
              const workStartTotalMinutes = startHour * 60 + startMinute;
              
              if (clockInTotalMinutes > workStartTotalMinutes) {
                const mins = clockInTotalMinutes - workStartTotalMinutes;
                // ถ้าเกิน threshold ไม่นับเป็นสาย (อาจเช็คอินช่วงบ่าย/เย็น)
                if (mins <= MAX_LATE_MINUTES) {
                  lateMinutes += mins;
                }
              }
            }
          }
        });

        // คำนวณวันลา
        let leaveDays = 0;
        leaves?.forEach((l: any) => {
          const start = new Date(l.start_date);
          const end = new Date(l.end_date);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          leaveDays += l.is_half_day ? 0.5 : days;
        });

        // คำนวณ OT
        const otHours = otLogs?.reduce((sum: number, ot: any) => sum + (ot.actual_ot_hours || 0), 0) || 0;
        const otAmount = otLogs?.reduce((sum: number, ot: any) => sum + (ot.ot_amount || 0), 0) || 0;

        // คำนวณเงินเดือน - ใช้ base_salary ที่ถูกต้อง
        const baseSalary = emp.base_salary || 0;
        const dailyRate = baseSalary / settings.days_per_month;
        const basePay = workDays * dailyRate;
        
        // ค่าคอมมิชชั่น
        const commission = emp.commission || 0;
        
        // หัก penalty สาย
        const latePenalty = lateMinutes * settings.late_deduction_per_minute;

        // รวมทั้งหมด
        const totalPay = basePay + commission + otAmount - latePenalty;

        return {
          employee: emp,
          workDays,
          totalWorkHours,
          lateDays,
          lateMinutes,
          leaveDays,
          otHours,
          otAmount,
          basePay,
          commission,
          latePenalty,
          totalPay: Math.max(0, totalPay),
        } as PayrollData;
      });

      const results = await Promise.all(payrollPromises);
      
      // Filter by search
      const filteredResults = results.filter(r => 
        r.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.employee.email.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setPayrollData(filteredResults);

      // Calculate summary
      setSummary({
        totalEmployees: filteredResults.length,
        totalBasePay: filteredResults.reduce((sum, r) => sum + r.basePay, 0),
        totalCommission: filteredResults.reduce((sum, r) => sum + r.commission, 0),
        totalOTPay: filteredResults.reduce((sum, r) => sum + r.otAmount, 0),
        totalLatePenalty: filteredResults.reduce((sum, r) => sum + r.latePenalty, 0),
        totalPay: filteredResults.reduce((sum, r) => sum + r.totalPay, 0),
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
      "เงินเดือนตั้ง",
      "วันทำงาน",
      "ชั่วโมงทำงาน",
      "วันลา",
      "วันสาย",
      "นาทีสาย",
      "ชั่วโมง OT",
      "เงินเดือนพื้นฐาน",
      "คอมมิชชั่น",
      "เงิน OT",
      "หักสาย",
      "รวมเงิน",
    ];

    const rows = payrollData.map((r) => [
      r.employee.name,
      r.employee.email,
      r.employee.base_salary,
      r.workDays,
      r.totalWorkHours.toFixed(1),
      r.leaveDays,
      r.lateDays,
      r.lateMinutes,
      r.otHours.toFixed(1),
      r.basePay.toFixed(2),
      r.commission.toFixed(2),
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Tooltip component for column headers
  const ColumnHeader = ({ label, tooltip, align = "center" }: { label: string; tooltip: string; align?: "left" | "center" | "right" }) => (
    <th className={`text-${align} px-3 py-3 text-[11px] font-semibold text-[#86868b] uppercase ${align === "left" ? "px-4" : ""}`}>
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : ""}`}>
        <span>{label}</span>
        <HelpCircle 
          className="w-3.5 h-3.5 text-[#86868b] cursor-help hover:text-[#0071e3] transition-colors" 
          title={tooltip}
        />
      </div>
    </th>
  );

  return (
    <AdminLayout title="ระบบเงินเดือน (Payroll)">
      {/* Controls */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
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
          <Button variant="secondary" size="sm" onClick={exportToCSV} disabled={!payrollData.length}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              placeholder="ค้นหาพนักงาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-[15px]"
            />
          </div>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-[15px] min-w-[180px]"
          >
            <option value="all">พนักงานทั้งหมด</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[#d2d2d7] focus:border-[#0071e3] outline-none text-[15px] min-w-[150px]"
          >
            <option value="all">ทุกสาขา</option>
            <option value="none">ไม่มีสาขา</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <p className="text-[22px] font-semibold text-[#1d1d1f]">{summary.totalEmployees}</p>
              <p className="text-[11px] text-[#86868b]">พนักงาน</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <p className="text-[18px] font-semibold text-[#34c759]">฿{formatCurrency(summary.totalBasePay)}</p>
              <p className="text-[11px] text-[#86868b]">เงินเดือน</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#af52de]/10 rounded-xl flex items-center justify-center">
              <Gift className="w-5 h-5 text-[#af52de]" />
            </div>
            <div>
              <p className="text-[18px] font-semibold text-[#af52de]">฿{formatCurrency(summary.totalCommission)}</p>
              <p className="text-[11px] text-[#86868b]">คอมมิชชั่น</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <p className="text-[18px] font-semibold text-[#ff9500]">฿{formatCurrency(summary.totalOTPay)}</p>
              <p className="text-[11px] text-[#86868b]">OT</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff3b30]/10 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#ff3b30]" />
            </div>
            <div>
              <p className="text-[18px] font-semibold text-[#ff3b30]">-฿{formatCurrency(summary.totalLatePenalty)}</p>
              <p className="text-[11px] text-[#86868b]">หักสาย</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <p className="text-[18px] font-semibold text-[#0071e3]">฿{formatCurrency(summary.totalPay)}</p>
              <p className="text-[11px] text-[#86868b]">รวมทั้งหมด</p>
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
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#86868b] uppercase">พนักงาน</th>
                  <ColumnHeader 
                    label="เงินเดือนตั้ง" 
                    tooltip="ฐานเงินเดือนที่กำหนดให้พนักงาน (ตั้งค่าได้ในหน้าจัดการพนักงาน)" 
                    align="right" 
                  />
                  <ColumnHeader 
                    label="วันทำงาน" 
                    tooltip="จำนวนวันที่มาทำงานจริงในเดือนนี้ (ไม่รวมวันหยุด)" 
                    align="center" 
                  />
                  <ColumnHeader 
                    label="ลา" 
                    tooltip="จำนวนวันลาที่ได้รับอนุมัติในเดือนนี้" 
                    align="center" 
                  />
                  <ColumnHeader 
                    label="สาย" 
                    tooltip={`จำนวนวันที่มาสาย และนาทีสายรวม (หลัง ${settings.work_start_time} น.)`}
                    align="center" 
                  />
                  <ColumnHeader 
                    label="OT" 
                    tooltip="ชั่วโมงทำงานล่วงเวลาที่เสร็จสิ้นแล้ว" 
                    align="center" 
                  />
                  <ColumnHeader 
                    label="เงินเดือน" 
                    tooltip={`(เงินเดือนตั้ง ÷ ${settings.days_per_month} วัน) × วันทำงานจริง`}
                    align="right" 
                  />
                  <ColumnHeader 
                    label="คอมมิชชั่น" 
                    tooltip="ค่าคอมมิชชั่นประจำเดือน (ตั้งค่าได้ในหน้าจัดการพนักงาน)" 
                    align="right" 
                  />
                  <ColumnHeader 
                    label="เงิน OT" 
                    tooltip="ค่าตอบแทนการทำงานล่วงเวลา (คำนวณตามอัตรา OT ที่ตั้งไว้)" 
                    align="right" 
                  />
                  <ColumnHeader 
                    label="หักสาย" 
                    tooltip={`นาทีสาย × ${settings.late_deduction_per_minute} บาท/นาที`}
                    align="right" 
                  />
                  <ColumnHeader 
                    label="รวม" 
                    tooltip="เงินเดือน + คอมมิชชั่น + เงิน OT - หักสาย" 
                    align="right" 
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8ed]">
                {payrollData.map((row) => (
                  <tr key={row.employee.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={row.employee.name} size="sm" />
                        <div>
                          <p className="text-[13px] font-medium text-[#1d1d1f]">{row.employee.name}</p>
                          <p className="text-[11px] text-[#86868b]">{row.employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-[13px] text-[#86868b]">฿{formatCurrency(row.employee.base_salary)}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-[13px] text-[#1d1d1f]">{row.workDays}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.leaveDays > 0 ? (
                        <span className="text-[13px] text-[#ff9500]">{row.leaveDays}</span>
                      ) : (
                        <span className="text-[13px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.lateDays > 0 ? (
                        <span className="text-[13px] text-[#ff3b30]">{row.lateDays} ({row.lateMinutes}น.)</span>
                      ) : (
                        <span className="text-[13px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.otHours > 0 ? (
                        <span className="text-[13px] text-[#ff9500]">{row.otHours.toFixed(1)}ชม.</span>
                      ) : (
                        <span className="text-[13px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-[13px] text-[#1d1d1f]">฿{formatCurrency(row.basePay)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {row.commission > 0 ? (
                        <span className="text-[13px] font-medium text-[#af52de]">+฿{formatCurrency(row.commission)}</span>
                      ) : (
                        <span className="text-[13px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {row.otAmount > 0 ? (
                        <span className="text-[13px] font-medium text-[#ff9500]">+฿{formatCurrency(row.otAmount)}</span>
                      ) : (
                        <span className="text-[13px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {row.latePenalty > 0 ? (
                        <span className="text-[13px] font-medium text-[#ff3b30]">-฿{formatCurrency(row.latePenalty)}</span>
                      ) : (
                        <span className="text-[13px] text-[#86868b]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[14px] font-semibold text-[#34c759]">฿{formatCurrency(row.totalPay)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#f5f5f7] border-t-2 border-[#d2d2d7]">
                  <td colSpan={6} className="px-4 py-3 text-[13px] font-semibold text-[#1d1d1f]">
                    รวมทั้งหมด ({summary.totalEmployees} คน)
                  </td>
                  <td className="px-3 py-3 text-right text-[13px] font-semibold text-[#1d1d1f]">
                    ฿{formatCurrency(summary.totalBasePay)}
                  </td>
                  <td className="px-3 py-3 text-right text-[13px] font-semibold text-[#af52de]">
                    +฿{formatCurrency(summary.totalCommission)}
                  </td>
                  <td className="px-3 py-3 text-right text-[13px] font-semibold text-[#ff9500]">
                    +฿{formatCurrency(summary.totalOTPay)}
                  </td>
                  <td className="px-3 py-3 text-right text-[13px] font-semibold text-[#ff3b30]">
                    -฿{formatCurrency(summary.totalLatePenalty)}
                  </td>
                  <td className="px-4 py-3 text-right text-[15px] font-bold text-[#34c759]">
                    ฿{formatCurrency(summary.totalPay)}
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
            <p className="font-medium text-[#1d1d1f] mb-1">สูตรคำนวณ:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>เงินเดือน = (เงินเดือนตั้ง ÷ {settings.days_per_month} วัน) × วันทำงานจริง</li>
              <li>หักสาย = นาทีสาย × {settings.late_deduction_per_minute} บาท/นาที</li>
              <li>รวม = เงินเดือน + คอมมิชชั่น + OT - หักสาย</li>
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
