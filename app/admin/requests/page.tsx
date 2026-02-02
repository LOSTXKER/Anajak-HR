"use client";

import React, { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useToast } from "@/components/ui/Toast";
import { useAdminRequests } from "@/lib/hooks";
import {
  RequestType,
  RequestItem,
  CreateFormData,
  RequestFilters,
  RequestList,
  RequestDetailModal,
  RequestCancelModal,
  CreateRequestModal,
  EditRequestModal,
  typeConfig,
} from "@/components/admin/requests";

function RequestsManagementContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();

  // Date range state
  const [dateRange, setDateRange] = useState({
    start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  // Use the admin requests hook
  const {
    filteredRequests,
    stats,
    employees,
    loading,
    processing,
    detectedOTInfo,
    activeType,
    activeStatus,
    searchTerm,
    setActiveType,
    setActiveStatus,
    setSearchTerm,
    fetchRequests,
    handleApprove,
    handleReject,
    handleCancel,
    handleCreateRequest,
    handleEditRequest,
    detectOTRate,
  } = useAdminRequests({ dateRange });

  // Modal state
  const [detailModal, setDetailModal] = useState<RequestItem | null>(null);
  const [cancelModal, setCancelModal] = useState<RequestItem | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [createType, setCreateType] = useState<RequestType | null>(null);
  const [editModal, setEditModal] = useState<RequestItem | null>(null);

  // Refetch when date range changes
  useEffect(() => {
    fetchRequests();
  }, [dateRange, fetchRequests]);

  // Handle approve action
  const onApprove = useCallback(
    async (request: RequestItem) => {
      if (!currentAdmin) return;
      const success = await handleApprove(request, currentAdmin.id);
      if (success) {
        toast.success(
          "อนุมัติสำเร็จ",
          `${typeConfig[request.type].label} ของ ${request.employeeName}`
        );
        setDetailModal(null);
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถอนุมัติได้");
      }
    },
    [currentAdmin, handleApprove, toast]
  );

  // Handle reject action
  const onReject = useCallback(
    async (request: RequestItem) => {
      if (!currentAdmin) return;
      const success = await handleReject(request, currentAdmin.id);
      if (success) {
        toast.success(
          "ปฏิเสธสำเร็จ",
          `${typeConfig[request.type].label} ของ ${request.employeeName}`
        );
        setDetailModal(null);
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถปฏิเสธได้");
      }
    },
    [currentAdmin, handleReject, toast]
  );

  // Handle cancel action
  const onCancelConfirm = useCallback(
    async (request: RequestItem, reason: string) => {
      if (!currentAdmin) return;
      const success = await handleCancel(request, currentAdmin.id, reason);
      if (success) {
        toast.success(
          "ยกเลิกสำเร็จ",
          `${typeConfig[request.type].label} ของ ${request.employeeName}`
        );
        setCancelModal(null);
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถยกเลิกได้");
      }
    },
    [currentAdmin, handleCancel, toast]
  );

  // Handle create action
  const onCreateSubmit = useCallback(
    async (type: RequestType, formData: CreateFormData) => {
      if (!currentAdmin) return;
      const success = await handleCreateRequest(type, formData, currentAdmin.id);
      if (success) {
        const successMsg =
          type === "ot" && formData.otIsCompleted
            ? "OT ถูกบันทึกและคำนวณยอดเงินแล้ว"
            : "คำขอได้รับการอนุมัติแล้ว";
        toast.success("สร้างคำขอสำเร็จ", successMsg);
        setCreateModal(false);
        setCreateType(null);
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถสร้างคำขอได้");
      }
    },
    [currentAdmin, handleCreateRequest, toast]
  );

  // Handle edit action
  const onEditSubmit = useCallback(
    async (request: RequestItem, editData: any) => {
      if (!currentAdmin) return;
      const success = await handleEditRequest(request, editData, currentAdmin.id);
      if (success) {
        toast.success("แก้ไขสำเร็จ", "ข้อมูลถูกอัปเดตแล้ว");
        setEditModal(null);
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถแก้ไขได้");
      }
    },
    [currentAdmin, handleEditRequest, toast]
  );

  // Handle OT date change for rate detection
  const onOTDateChange = useCallback(
    (date: string) => {
      detectOTRate(date);
    },
    [detectOTRate]
  );

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <RequestFilters
        activeType={activeType}
        activeStatus={activeStatus}
        searchTerm={searchTerm}
        dateRange={dateRange}
        stats={stats}
        loading={loading}
        onTypeChange={setActiveType}
        onStatusChange={setActiveStatus}
        onSearchChange={setSearchTerm}
        onDateRangeChange={setDateRange}
        onRefresh={fetchRequests}
        onCreateClick={() => setCreateModal(true)}
      />

      {/* Request List */}
      <RequestList
        requests={filteredRequests}
        loading={loading}
        processing={processing}
        onViewDetail={setDetailModal}
        onApprove={onApprove}
        onReject={onReject}
        onCancel={setCancelModal}
      />

      {/* Detail Modal */}
      <RequestDetailModal
        request={detailModal}
        processing={processing}
        onClose={() => setDetailModal(null)}
        onApprove={onApprove}
        onReject={onReject}
        onEdit={(r) => {
          setDetailModal(null);
          setEditModal(r);
        }}
        onCancel={(r) => {
          setDetailModal(null);
          setCancelModal(r);
        }}
      />

      {/* Cancel Modal */}
      <RequestCancelModal
        request={cancelModal}
        processing={processing}
        onClose={() => setCancelModal(null)}
        onConfirm={onCancelConfirm}
      />

      {/* Create Modal */}
      <CreateRequestModal
        isOpen={createModal}
        selectedType={createType}
        employees={employees}
        detectedOTInfo={detectedOTInfo}
        processing={processing}
        onClose={() => {
          setCreateModal(false);
          setCreateType(null);
        }}
        onTypeSelect={setCreateType}
        onSubmit={onCreateSubmit}
        onOTDateChange={onOTDateChange}
      />

      {/* Edit Modal */}
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
      <AdminLayout>
        <RequestsManagementContent />
      </AdminLayout>
    </ProtectedRoute>
  );
}
