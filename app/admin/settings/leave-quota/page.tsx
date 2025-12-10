"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { Calendar, Edit, RefreshCw, Save, Users } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  email: string;
  annual_leave_quota: number;
  sick_leave_quota: number;
  personal_leave_quota: number;
}

interface LeaveBalance {
  annual_used: number;
  annual_remaining: number;
  sick_used: number;
  sick_remaining: number;
  personal_used: number;
  personal_remaining: number;
}

function LeaveQuotaContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [balances, setBalances] = useState<Record<string, LeaveBalance>>({});
  const [editModal, setEditModal] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({
    annual: 10,
    sick: 30,
    personal: 3,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees
      const { data: empData } = await supabase
        .from("employees")
        .select("id, name, email, annual_leave_quota, sick_leave_quota, personal_leave_quota")
        .eq("account_status", "approved")
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
          personal_remaining: b.personal_leave_remaining || 0,
        };
      });
      setBalances(balanceMap);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditModal(emp);
    setEditForm({
      annual: emp.annual_leave_quota || 10,
      sick: emp.sick_leave_quota || 30,
      personal: emp.personal_leave_quota || 3,
    });
  };

  const handleSave = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          annual_leave_quota: editForm.annual,
          sick_leave_quota: editForm.sick,
          personal_leave_quota: editForm.personal,
        })
        .eq("id", editModal.id);

      if (error) throw error;

      // Update balance for current year
      const currentYear = new Date().getFullYear();
      await supabase
        .from("leave_balances")
        .upsert({
          employee_id: editModal.id,
          year: currentYear,
          annual_leave_quota: editForm.annual,
          sick_leave_quota: editForm.sick,
          personal_leave_quota: editForm.personal,
        }, { onConflict: "employee_id,year" });

      toast.success("สำเร็จ", "อัพเดทโควต้าเรียบร้อย");
      setEditModal(null);
      fetchData();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (!confirm("ตั้งค่าโควต้าเริ่มต้นให้พนักงานทุกคน?\n(10 วันพักร้อน, 30 วันป่วย, 3 วันกิจ)")) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          annual_leave_quota: 10,
          sick_leave_quota: 30,
          personal_leave_quota: 3,
        })
        .eq("account_status", "approved");

      if (error) throw error;

      // Initialize balances for current year
      const currentYear = new Date().getFullYear();
      const values = employees.map((e) => ({
        employee_id: e.id,
        year: currentYear,
        annual_leave_quota: 10,
        sick_leave_quota: 30,
        personal_leave_quota: 3,
      }));

      await supabase.from("leave_balances").upsert(values, {
        onConflict: "employee_id,year",
      });

      toast.success("สำเร็จ", "ตั้งค่าโควต้าเริ่มต้นเรียบร้อย");
      fetchData();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="จัดการโควต้าวันลา">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f]">โควต้าวันลาพนักงาน</h1>
          <p className="text-sm text-[#86868b] mt-1">จัดการสิทธิ์วันลาของพนักงานแต่ละคน</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleBulkUpdate} loading={saving}>
            <Users className="w-4 h-4" />
            ตั้งค่าเริ่มต้นทุกคน
          </Button>
          <Button variant="text" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Default Quota Info */}
      <Card elevated className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-[#0071e3]" />
          <h3 className="font-semibold text-[#1d1d1f]">โควต้าเริ่มต้น</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-[#34c759]/10 rounded-xl">
            <p className="text-2xl font-bold text-[#34c759]">10</p>
            <p className="text-xs text-[#86868b]">วันพักร้อน</p>
          </div>
          <div className="text-center p-3 bg-[#ff3b30]/10 rounded-xl">
            <p className="text-2xl font-bold text-[#ff3b30]">30</p>
            <p className="text-xs text-[#86868b]">วันลาป่วย</p>
          </div>
          <div className="text-center p-3 bg-[#ff9500]/10 rounded-xl">
            <p className="text-2xl font-bold text-[#ff9500]">3</p>
            <p className="text-xs text-[#86868b]">วันลากิจ</p>
          </div>
        </div>
      </Card>

      {/* Employee List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Card elevated padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#86868b] uppercase">พนักงาน</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">พักร้อน</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">ป่วย</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">กิจ</th>
                  <th className="text-right px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8ed]">
                {employees.map((emp) => {
                  const balance = balances[emp.id];
                  return (
                    <tr key={emp.id} className="hover:bg-[#f5f5f7]/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={emp.name} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-[#1d1d1f]">{emp.name}</p>
                            <p className="text-xs text-[#86868b]">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-[#34c759]">{emp.annual_leave_quota || 10}</p>
                          {balance && (
                            <p className="text-xs text-[#86868b]">
                              ใช้ {balance.annual_used} | เหลือ {balance.annual_remaining}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-[#ff3b30]">{emp.sick_leave_quota || 30}</p>
                          {balance && (
                            <p className="text-xs text-[#86868b]">
                              ใช้ {balance.sick_used} | เหลือ {balance.sick_remaining}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-[#ff9500]">{emp.personal_leave_quota || 3}</p>
                          {balance && (
                            <p className="text-xs text-[#86868b]">
                              ใช้ {balance.personal_used} | เหลือ {balance.personal_remaining}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(emp)}
                          className="p-2 text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit Modal */}
      {editModal && (
        <Modal
          isOpen={true}
          onClose={() => setEditModal(null)}
          title={`แก้ไขโควต้าวันลา - ${editModal.name}`}
          size="md"
        >
          <div className="space-y-4">
            <Input
              label="วันลาพักร้อน"
              type="number"
              min="0"
              value={editForm.annual}
              onChange={(e) => setEditForm({ ...editForm, annual: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="วันลาป่วย"
              type="number"
              min="0"
              value={editForm.sick}
              onChange={(e) => setEditForm({ ...editForm, sick: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="วันลากิจ"
              type="number"
              min="0"
              value={editForm.personal}
              onChange={(e) => setEditForm({ ...editForm, personal: parseInt(e.target.value) || 0 })}
            />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setEditModal(null)} className="flex-1">
                ยกเลิก
              </Button>
              <Button onClick={handleSave} loading={saving} className="flex-1">
                <Save className="w-4 h-4" />
                บันทึก
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

export default function LeaveQuotaPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <LeaveQuotaContent />
    </ProtectedRoute>
  );
}

