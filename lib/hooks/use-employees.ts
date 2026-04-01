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
  ResignFormData,
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
  showDeleted: boolean;
  filteredEmployees: Employee[];

  // Setters
  setSearchTerm: (term: string) => void;
  setFilterRole: (role: string) => void;
  setFilterStatus: (status: string) => void;
  setShowDeleted: (show: boolean) => void;

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
  handleResign: (
    empId: string,
    performedById: string,
    formData: ResignFormData,
    employeesList: Employee[]
  ) => Promise<{ success: boolean; error?: string }>;
  handleRehire: (
    empId: string,
    performedById: string
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
  const [showDeleted, setShowDeleted] = useState(false);

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
          annual_remaining: b.annual_leave_remaining ?? b.annual_leave_quota ?? 0,
          sick_used: b.sick_leave_used || 0,
          sick_remaining: b.sick_leave_remaining ?? b.sick_leave_quota ?? 0,
          personal_used: b.personal_leave_used || 0,
          personal_remaining: b.personal_leave_remaining ?? b.personal_leave_quota ?? 0,
        };
      });

      // Auto-create missing balance records for active employees
      const activeEmployees = (empData || []).filter((e: any) => !e.deleted_at && e.account_status === "approved");
      const missingBalances = activeEmployees.filter((e: any) => !balanceMap[e.id]);
      if (missingBalances.length > 0) {
        const newRecords = missingBalances.map((e: any) => ({
          employee_id: e.id,
          year: currentYear,
          annual_leave_quota: e.annual_leave_quota || 10,
          sick_leave_quota: e.sick_leave_quota || 30,
          personal_leave_quota: e.personal_leave_quota || 3,
          annual_leave_used: 0,
          annual_leave_remaining: e.annual_leave_quota || 10,
          sick_leave_used: 0,
          sick_leave_remaining: e.sick_leave_quota || 30,
          personal_leave_used: 0,
          personal_leave_remaining: e.personal_leave_quota || 3,
        }));
        await supabase.from("leave_balances").upsert(newRecords, { onConflict: "employee_id,year" });
        newRecords.forEach((r: typeof newRecords[0]) => {
          balanceMap[r.employee_id] = {
            annual_used: 0,
            annual_remaining: r.annual_leave_remaining,
            sick_used: 0,
            sick_remaining: r.sick_leave_remaining,
            personal_used: 0,
            personal_remaining: r.personal_leave_remaining,
          };
        });
      }

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
            work_arrangement: formData.workArrangement || "onsite",
            annual_leave_quota: formData.annualQuota,
            sick_leave_quota: formData.sickQuota,
            personal_leave_quota: formData.personalQuota,
          })
          .eq("id", empId);

        if (error) throw error;

        // Update balance for current year (recalculate remaining)
        const currentYear = new Date().getFullYear();

        // Fetch current balance to recalculate remaining
        const { data: currentBalance } = await supabase
          .from("leave_balances")
          .select("*")
          .eq("employee_id", empId)
          .eq("year", currentYear)
          .maybeSingle();

        const annualUsed = currentBalance?.annual_leave_used || 0;
        const sickUsed = currentBalance?.sick_leave_used || 0;
        const personalUsed = currentBalance?.personal_leave_used || 0;

        await supabase
          .from("leave_balances")
          .upsert(
            {
              employee_id: empId,
              year: currentYear,
              annual_leave_quota: formData.annualQuota,
              sick_leave_quota: formData.sickQuota,
              personal_leave_quota: formData.personalQuota,
              annual_leave_remaining: Math.max(0, formData.annualQuota - annualUsed),
              sick_leave_remaining: Math.max(0, formData.sickQuota - sickUsed),
              personal_leave_remaining: Math.max(0, formData.personalQuota - personalUsed),
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

  // Handle employee resignation / termination
  const handleResign = useCallback(
    async (
      empId: string,
      performedById: string,
      formData: ResignFormData,
      employeesList: Employee[]
    ): Promise<{ success: boolean; error?: string }> => {
      const emp = employeesList.find((e) => e.id === empId);
      if (!emp) return { success: false, error: "Employee not found" };

      if (emp.is_system_account) {
        return {
          success: false,
          error: "ไม่สามารถดำเนินการกับบัญชีระบบได้",
        };
      }

      if (empId === performedById) {
        return {
          success: false,
          error: "ไม่สามารถดำเนินการกับบัญชีตัวเองได้",
        };
      }

      if (emp.role === "admin") {
        const activeAdminCount = employeesList.filter(
          (e) => e.role === "admin" && !e.deleted_at && e.employment_status !== "resigned" && e.employment_status !== "terminated"
        ).length;
        if (activeAdminCount <= 1) {
          return {
            success: false,
            error: "ไม่สามารถดำเนินการได้ นี่คือ Admin คนสุดท้ายในระบบ",
          };
        }
      }

      setSaving(true);
      try {
        const pendingTables = [
          "leave_requests",
          "ot_requests",
          "wfh_requests",
          "field_work_requests",
          "late_requests",
        ] as const;

        for (const table of pendingTables) {
          await supabase
            .from(table)
            .update({ status: "cancelled" })
            .eq("employee_id", empId)
            .eq("status", "pending");
        }

        const { error } = await supabase
          .from("employees")
          .update({
            employment_status: formData.type,
            resignation_date: formData.resignationDate,
            last_working_date: formData.lastWorkingDate,
            resignation_reason: formData.reason || null,
            deleted_at: new Date().toISOString(),
            deleted_by: performedById,
          })
          .eq("id", empId);

        if (error) throw error;

        await supabase.from("employment_history").insert({
          employee_id: empId,
          action: formData.type,
          effective_date: formData.lastWorkingDate || formData.resignationDate,
          reason: formData.reason || null,
          performed_by: performedById,
        });

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

  // Handle rehire (bring employee back)
  const handleRehire = useCallback(
    async (
      empId: string,
      performedById: string
    ): Promise<{ success: boolean; error?: string }> => {
      setSaving(true);
      try {
        const { error } = await supabase
          .from("employees")
          .update({
            employment_status: "active",
            resignation_date: null,
            last_working_date: null,
            resignation_reason: null,
            deleted_at: null,
            deleted_by: null,
          })
          .eq("id", empId);

        if (error) throw error;

        await supabase.from("employment_history").insert({
          employee_id: empId,
          action: "rehired",
          effective_date: new Date().toISOString().split("T")[0],
          performed_by: performedById,
        });

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
      const isInactive = emp.employment_status === "resigned" || emp.employment_status === "terminated" || emp.deleted_at;
      if (!showDeleted && isInactive) {
        return false;
      }
      if (showDeleted && !isInactive) {
        return false;
      }

      const matchSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = filterRole === "all" || emp.role === filterRole;
      const matchStatus =
        filterStatus === "all" || emp.account_status === filterStatus;
      return matchSearch && matchRole && matchStatus;
    });
  }, [employees, searchTerm, filterRole, filterStatus, showDeleted]);

  // Stats (exclude inactive employees)
  const stats = useMemo<EmployeeStats>(() => {
    const activeEmployees = employees.filter((e) => !e.deleted_at && e.employment_status !== "resigned" && e.employment_status !== "terminated");
    const nonAdminEmployees = activeEmployees.filter((e) => e.role !== "admin");
    const total = nonAdminEmployees.length;
    const approved = nonAdminEmployees.filter(
      (e) => e.account_status === "approved"
    ).length;
    const pending = nonAdminEmployees.filter(
      (e) => e.account_status === "pending"
    ).length;
    const admins = activeEmployees.filter((e) => e.role === "admin").length;
    const deleted = employees.filter((e) => e.employment_status === "resigned" || e.employment_status === "terminated" || e.deleted_at).length;
    return { total, approved, pending, admins, deleted };
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
    showDeleted,
    filteredEmployees,

    // Setters
    setSearchTerm,
    setFilterRole,
    setFilterStatus,
    setShowDeleted,

    // Actions
    fetchData,
    handleApproval,
    handleSave,
    handleResign,
    handleRehire,
  };
}
