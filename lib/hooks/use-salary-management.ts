"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";

export interface SalaryEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
  branch_id: string | null;
  base_salary: number | null;
  commission: number | null;
  branch?: { name: string } | null;
  employment_status?: string | null;
}

export interface SalaryHistoryEntry {
  id: string;
  employee_id: string;
  base_salary: number;
  commission: number;
  effective_date: string;
  created_at: string;
}

export interface Branch {
  id: string;
  name: string;
}

export function useSalaryManagement() {
  const [employees, setEmployees] = useState<SalaryEmployee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");

  // History modal
  const [selectedEmployee, setSelectedEmployee] =
    useState<SalaryEmployee | null>(null);
  const [history, setHistory] = useState<SalaryHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, branchRes] = await Promise.all([
        supabase
          .from("employees")
          .select("id, name, email, role, branch_id, base_salary, commission, employment_status, branch:branches(name)")
          .eq("account_status", "approved")
          .neq("role", "admin")
          .order("name"),
        supabase.from("branches").select("id, name").order("name"),
      ]);
      setEmployees(
        (empRes.data || []).filter(
          (e: any) => !e.is_system_account
        )
      );
      setBranches(branchRes.data || []);
    } catch (err) {
      console.error("Error fetching salary data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchBranch =
        selectedBranch === "all" ||
        (selectedBranch === "none" ? !emp.branch_id : emp.branch_id === selectedBranch);
      return matchSearch && matchBranch;
    });
  }, [employees, searchTerm, selectedBranch]);

  const summary = useMemo(() => {
    const active = filteredEmployees.filter(
      (e) => e.employment_status === "active" || !e.employment_status
    );
    const totalSalary = active.reduce(
      (sum, e) => sum + (e.base_salary || 0),
      0
    );
    const totalCommission = active.reduce(
      (sum, e) => sum + (e.commission || 0),
      0
    );
    return {
      totalEmployees: active.length,
      totalSalary,
      totalCommission,
      totalCost: totalSalary + totalCommission,
      avgSalary: active.length > 0 ? totalSalary / active.length : 0,
    };
  }, [filteredEmployees]);

  // Fetch history for a specific employee
  const fetchHistory = useCallback(async (employeeId: string) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("salary_history")
        .select("*")
        .eq("employee_id", employeeId)
        .order("effective_date", { ascending: false });
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Error fetching salary history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openHistory = (emp: SalaryEmployee) => {
    setSelectedEmployee(emp);
    fetchHistory(emp.id);
  };

  const closeHistory = () => {
    setSelectedEmployee(null);
    setHistory([]);
  };

  // Sync employees.base_salary and commission to the latest effective entry
  const syncEmployeeSalary = async (employeeId: string) => {
    const { data: latest } = await supabase
      .from("salary_history")
      .select("base_salary, commission")
      .eq("employee_id", employeeId)
      .lte("effective_date", new Date().toISOString().split("T")[0])
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest) {
      await supabase
        .from("employees")
        .update({
          base_salary: latest.base_salary,
          commission: latest.commission,
        })
        .eq("id", employeeId);
    }
  };

  const addEntry = async (
    employeeId: string,
    data: { base_salary: number; commission: number; effective_date: string }
  ) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("salary_history").insert({
        employee_id: employeeId,
        ...data,
      });
      if (error) throw error;
      await syncEmployeeSalary(employeeId);
      await fetchHistory(employeeId);
      await fetchData();
    } catch (err: any) {
      console.error("Error adding salary entry:", err);
      alert(err?.message || "เกิดข้อผิดพลาดในการเพิ่มรายการ");
    } finally {
      setSaving(false);
    }
  };

  const updateEntry = async (
    entryId: string,
    employeeId: string,
    data: { base_salary: number; commission: number; effective_date: string }
  ) => {
    setSaving(true);
    try {
      const { data: updated, error } = await supabase
        .from("salary_history")
        .update(data)
        .eq("id", entryId)
        .select();
      if (error) throw error;
      if (!updated || updated.length === 0) {
        throw new Error("ไม่สามารถอัปเดตข้อมูลได้");
      }
      await syncEmployeeSalary(employeeId);
      await fetchHistory(employeeId);
      await fetchData();
    } catch (err: any) {
      console.error("Error updating salary entry:", err);
      alert(err?.message || "เกิดข้อผิดพลาดในการแก้ไข");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entryId: string, employeeId: string) => {
    setSaving(true);
    try {
      const { data: deleted, error } = await supabase
        .from("salary_history")
        .delete()
        .eq("id", entryId)
        .select();
      if (error) throw error;
      if (!deleted || deleted.length === 0) {
        throw new Error("ไม่สามารถลบข้อมูลได้");
      }
      await syncEmployeeSalary(employeeId);
      await fetchHistory(employeeId);
      await fetchData();
    } catch (err: any) {
      console.error("Error deleting salary entry:", err);
      alert(err?.message || "เกิดข้อผิดพลาดในการลบ");
    } finally {
      setSaving(false);
    }
  };

  return {
    employees: filteredEmployees,
    branches,
    loading,
    summary,
    searchTerm,
    setSearchTerm,
    selectedBranch,
    setSelectedBranch,
    // History modal
    selectedEmployee,
    history,
    historyLoading,
    saving,
    openHistory,
    closeHistory,
    addEntry,
    updateEntry,
    deleteEntry,
  };
}
