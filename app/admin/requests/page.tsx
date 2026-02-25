"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { useRequests } from "@/lib/hooks/use-requests";
import { RequestItem, RequestType, CreateFormData, typeConfig } from "@/lib/types/request";

import { RequestsToolbar } from "@/components/admin/requests/RequestsToolbar";
import { RequestsTable } from "@/components/admin/requests/RequestsTable";
import { RequestDetailModal } from "@/components/admin/requests/RequestDetailModal";
import { RejectReasonModal } from "@/components/admin/requests/RejectReasonModal";
import { RequestCancelModal } from "@/components/admin/requests/RequestCancelModal";
import { EditRequestModal } from "@/components/admin/requests/EditRequestModal";
import { CreateTab } from "@/components/admin/requests/CreateTab";

function RequestsPageContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();

  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  const {
    filtered,
    stats,
    employees,
    detectedOTInfo,
    loading,
    processing,
    activeType,
    activeStatus,
    searchTerm,
    setActiveType,
    setActiveStatus,
    setSearchTerm,
    fetchAll,
    handleApprove,
    handleReject,
    handleCancel,
    handleCreateRequest,
    handleEditRequest,
    detectOTRate,
  } = useRequests({ dateRange });

  // Re-fetch when date range changes
  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // ── Modal states ────────────────────────────────────
  const [detailModal, setDetailModal] = useState<RequestItem | null>(null);
  const [cancelModal, setCancelModal] = useState<RequestItem | null>(null);
  const [rejectModal, setRejectModal] = useState<RequestItem | null>(null);
  const [editModal, setEditModal] = useState<RequestItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // ── Action handlers ─────────────────────────────────

  const onApprove = useCallback(
    async (request: RequestItem) => {
      if (!currentAdmin) return;
      const success = await handleApprove(request, currentAdmin.id);
      if (success) {
        toast.success("อนุมัติสำเร็จ", `${typeConfig[request.type].label} ของ ${request.employeeName}`);
        setDetailModal(null);
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถอนุมัติได้");
      }
    },
    [currentAdmin, handleApprove, toast]
  );

  const onRejectRequest = useCallback((request: RequestItem) => {
    setRejectModal(request);
    setDetailModal(null);
  }, []);

  const onRejectConfirm = useCallback(
    async (request: RequestItem, reason: string) => {
      if (!currentAdmin) return;
      const success = await handleReject(request, currentAdmin.id, reason);
      if (success) {
        toast.success("ปฏิเสธสำเร็จ", `${typeConfig[request.type].label} ของ ${request.employeeName}`);
        setRejectModal(null);
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถปฏิเสธได้");
      }
    },
    [currentAdmin, handleReject, toast]
  );

  const onCancelConfirm = useCallback(
    async (request: RequestItem, reason: string) => {
      if (!currentAdmin) return;
      const success = await handleCancel(request, currentAdmin.id, reason);
      if (success) {
        toast.success("ยกเลิกสำเร็จ", `${typeConfig[request.type].label} ของ ${request.employeeName}`);
        setCancelModal(null);
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถยกเลิกได้");
      }
    },
    [currentAdmin, handleCancel, toast]
  );

  const onCreateSubmit = useCallback(
    async (type: RequestType, formData: CreateFormData) => {
      if (!currentAdmin) return;
      const success = await handleCreateRequest(type, formData, currentAdmin.id);
      if (success) {
        const msg = type === "ot" && formData.otIsCompleted
          ? "OT ถูกบันทึกและคำนวณยอดเงินแล้ว"
          : "คำขอได้รับการอนุมัติแล้ว";
        toast.success("สร้างคำขอสำเร็จ", msg);
        setCreateOpen(false);
        fetchAll();
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถสร้างคำขอได้");
      }
    },
    [currentAdmin, handleCreateRequest, toast, fetchAll]
  );

  const onEditSubmit = useCallback(
    async (request: RequestItem, editData: any) => {
      if (!currentAdmin) return;
      const success = await handleEditRequest(request, editData, currentAdmin.id);
      if (success) {
        toast.success("แก้ไขสำเร็จ", "ข้อมูลถูกอัปเดตแล้ว");
        setEditModal(null);
        fetchAll();
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถแก้ไขได้");
      }
    },
    [currentAdmin, handleEditRequest, toast, fetchAll]
  );

  return (
    <div className="space-y-4">
      {/* Toolbar: filters + create button */}
      <RequestsToolbar
        stats={stats}
        loading={loading}
        activeType={activeType}
        activeStatus={activeStatus}
        searchTerm={searchTerm}
        dateRange={dateRange}
        onTypeChange={setActiveType}
        onStatusChange={setActiveStatus}
        onSearchChange={setSearchTerm}
        onDateRangeChange={setDateRange}
        onRefresh={fetchAll}
        onCreateClick={() => setCreateOpen(true)}
      />

      {/* Main table */}
      <RequestsTable
        requests={filtered}
        loading={loading}
        processing={processing}
        onViewDetail={setDetailModal}
        onApprove={onApprove}
        onReject={onRejectRequest}
        onCancel={setCancelModal}
        onEdit={(r) => {
          setDetailModal(null);
          setEditModal(r);
        }}
      />

      {/* ── Modals ── */}

      {/* Create */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="สร้างคำขอใหม่"
        size="lg"
      >
        <CreateTab
          employees={employees}
          detectedOTInfo={detectedOTInfo}
          processing={processing}
          onSubmit={onCreateSubmit}
          onOTDateChange={(date) => detectOTRate(date)}
        />
      </Modal>

      {/* Detail */}
      <RequestDetailModal
        request={detailModal}
        processing={processing}
        onClose={() => setDetailModal(null)}
        onApprove={onApprove}
        onReject={(r) => {
          setDetailModal(null);
          setRejectModal(r);
        }}
        onEdit={(r) => {
          setDetailModal(null);
          setEditModal(r);
        }}
        onCancel={(r) => {
          setDetailModal(null);
          setCancelModal(r);
        }}
      />

      {/* Reject */}
      <RejectReasonModal
        request={rejectModal}
        processing={processing}
        onClose={() => setRejectModal(null)}
        onConfirm={onRejectConfirm}
      />

      {/* Cancel */}
      <RequestCancelModal
        request={cancelModal}
        processing={processing}
        onClose={() => setCancelModal(null)}
        onConfirm={onCancelConfirm}
      />

      {/* Edit */}
      <EditRequestModal
        request={editModal}
        processing={processing}
        onClose={() => setEditModal(null)}
        onSubmit={onEditSubmit}
      />
    </div>
  );
}

export default function RequestsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <AdminLayout title="จัดการคำขอ" description="อนุมัติ ปฏิเสธ และจัดการคำขอทั้งหมด">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <RequestsPageContent />
        </Suspense>
      </AdminLayout>
    </ProtectedRoute>
  );
}
