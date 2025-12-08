"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Search, Mail, Phone, Trash2, Users, ShieldCheck, UserCog, Plus, X } from "lucide-react";
import { format } from "date-fns";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  base_salary_rate: number;
  created_at: string;
}

const roleOptions = [
  { value: "staff", label: "พนักงาน", icon: <Users className="w-4 h-4" /> },
  { value: "supervisor", label: "หัวหน้างาน", icon: <UserCog className="w-4 h-4" /> },
  { value: "admin", label: "ผู้ดูแลระบบ", icon: <ShieldCheck className="w-4 h-4" /> },
];

const filterOptions = [
  { value: "all", label: "ทุกตำแหน่ง" },
  { value: "admin", label: "ผู้ดูแลระบบ" },
  { value: "supervisor", label: "หัวหน้างาน" },
  { value: "staff", label: "พนักงาน" },
];

function EmployeesContent() {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: "",
    name: "",
  });
  const [deleting, setDeleting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "staff",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });
      setEmployees(data || []);
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลพนักงานได้");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (id: string, role: string) => {
    try {
      const { error } = await supabase.from("employees").update({ role }).eq("id", id);
      if (error) throw error;
      
      setEmployees(employees.map((emp) => (emp.id === id ? { ...emp, role } : emp)));
      toast.success("อัพเดตสำเร็จ", "เปลี่ยนตำแหน่งเรียบร้อยแล้ว");
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถอัพเดตตำแหน่งได้");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("employees").delete().eq("id", deleteConfirm.id);
      if (error) throw error;

      setEmployees(employees.filter((emp) => emp.id !== deleteConfirm.id));
      toast.success("ลบสำเร็จ", "ลบพนักงานเรียบร้อยแล้ว");
      setDeleteConfirm({ open: false, id: "", name: "" });
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถลบพนักงานได้");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);

    try {
      // Call API to create employee
      const response = await fetch("/api/employees/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployee),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถเพิ่มพนักงานได้");
      }

      toast.success("สำเร็จ", "เพิ่มพนักงานใหม่เรียบร้อยแล้ว");
      setShowAddModal(false);
      setNewEmployee({ name: "", email: "", phone: "", password: "", role: "staff" });
      fetchEmployees();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error.message || "ไม่สามารถเพิ่มพนักงานได้");
    } finally {
      setAdding(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = selectedRole === "all" || emp.role === selectedRole;
    return matchSearch && matchRole;
  });

  return (
    <AdminLayout title="จัดการพนักงาน" description={`${employees.length} คน`}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868b]" />
          <input
            type="text"
            placeholder="ค้นหาพนักงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={selectedRole}
            onChange={setSelectedRole}
            options={filterOptions}
            placeholder="ตำแหน่ง"
          />
        </div>
        <Button onClick={() => setShowAddModal(true)} icon={<Plus className="w-5 h-5" />}>
          เพิ่มพนักงาน
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "ทั้งหมด", value: employees.length, color: "text-[#1d1d1f]" },
          { label: "ผู้ดูแล", value: employees.filter((e) => e.role === "admin").length, color: "text-[#af52de]" },
          { label: "หัวหน้า", value: employees.filter((e) => e.role === "supervisor").length, color: "text-[#0071e3]" },
          { label: "พนักงาน", value: employees.filter((e) => e.role === "staff").length, color: "text-[#86868b]" },
        ].map((stat, i) => (
          <Card key={i} elevated>
            <div className="text-center py-2">
              <p className={`text-[28px] font-semibold ${stat.color}`}>{stat.value}</p>
              <p className="text-[13px] text-[#86868b]">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card elevated padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-20 text-[#86868b]">ไม่พบพนักงาน</div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8e8ed]">
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase tracking-wide">
                    พนักงาน
                  </th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase tracking-wide hidden md:table-cell">
                    ติดต่อ
                  </th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase tracking-wide">
                    ตำแหน่ง
                  </th>
                  <th className="text-left px-6 py-4 text-[13px] font-semibold text-[#86868b] uppercase tracking-wide hidden lg:table-cell">
                    วันที่เข้าร่วม
                  </th>
                  <th className="text-right px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8ed]">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#f5f5f7] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.name} size="md" />
                        <div>
                          <p className="text-[15px] font-medium text-[#1d1d1f]">
                            {emp.name}
                          </p>
                          <p className="text-[13px] text-[#86868b] md:hidden">
                            {emp.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[13px] text-[#6e6e73]">
                          <Mail className="w-4 h-4" />
                          {emp.email}
                        </div>
                        <div className="flex items-center gap-2 text-[13px] text-[#6e6e73]">
                          <Phone className="w-4 h-4" />
                          {emp.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-40">
                        <Select
                          value={emp.role}
                          onChange={(value) => handleUpdateRole(emp.id, value)}
                          options={roleOptions}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-[14px] text-[#6e6e73]">
                        {format(new Date(emp.created_at), "dd/MM/yyyy")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteConfirm({ open: true, id: emp.id, name: emp.name })}
                        className="p-2 text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <Card className="max-w-[500px] w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[21px] font-semibold text-[#1d1d1f]">
                เพิ่มพนักงานใหม่
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <Input
                label="ชื่อ-นามสกุล"
                type="text"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                placeholder="กรุณากรอกชื่อ-นามสกุล"
                required
              />

              <Input
                label="อีเมล"
                type="email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                placeholder="กรุณากรอกอีเมล"
                required
              />

              <Input
                label="เบอร์โทรศัพท์"
                type="tel"
                value={newEmployee.phone}
                onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                placeholder="กรุณากรอกเบอร์โทรศัพท์"
                required
              />

              <Input
                label="รหัสผ่าน"
                type="password"
                value={newEmployee.password}
                onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                placeholder="กรุณากรอกรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                required
                minLength={6}
              />

              <div>
                <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">
                  ตำแหน่ง
                </label>
                <Select
                  value={newEmployee.role}
                  onChange={(value) => setNewEmployee({ ...newEmployee, role: value })}
                  options={roleOptions}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                  fullWidth
                >
                  ยกเลิก
                </Button>
                <Button type="submit" loading={adding} fullWidth>
                  เพิ่มพนักงาน
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: "", name: "" })}
        onConfirm={handleDelete}
        title="ยืนยันการลบ"
        message={`คุณต้องการลบ "${deleteConfirm.name}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        type="danger"
        confirmText="ลบ"
        loading={deleting}
      />
    </AdminLayout>
  );
}

export default function EmployeesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <EmployeesContent />
    </ProtectedRoute>
  );
}
