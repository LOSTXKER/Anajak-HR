"use client";

import React, { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { FileText, History, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useToast } from "@/components/ui/Toast";
import { useRequests } from "@/lib/hooks/use-requests";
import {
  RequestItem,
  RequestType,
  CreateFormData,
  typeConfig,
} from "@/lib/types/request";

import { PendingTab } from "@/components/admin/requests/PendingTab";
import { AllRequestsTab } from "@/components/admin/requests/AllRequestsTab";
import { CreateTab } from "@/components/admin/requests/CreateTab";
import { RejectReasonModal } from "@/components/admin/requests/RejectReasonModal";
import { RequestDetailModal } from "@/components/admin/requests/RequestDetailModal";
import { RequestCancelModal } from "@/components/admin/requests/RequestCancelModal";
import { EditRequestModal } from "@/components/admin/requests/EditRequestModal";

type TabId = "pending" | "all" | "create";

function RequestsPageContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();
  const searchParams = useSearchParams();

  // Determine initial tab from URL params
  const tabParam = searchParams.get("tab") as TabId | null;
  const typeParam = searchParams.get("type") as RequestType | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam || "pending");

  // Date range for "all" tab — include future dates to catch advance requests
  const [dateRange, setDateRange] = useState({
    start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    end: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  });

  // Unified hook
  const {
    filteredPending,
    pendingStats,
    filteredAll,
    allStats,
    employees,
    detectedOTInfo,
    loading,
    processing,
    processingIds,
    pendingType,
    setPendingType,
    activeType,
    activeStatus,
    searchTerm,
    setActiveType,
    setActiveStatus,
    setSearchTerm,
    fetchPending,
    fetchAll,
    handleApprove,
    handleReject,
    handleCancel,
    handleCreateRequest,
    handleEditRequest,
    detectOTRate,
  } = useRequests({ dateRange, initialType: typeParam || "all" });

  // Modal states
  const [detailModal, setDetailModal] = useState<RequestItem | null>(null);
  const [cancelModal, setCancelModal] = useState<RequestItem | null>(null);
  const [rejectModal, setRejectModal] = useState<RequestItem | null>(null);
  const [editModal, setEditModal] = useState<RequestItem | null>(null);

  // Fetch "all" data when tab switches or date range changes
  useEffect(() => {
    if (activeTab === "all") {
      fetchAll();
    }
  }, [activeTab, dateRange, fetchAll]);

  // Handle URL params for initial type on pending tab
  useEffect(() => {
    if (typeParam && ["ot", "leave", "wfh", "late", "field_work"].includes(typeParam)) {
      setPendingType(typeParam);
    }
  }, [typeParam, setPendingType]);

  // ── Handlers ────────────────────────────────────────

  const onApprove = useCallback(
    async (request: RequestItem) => {
      if (!currentAdmin) return;
      const success = await handleApprove(request, currentAdmin.id);
      if (success) {
        toast.success("อนุมัติสำเร็จ", `${typeConfig[request.type].label} ของ ${request.employeeName}`);
        setDetailModal(null);
        if (activeTab === "all") fetchAll();
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถอนุมัติได้");
      }
    },
    [currentAdmin, handleApprove, toast, activeTab, fetchAll]
  );

  const onRejectRequest = useCallback(
    (request: RequestItem) => {
      setRejectModal(request);
      setDetailModal(null);
    },
    []
  );

  const onRejectConfirm = useCallback(
    async (request: RequestItem, reason: string) => {
      if (!currentAdmin) return;
      const success = await handleReject(request, currentAdmin.id, reason);
      if (success) {
        toast.success("ปฏิเสธสำเร็จ", `${typeConfig[request.type].label} ของ ${request.employeeName}`);
        setRejectModal(null);
        if (activeTab === "all") fetchAll();
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถปฏิเสธได้");
      }
    },
    [currentAdmin, handleReject, toast, activeTab, fetchAll]
  );

  const onCancelConfirm = useCallback(
    async (request: RequestItem, reason: string) => {
      if (!currentAdmin) return;
      const success = await handleCancel(request, currentAdmin.id, reason);
      if (success) {
        toast.success("ยกเลิกสำเร็จ", `${typeConfig[request.type].label} ของ ${request.employeeName}`);
        setCancelModal(null);
        if (activeTab === "all") fetchAll();
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถยกเลิกได้");
      }
    },
    [currentAdmin, handleCancel, toast, activeTab, fetchAll]
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
        fetchPending();
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถสร้างคำขอได้");
      }
    },
    [currentAdmin, handleCreateRequest, toast, fetchPending]
  );

  const onEditSubmit = useCallback(
    async (request: RequestItem, editData: any) => {
      if (!currentAdmin) return;
      const success = await handleEditRequest(request, editData, currentAdmin.id);
      if (success) {
        toast.success("แก้ไขสำเร็จ", "ข้อมูลถูกอัปเดตแล้ว");
        setEditModal(null);
        fetchPending();
        if (activeTab === "all") fetchAll();
      } else {
        toast.error("เกิดข้อผิดพลาด", "ไม่สามารถแก้ไขได้");
      }
    },
    [currentAdmin, handleEditRequest, toast, fetchPending, activeTab, fetchAll]
  );

  // ── Tab Config ──────────────────────────────────────

  const tabs = [
    {
      id: "pending" as TabId,
      label: "รออนุมัติ",
      icon: FileText,
      badge: pendingStats.total,
    },
    {
      id: "all" as TabId,
      label: "ทั้งหมด",
      icon: History,
      badge: 0,
    },
    {
      id: "create" as TabId,
      label: "สร้างคำขอ",
      icon: Plus,
      badge: 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 p-1 bg-[#f5f5f7] rounded-2xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                isActive
                  ? "bg-white text-[#1d1d1f] shadow-sm"
                  : "text-[#6e6e73] hover:text-[#1d1d1f]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge > 0 && (
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                  isActive ? "bg-[#ff3b30] text-white" : "bg-[#ff3b30] text-white"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "pending" && (
        <PendingTab
          requests={filteredPending}
          stats={pendingStats}
          processingIds={processingIds}
          loading={loading}
          activeType={pendingType}
          onTypeChange={setPendingType}
          onApprove={onApprove}
          onReject={onRejectRequest}
          onRefresh={fetchPending}
        />
      )}

      {activeTab === "all" && (
        <AllRequestsTab
          requests={filteredAll}
          stats={allStats}
          loading={loading}
          processing={processing}
          dateRange={dateRange}
          activeType={activeType}
          activeStatus={activeStatus}
          searchTerm={searchTerm}
          onTypeChange={setActiveType}
          onStatusChange={setActiveStatus}
          onSearchChange={setSearchTerm}
          onDateRangeChange={setDateRange}
          onRefresh={fetchAll}
          onViewDetail={setDetailModal}
          onApprove={onApprove}
          onReject={onRejectRequest}
          onCancel={setCancelModal}
          onEdit={(r) => {
            setDetailModal(null);
            setEditModal(r);
          }}
        />
      )}

      {activeTab === "create" && (
        <CreateTab
          employees={employees}
          detectedOTInfo={detectedOTInfo}
          processing={processing}
          onSubmit={onCreateSubmit}
          onOTDateChange={(date) => detectOTRate(date)}
        />
      )}

      {/* Modals */}
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

      <RejectReasonModal
        request={rejectModal}
        processing={processing}
        onClose={() => setRejectModal(null)}
        onConfirm={onRejectConfirm}
      />

      <RequestCancelModal
        request={cancelModal}
        processing={processing}
        onClose={() => setCancelModal(null)}
        onConfirm={onCancelConfirm}
      />

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
