"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { 
  Users, 
  Edit, 
  RefreshCw, 
  Save, 
  Search, 
  Calendar,
  Mail,
  Phone,
  Building2,
  DollarSign,
  UserCircle,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface Employee {
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

interface LeaveBalance {
  annual_used: number;
  annual_remaining: number;
  sick_used: number;
  sick_remaining: number;
  personal_used: number;
  personal_remaining: number;
}

function EmployeesContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter") || "all";
  
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [balances, setBalances] = useState<Record<string, LeaveBalance>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>(initialFilter);
  const [editModal, setEditModal] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "staff",
    baseSalary: "",
    annualQuota: 10,
    sickQuota: 30,
    personalQuota: 3,
  });
  const [saving, setSaving] = useState(false);
  const [approvalModal, setApprovalModal] = useState<{ emp: Employee | null; action: "approve" | "reject" | null }>({ emp: null, action: null });

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
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = filterRole === "all" || emp.role === filterRole;
      const matchStatus = filterStatus === "all" || emp.account_status === filterStatus;
      return matchSearch && matchRole && matchStatus;
    });
  }, [employees, searchTerm, filterRole, filterStatus]);

  // Handle account approval/rejection
  const handleApproval = async () => {
    if (!approvalModal.emp || !approvalModal.action) return;
    setSaving(true);
    try {
      const newStatus = approvalModal.action === "approve" ? "approved" : "rejected";
      const { error } = await supabase
        .from("employees")
        .update({ account_status: newStatus })
        .eq("id", approvalModal.emp.id);

      if (error) throw error;

      toast.success(
        approvalModal.action === "approve" ? "อนุมัติสำเร็จ" : "ปฏิเสธสำเร็จ",
        `${approvalModal.emp.name} ${approvalModal.action === "approve" ? "ได้รับการอนุมัติแล้ว" : "ถูกปฏิเสธแล้ว"}`
      );
      setApprovalModal({ emp: null, action: null });
      fetchData();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setSaving(false);
    }
  };

  // Stats (admin is not an employee - excluded from stats)
  const stats = useMemo(() => {
    const nonAdminEmployees = employees.filter((e) => e.role !== "admin");
    const total = nonAdminEmployees.length;
    const approved = nonAdminEmployees.filter((e) => e.account_status === "approved").length;
    const pending = nonAdminEmployees.filter((e) => e.account_status === "pending").length;
    const admins = employees.filter((e) => e.role === "admin").length;
    return { total, approved, pending, admins };
  }, [employees]);

  const handleEdit = (emp: Employee) => {
    setEditModal(emp);
    setEditForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      role: emp.role,
      baseSalary: emp.base_salary?.toString() || "",
      annualQuota: emp.annual_leave_quota || 10,
      sickQuota: emp.sick_leave_quota || 30,
      personalQuota: emp.personal_leave_quota || 3,
    });
  };

  const handleSave = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          role: editForm.role,
          base_salary: editForm.baseSalary ? parseFloat(editForm.baseSalary) : null,
          annual_leave_quota: editForm.annualQuota,
          sick_leave_quota: editForm.sickQuota,
          personal_leave_quota: editForm.personalQuota,
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
          annual_leave_quota: editForm.annualQuota,
          sick_leave_quota: editForm.sickQuota,
          personal_leave_quota: editForm.personalQuota,
        }, { onConflict: "employee_id,year" });

      toast.success("สำเร็จ", "อัพเดทข้อมูลพนักงานเรียบร้อย");
      setEditModal(null);
      fetchData();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge variant="danger">👑 Admin</Badge>;
      case "supervisor": return <Badge variant="primary">👨‍💼 Supervisor</Badge>;
      default: return <Badge variant="default">👤 Staff</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge variant="success">✅ อนุมัติแล้ว</Badge>;
      case "pending": return <Badge variant="warning">⏳ รออนุมัติ</Badge>;
      case "rejected": return <Badge variant="danger">❌ ปฏิเสธ</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="จัดการพนักงาน" description="จัดการข้อมูลพนักงานและโควต้าวันลา">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f]">พนักงานทั้งหมด</h1>
          <p className="text-sm text-[#86868b] mt-1">จัดการข้อมูล, สิทธิ์, และโควต้าวันลา</p>
        </div>
        <Button variant="text" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0071e3]/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1d1d1f]">{stats.total}</p>
              <p className="text-xs text-[#86868b]">พนักงานทั้งหมด</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#34c759]">{stats.approved}</p>
              <p className="text-xs text-[#86868b]">อนุมัติแล้ว</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#ff9500]">{stats.pending}</p>
              <p className="text-xs text-[#86868b]">รออนุมัติ</p>
            </div>
          </div>
        </Card>
        <Card elevated>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff3b30]/10 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#ff3b30]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#ff3b30]">{stats.admins}</p>
              <p className="text-xs text-[#86868b]">Admin</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Alert */}
      {stats.pending > 0 && filterStatus !== "pending" && (
        <Card elevated className="mb-6 bg-[#ff9500]/5 border border-[#ff9500]/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#ff9500]" />
              </div>
              <div>
                <p className="text-[15px] font-medium text-[#1d1d1f]">
                  มี {stats.pending} บัญชีรออนุมัติ
                </p>
                <p className="text-[13px] text-[#86868b]">คลิกเพื่อดูและอนุมัติ</p>
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={() => setFilterStatus("pending")}>
              ดูรายการ
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card elevated className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868b]" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ หรืออีเมล..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
              />
            </div>
          </div>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: "all", label: "ทุกสถานะ" },
              { value: "pending", label: `⏳ รออนุมัติ (${stats.pending})` },
              { value: "approved", label: "✅ อนุมัติแล้ว" },
              { value: "rejected", label: "❌ ปฏิเสธ" },
            ]}
          />
          <Select
            value={filterRole}
            onChange={setFilterRole}
            options={[
              { value: "all", label: "ทุกตำแหน่ง" },
              { value: "admin", label: "👑 Admin" },
              { value: "supervisor", label: "👨‍💼 Supervisor" },
              { value: "staff", label: "👤 Staff" },
            ]}
          />
        </div>
      </Card>

      {/* Employee Table */}
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
                  <th className="text-left px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">ตำแหน่ง</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">สถานะ</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">พักร้อน</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">ป่วย</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">กิจ</th>
                  <th className="text-right px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8ed]">
                {filteredEmployees.map((emp) => {
                  const balance = balances[emp.id];
                  return (
                    <tr key={emp.id} className="hover:bg-[#f5f5f7]/50 cursor-pointer group">
                      <td className="px-6 py-4">
                        <Link href={`/admin/employees/${emp.id}`} className="flex items-center gap-3">
                          <Avatar name={emp.name} size="sm" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">
                                {emp.name}
                              </p>
                              <ChevronRight className="w-4 h-4 text-[#86868b] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Mail className="w-3 h-3 text-[#86868b]" />
                              <p className="text-xs text-[#86868b]">{emp.email}</p>
                            </div>
                            {emp.phone && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <Phone className="w-3 h-3 text-[#86868b]" />
                                <p className="text-xs text-[#86868b]">{emp.phone}</p>
                              </div>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-4">
                        {getRoleBadge(emp.role)}
                      </td>
                      <td className="px-3 py-4">
                        {getStatusBadge(emp.account_status)}
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
                        <div className="flex items-center justify-end gap-2">
                          {/* Admin doesn't need approval */}
                          {emp.account_status === "pending" && emp.role !== "admin" && (
                            <>
                              <button
                                onClick={() => setApprovalModal({ emp, action: "approve" })}
                                className="p-2 text-[#34c759] hover:bg-[#34c759]/10 rounded-lg transition-colors"
                                title="อนุมัติ"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setApprovalModal({ emp, action: "reject" })}
                                className="p-2 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                                title="ปฏิเสธ"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          <Link
                            href={`/admin/employees/${emp.id}`}
                            className="p-2 text-[#34c759] hover:bg-[#34c759]/10 rounded-lg transition-colors"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleEdit(emp)}
                            className="p-2 text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg transition-colors"
                            title="แก้ไข"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
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
      {/* Approval Confirm Dialog */}
      <ConfirmDialog
        isOpen={approvalModal.emp !== null}
        onClose={() => setApprovalModal({ emp: null, action: null })}
        onConfirm={handleApproval}
        title={approvalModal.action === "approve" ? "อนุมัติบัญชี" : "ปฏิเสธบัญชี"}
        message={
          approvalModal.action === "approve"
            ? `อนุมัติบัญชีของ "${approvalModal.emp?.name}" ?\nพนักงานจะสามารถเข้าสู่ระบบได้`
            : `ปฏิเสธบัญชีของ "${approvalModal.emp?.name}" ?\nพนักงานจะไม่สามารถเข้าสู่ระบบได้`
        }
        type={approvalModal.action === "approve" ? "info" : "danger"}
        confirmText={approvalModal.action === "approve" ? "อนุมัติ" : "ปฏิเสธ"}
        loading={saving}
      />

      {editModal && (
        <Modal
          isOpen={true}
          onClose={() => setEditModal(null)}
          title={`แก้ไขข้อมูล - ${editModal.name}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="ชื่อ-นามสกุล"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <Input
                label="อีเมล"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="เบอร์โทร"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
              <Select
                label="ตำแหน่ง"
                value={editForm.role}
                onChange={(v) => setEditForm({ ...editForm, role: v })}
                options={
                  editModal?.role === "admin"
                    ? [{ value: "admin", label: "👑 Admin" }]
                    : [
                        { value: "staff", label: "👤 Staff" },
                        { value: "supervisor", label: "👨‍💼 Supervisor" },
                      ]
                }
              />
            </div>

            <Input
              label="เงินเดือน (฿)"
              type="number"
              value={editForm.baseSalary}
              onChange={(e) => setEditForm({ ...editForm, baseSalary: e.target.value })}
            />

            {/* Leave Quotas */}
            <div className="border-t border-[#e8e8ed] pt-4">
              <h4 className="text-sm font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                โควต้าวันลา
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="วันพักร้อน"
                  type="number"
                  min="0"
                  value={editForm.annualQuota}
                  onChange={(e) => setEditForm({ ...editForm, annualQuota: parseInt(e.target.value) || 0 })}
                />
                <Input
                  label="วันลาป่วย"
                  type="number"
                  min="0"
                  value={editForm.sickQuota}
                  onChange={(e) => setEditForm({ ...editForm, sickQuota: parseInt(e.target.value) || 0 })}
                />
                <Input
                  label="วันลากิจ"
                  type="number"
                  min="0"
                  value={editForm.personalQuota}
                  onChange={(e) => setEditForm({ ...editForm, personalQuota: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

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

export default function EmployeesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <Suspense fallback={
        <AdminLayout title="จัดการพนักงาน">
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        </AdminLayout>
      }>
        <EmployeesContent />
      </Suspense>
    </ProtectedRoute>
  );
}
