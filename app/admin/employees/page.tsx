"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { 
  Search, 
  Mail, 
  Phone, 
  Trash2, 
  Users, 
  ShieldCheck, 
  UserCog, 
  Plus, 
  X, 
  MapPin, 
  Building2,
  DollarSign,
  Edit2,
  Gift,
  UserX,
  Settings,
} from "lucide-react";
import { format } from "date-fns";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  branch_id: string | null;
  base_salary: number;
  commission: number;
  exclude_from_payroll: boolean;
  created_at: string;
}

interface Branch {
  id: string;
  name: string;
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
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
    branch_id: "",
    base_salary: 15000,
    commission: 0,
    exclude_from_payroll: false,
  });

  // Edit Payroll Modal
  const [payrollModal, setPayrollModal] = useState<{ open: boolean; employee: Employee | null }>({
    open: false,
    employee: null,
  });
  const [payrollForm, setPayrollForm] = useState({
    base_salary: 0,
    commission: 0,
    exclude_from_payroll: false,
  });
  const [savingPayroll, setSavingPayroll] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchBranches();
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

  const fetchBranches = async () => {
    try {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .order("name", { ascending: true });
      setBranches(data || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
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

  const handleUpdateBranch = async (id: string, branch_id: string) => {
    try {
      const { error } = await supabase
        .from("employees")
        .update({ branch_id: branch_id || null })
        .eq("id", id);
      if (error) throw error;
      
      setEmployees(employees.map((emp) => (emp.id === id ? { ...emp, branch_id: branch_id || null } : emp)));
      toast.success("อัพเดตสำเร็จ", "เปลี่ยนสาขาเรียบร้อยแล้ว");
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถอัพเดตสาขาได้");
    }
  };

  const handleUpdatePayroll = async () => {
    if (!payrollModal.employee) return;
    
    setSavingPayroll(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          base_salary: payrollForm.base_salary,
          commission: payrollForm.commission,
          exclude_from_payroll: payrollForm.exclude_from_payroll,
        })
        .eq("id", payrollModal.employee.id);
      
      if (error) throw error;

      setEmployees(employees.map((emp) => 
        emp.id === payrollModal.employee!.id 
          ? { 
              ...emp, 
              base_salary: payrollForm.base_salary,
              commission: payrollForm.commission,
              exclude_from_payroll: payrollForm.exclude_from_payroll,
            } 
          : emp
      ));
      
      toast.success("อัพเดตสำเร็จ", "บันทึกข้อมูล Payroll เรียบร้อยแล้ว");
      setPayrollModal({ open: false, employee: null });
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกได้");
    } finally {
      setSavingPayroll(false);
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
      setNewEmployee({ 
        name: "", 
        email: "", 
        phone: "", 
        password: "", 
        role: "staff", 
        branch_id: "", 
        base_salary: 15000,
        commission: 0,
        exclude_from_payroll: false,
      });
      fetchEmployees();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error.message || "ไม่สามารถเพิ่มพนักงานได้");
    } finally {
      setAdding(false);
    }
  };

  const formatSalary = (salary: number) => {
    return new Intl.NumberFormat("th-TH").format(salary || 0);
  };

  const branchOptions = [
    { value: "", label: "ไม่กำหนดสาขา", icon: <MapPin className="w-4 h-4 text-[#86868b]" /> },
    ...branches.map((b) => ({
      value: b.id,
      label: b.name,
      icon: <Building2 className="w-4 h-4 text-[#0071e3]" />,
    })),
  ];

  const branchFilterOptions = [
    { value: "all", label: "ทุกสาขา" },
    { value: "none", label: "ยังไม่กำหนดสาขา" },
    ...branches.map((b) => ({ value: b.id, label: b.name })),
  ];

  const filteredEmployees = employees.filter((emp) => {
    const matchSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = selectedRole === "all" || emp.role === selectedRole;
    const matchBranch = 
      selectedBranchFilter === "all" || 
      (selectedBranchFilter === "none" && !emp.branch_id) ||
      emp.branch_id === selectedBranchFilter;
    return matchSearch && matchRole && matchBranch;
  });

  // Stats
  const includedInPayroll = employees.filter((e) => !e.exclude_from_payroll).length;
  const excludedFromPayroll = employees.filter((e) => e.exclude_from_payroll).length;
  const totalSalary = employees.filter(e => !e.exclude_from_payroll).reduce((sum, e) => sum + (e.base_salary || 0), 0);

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
        <div className="w-full sm:w-40">
          <Select
            value={selectedRole}
            onChange={setSelectedRole}
            options={filterOptions}
            placeholder="ตำแหน่ง"
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            value={selectedBranchFilter}
            onChange={setSelectedBranchFilter}
            options={branchFilterOptions}
            placeholder="สาขา"
          />
        </div>
        <Button onClick={() => setShowAddModal(true)} icon={<Plus className="w-5 h-5" />}>
          เพิ่มพนักงาน
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "ทั้งหมด", value: employees.length, color: "text-[#1d1d1f]" },
          { label: "ใน Payroll", value: includedInPayroll, color: "text-[#34c759]" },
          { label: "ไม่อยู่ Payroll", value: excludedFromPayroll, color: "text-[#ff9500]" },
          { label: "มีสาขา", value: employees.filter((e) => e.branch_id).length, color: "text-[#0071e3]" },
          { label: "เงินเดือนรวม", value: `฿${formatSalary(totalSalary)}`, color: "text-[#af52de]", small: true },
        ].map((stat, i) => (
          <Card key={i} elevated>
            <div className="text-center py-2">
              <p className={`${stat.small ? "text-[16px]" : "text-[22px]"} font-semibold ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] text-[#86868b]">{stat.label}</p>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8e8ed]">
                  <th className="text-left px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">พนักงาน</th>
                  <th className="text-left px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase hidden md:table-cell">ติดต่อ</th>
                  <th className="text-left px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">ตำแหน่ง</th>
                  <th className="text-left px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">สาขา</th>
                  <th className="text-left px-4 py-4 text-[12px] font-semibold text-[#86868b] uppercase">Payroll</th>
                  <th className="text-right px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8ed]">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className={`hover:bg-[#f5f5f7] transition-colors ${emp.exclude_from_payroll ? "opacity-60" : ""}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.name} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-medium text-[#1d1d1f]">{emp.name}</p>
                            {emp.exclude_from_payroll && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-[#ff9500]/10 text-[#ff9500] rounded-md">
                                ไม่รวม Payroll
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-[#86868b] md:hidden">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[12px] text-[#6e6e73]">
                          <Mail className="w-3.5 h-3.5" />
                          {emp.email}
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-[#6e6e73]">
                          <Phone className="w-3.5 h-3.5" />
                          {emp.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-32">
                        <Select
                          value={emp.role}
                          onChange={(value) => handleUpdateRole(emp.id, value)}
                          options={roleOptions}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-36">
                        <Select
                          value={emp.branch_id || ""}
                          onChange={(value) => handleUpdateBranch(emp.id, value)}
                          options={branchOptions}
                          placeholder="เลือกสาขา"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => {
                          setPayrollModal({ open: true, employee: emp });
                          setPayrollForm({
                            base_salary: emp.base_salary || 0,
                            commission: emp.commission || 0,
                            exclude_from_payroll: emp.exclude_from_payroll || false,
                          });
                        }}
                        className="flex flex-col items-start gap-0.5 px-3 py-2 text-left bg-[#f5f5f7] rounded-lg hover:bg-[#e8e8ed] transition-colors"
                      >
                        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#0071e3]">
                          <DollarSign className="w-3.5 h-3.5" />
                          ฿{formatSalary(emp.base_salary)}
                        </div>
                        {emp.commission > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-[#af52de]">
                            <Gift className="w-3 h-3" />
                            +฿{formatSalary(emp.commission)}
                          </div>
                        )}
                        <span className="text-[10px] text-[#86868b]">คลิกเพื่อแก้ไข</span>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right">
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
          <Card className="max-w-[500px] w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[21px] font-semibold text-[#1d1d1f]">เพิ่มพนักงานใหม่</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors">
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
                placeholder="อย่างน้อย 6 ตัวอักษร"
                required
                minLength={6}
              />
              <div>
                <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">ตำแหน่ง</label>
                <Select
                  value={newEmployee.role}
                  onChange={(value) => setNewEmployee({ ...newEmployee, role: value })}
                  options={roleOptions}
                />
              </div>
              <div>
                <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">สาขา</label>
                <Select
                  value={newEmployee.branch_id}
                  onChange={(value) => setNewEmployee({ ...newEmployee, branch_id: value })}
                  options={branchOptions}
                  placeholder="เลือกสาขา"
                />
              </div>
              <Input
                label="เงินเดือน (บาท)"
                type="number"
                value={String(newEmployee.base_salary)}
                onChange={(e) => setNewEmployee({ ...newEmployee, base_salary: parseInt(e.target.value) || 0 })}
                placeholder="15000"
                min={0}
              />
              <Input
                label="คอมมิชชั่น (บาท/เดือน)"
                type="number"
                value={String(newEmployee.commission)}
                onChange={(e) => setNewEmployee({ ...newEmployee, commission: parseInt(e.target.value) || 0 })}
                placeholder="0"
                min={0}
              />
              <label className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={newEmployee.exclude_from_payroll}
                  onChange={(e) => setNewEmployee({ ...newEmployee, exclude_from_payroll: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className="text-[15px] text-[#1d1d1f]">ไม่รวมใน Payroll</span>
                  <p className="text-[12px] text-[#86868b]">บัญชีนี้จะไม่ถูกคำนวณในระบบเงินเดือน</p>
                </div>
              </label>
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} fullWidth>
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

      {/* Edit Payroll Modal */}
      <Modal
        isOpen={payrollModal.open}
        onClose={() => setPayrollModal({ open: false, employee: null })}
        title={`ตั้งค่า Payroll - ${payrollModal.employee?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              เงินเดือน (บาท/เดือน)
            </label>
            <Input
              type="number"
              value={String(payrollForm.base_salary)}
              onChange={(e) => setPayrollForm({ ...payrollForm, base_salary: parseInt(e.target.value) || 0 })}
              placeholder="15000"
              min={0}
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
              <Gift className="w-4 h-4 inline mr-1" />
              คอมมิชชั่น (บาท/เดือน)
            </label>
            <Input
              type="number"
              value={String(payrollForm.commission)}
              onChange={(e) => setPayrollForm({ ...payrollForm, commission: parseInt(e.target.value) || 0 })}
              placeholder="0"
              min={0}
            />
            <p className="text-[12px] text-[#86868b] mt-1">คอมมิชชั่นคงที่ต่อเดือน</p>
          </div>

          <label className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={payrollForm.exclude_from_payroll}
              onChange={(e) => setPayrollForm({ ...payrollForm, exclude_from_payroll: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="text-[15px] text-[#1d1d1f]">ไม่รวมใน Payroll</span>
              <p className="text-[12px] text-[#86868b]">บัญชีนี้จะไม่ถูกคำนวณในระบบเงินเดือน</p>
            </div>
          </label>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setPayrollModal({ open: false, employee: null })} className="flex-1">
              ยกเลิก
            </Button>
            <Button onClick={handleUpdatePayroll} loading={savingPayroll} className="flex-1">
              บันทึก
            </Button>
          </div>
        </div>
      </Modal>

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
