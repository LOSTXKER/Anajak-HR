/**
 * Employees Hook
 * =============================================
 * Hook for fetching and managing employees
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Employee,
  LeaveBalance,
  EmployeeStats,
  EditFormData,
} from "@/components/admin/employees/types";

interface UseEmployeesOptions {
  initialFilterStatus?: string;
}

interface UseEmployeesReturn {
  // Data
  employees: Employee[];
  balances: Record<string, LeaveBalance>;
  loading: boolean;
  saving: boolean;
  stats: EmployeeStats;

  // Filters
  searchTerm: string;
  filterRole: string;
  filterStatus: string;
  filteredEmployees: Employee[];

  // Setters
  setSearchTerm: (term: string) => void;
  setFilterRole: (role: string) => void;
  setFilterStatus: (status: string) => void;

  // Actions
  fetchData: () => Promise<void>;
  handleApproval: (
    empId: string,
    action: "approve" | "reject"
  ) => Promise<{ success: boolean; error?: string }>;
  handleSave: (
    empId: string,
    formData: EditFormData,
    employeesList: Employee[]
  ) => Promise<{ success: boolean; error?: string }>;
}

export function useEmployees(
  options: UseEmployeesOptions = {}
): UseEmployeesReturn {
  const { initialFilterStatus = "all" } = options;

  // Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [balances, setBalances] = useState<Record<string, LeaveBalance>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>(initialFilterStatus);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all employees including admin
      const { data: empData } = await supabase
        .from("employees")
        .select("*, branch:branches(name)")
        .order("name");

      setEmployees(empData || []);

      // Fetch current year balances
      const currentYear = new Date().getFullYear();
      const { data: balanceData } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("year", currentYear);

      const balanceMap: Record<string, LeaveBalance> = {};
      (balanceData || []).forEach((b: any) => {
        balanceMap[b.employee_id] = {
          annual_used: b.annual_leave_used || 0,
          annual_remaining: b.annual_leave_remaining || 0,
          sick_used: b.sick_leave_used || 0,
          sick_remaining: b.sick_leave_remaining || 0,
          personal_used: b.personal_leave_used || 0,
          personal_remaining: b.personal_remaining || 0,
        };
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error fetching employees:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle account approval/rejection
  const handleApproval = useCallback(
    async (
      empId: string,
      action: "approve" | "reject"
    ): Promise<{ success: boolean; error?: string }> => {
      setSaving(true);
      try {
        const newStatus = action === "approve" ? "approved" : "rejected";
        const { error } = await supabase
          .from("employees")
          .update({ account_status: newStatus })
          .eq("id", empId);

        if (error) throw error;

        await fetchData();
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error?.message };
      } finally {
        setSaving(false);
      }
    },
    [fetchData]
  );

  // Handle save employee
  const handleSave = useCallback(
    async (
      empId: string,
      formData: EditFormData,
      employeesList: Employee[]
    ): Promise<{ success: boolean; error?: string }> => {
      const emp = employeesList.find((e) => e.id === empId);
      if (!emp) return { success: false, error: "Employee not found" };

      // Check if trying to demote the last admin
      if (emp.role === "admin" && formData.role !== "admin") {
        const adminCount = employeesList.filter((e) => e.role === "admin").length;
        if (adminCount <= 1) {
          return {
            success: false,
            error: "ไม่สามารถเปลี่ยนได้ นี่คือ Admin คนสุดท้ายในระบบ",
          };
        }
      }

      setSaving(true);
      try {
        const { error } = await supabase
          .from("employees")
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
            base_salary: formData.baseSalary
              ? parseFloat(formData.baseSalary)
              : null,
            annual_leave_quota: formData.annualQuota,
            sick_leave_quota: formData.sickQuota,
            personal_leave_quota: formData.personalQuota,
          })
          .eq("id", empId);

        if (error) throw error;

        // Update balance for current year
        const currentYear = new Date().getFullYear();
        await supabase
          .from("leave_balances")
          .upsert(
            {
              employee_id: empId,
              year: currentYear,
              annual_leave_quota: formData.annualQuota,
              sick_leave_quota: formData.sickQuota,
              personal_leave_quota: formData.personalQuota,
            },
            { onConflict: "employee_id,year" }
          );

        await fetchData();
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error?.message };
      } finally {
        setSaving(false);
      }
    },
    [fetchData]
  );

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = filterRole === "all" || emp.role === filterRole;
      const matchStatus =
        filterStatus === "all" || emp.account_status === filterStatus;
      return matchSearch && matchRole && matchStatus;
    });
  }, [employees, searchTerm, filterRole, filterStatus]);

  // Stats
  const stats = useMemo<EmployeeStats>(() => {
    const nonAdminEmployees = employees.filter((e) => e.role !== "admin");
    const total = nonAdminEmployees.length;
    const approved = nonAdminEmployees.filter(
      (e) => e.account_status === "approved"
    ).length;
    const pending = nonAdminEmployees.filter(
      (e) => e.account_status === "pending"
    ).length;
    const admins = employees.filter((e) => e.role === "admin").length;
    return { total, approved, pending, admins };
  }, [employees]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    // Data
    employees,
    balances,
    loading,
    saving,
    stats,

    // Filters
    searchTerm,
    filterRole,
    filterStatus,
    filteredEmployees,

    // Setters
    setSearchTerm,
    setFilterRole,
    setFilterStatus,

    // Actions
    fetchData,
    handleApproval,
    handleSave,
  };
}
