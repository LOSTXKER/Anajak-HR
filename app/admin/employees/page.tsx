"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/auth-context";
import { RefreshCw, Trash2 } from "lucide-react";

import { useEmployees } from "@/lib/hooks/use-employees";
import {
  Employee,
  EditFormData,
  EmployeeStats,
  EmployeeFilters,
  EmployeeTable,
  EmployeeEditModal,
} from "@/components/admin/employees";

function EmployeesContent() {
  const toast = useToast();
  const { employee: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter") || "all";

  // Use the employees hook
  const {
    employees,
    balances,
    loading,
    saving,
    stats,
    searchTerm,
    filterRole,
    filterStatus,
    showDeleted,
    filteredEmployees,
    setSearchTerm,
    setFilterRole,
    setFilterStatus,
    setShowDeleted,
    fetchData,
    handleApproval,
    handleSave,
    handleDelete,
    handleRestore,
  } = useEmployees({ initialFilterStatus: initialFilter });

  // Modal state
  const [editModal, setEditModal] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: "",
    email: "",
    phone: "",
    role: "staff",
    baseSalary: "",
    annualQuota: 10,
    sickQuota: 30,
    personalQuota: 3,
  });
  const [approvalModal, setApprovalModal] = useState<{
    emp: Employee | null;
    action: "approve" | "reject" | null;
  }>({ emp: null, action: null });
  const [deleteModal, setDeleteModal] = useState<Employee | null>(null);

  // Handlers
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

  const handleSaveClick = async () => {
    if (!editModal) return;

    const result = await handleSave(editModal.id, editForm, employees);
    if (result.success) {
      toast.success("สำเร็จ", "อัพเดทข้อมูลพนักงานเรียบร้อย");
      setEditModal(null);
    } else {
      toast.error("เกิดข้อผิดพลาด", result.error || "ไม่สามารถบันทึกได้");
    }
  };

  const handleApprovalClick = async () => {
    if (!approvalModal.emp || !approvalModal.action) return;

    const result = await handleApproval(
      approvalModal.emp.id,
      approvalModal.action
    );
    if (result.success) {
      toast.success(
        approvalModal.action === "approve" ? "อนุมัติสำเร็จ" : "ปฏิเสธสำเร็จ",
        `${approvalModal.emp.name} ${
          approvalModal.action === "approve"
            ? "ได้รับการอนุมัติแล้ว"
            : "ถูกปฏิเสธแล้ว"
        }`
      );
      setApprovalModal({ emp: null, action: null });
    } else {
      toast.error("เกิดข้อผิดพลาด", result.error || "ไม่สามารถดำเนินการได้");
    }
  };

  const handleDeleteClick = async () => {
    if (!deleteModal || !currentUser) return;

    const result = await handleDelete(deleteModal.id, currentUser.id, employees);
    if (result.success) {
      toast.success("ลบพนักงานสำเร็จ", `${deleteModal.name} ถูกลบออกจากระบบแล้ว (ข้อมูลประวัติยังคงอยู่)`);
      setDeleteModal(null);
    } else {
      toast.error("เกิดข้อผิดพลาด", result.error || "ไม่สามารถลบพนักงานได้");
    }
  };

  const handleRestoreClick = async (emp: Employee) => {
    const result = await handleRestore(emp.id);
    if (result.success) {
      toast.success("กู้คืนสำเร็จ", `${emp.name} ถูกกู้คืนเข้าสู่ระบบแล้ว`);
    } else {
      toast.error("เกิดข้อผิดพลาด", result.error || "ไม่สามารถกู้คืนได้");
    }
  };

  return (
    <AdminLayout
      title="จัดการพนักงาน"
      description="จัดการข้อมูลพนักงานและโควต้าวันลา"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f]">
            พนักงานทั้งหมด
          </h1>
          <p className="text-sm text-[#86868b] mt-1">
            จัดการข้อมูล, สิทธิ์, และโควต้าวันลา
          </p>
        </div>
        <Button variant="text" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats */}
      <EmployeeStats
        stats={stats}
        filterStatus={filterStatus}
        onViewPending={() => setFilterStatus("pending")}
        showDeleted={showDeleted}
        onToggleDeleted={() => setShowDeleted(!showDeleted)}
      />

      {/* Filters */}
      <EmployeeFilters
        searchTerm={searchTerm}
        filterStatus={filterStatus}
        filterRole={filterRole}
        pendingCount={stats.pending}
        onSearchChange={setSearchTerm}
        onStatusChange={setFilterStatus}
        onRoleChange={setFilterRole}
      />

      {/* Table */}
      <EmployeeTable
        employees={filteredEmployees}
        balances={balances}
        loading={loading}
        showDeleted={showDeleted}
        onEdit={handleEdit}
        onApprove={(emp) => setApprovalModal({ emp, action: "approve" })}
        onReject={(emp) => setApprovalModal({ emp, action: "reject" })}
        onDelete={(emp) => setDeleteModal(emp)}
        onRestore={handleRestoreClick}
      />

      {/* Modals */}
      <ConfirmDialog
        isOpen={approvalModal.emp !== null}
        onClose={() => setApprovalModal({ emp: null, action: null })}
        onConfirm={handleApprovalClick}
        title={
          approvalModal.action === "approve" ? "อนุมัติบัญชี" : "ปฏิเสธบัญชี"
        }
        message={
          approvalModal.action === "approve"
            ? `อนุมัติบัญชีของ "${approvalModal.emp?.name}" ?\nพนักงานจะสามารถเข้าสู่ระบบได้`
            : `ปฏิเสธบัญชีของ "${approvalModal.emp?.name}" ?\nพนักงานจะไม่สามารถเข้าสู่ระบบได้`
        }
        type={approvalModal.action === "approve" ? "info" : "danger"}
        confirmText={approvalModal.action === "approve" ? "อนุมัติ" : "ปฏิเสธ"}
        loading={saving}
      />

      <EmployeeEditModal
        employee={editModal}
        formData={editForm}
        employees={employees}
        saving={saving}
        onClose={() => setEditModal(null)}
        onFormChange={setEditForm}
        onSave={handleSaveClick}
      />

      {/* Delete Modal */}
      <ConfirmDialog
        isOpen={deleteModal !== null}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDeleteClick}
        title="ลบพนักงาน"
        message={
          `ต้องการลบ "${deleteModal?.name}" ออกจากระบบหรือไม่?\n\n` +
          `หมายเหตุ:\n` +
          `• ข้อมูลประวัติทั้งหมด (เงินเดือน, OT, วันลา) จะยังคงอยู่\n` +
          `• สามารถกู้คืนได้ในภายหลัง\n` +
          `• พนักงานจะไม่สามารถเข้าสู่ระบบได้`
        }
        type="danger"
        confirmText="ลบพนักงาน"
        loading={saving}
      />
    </AdminLayout>
  );
}

export default function EmployeesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <Suspense
        fallback={
          <AdminLayout title="จัดการพนักงาน">
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
            </div>
          </AdminLayout>
        }
      >
        <EmployeesContent />
      </Suspense>
    </ProtectedRoute>
  );
}
