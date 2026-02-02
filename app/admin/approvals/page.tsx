"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";

import { useApprovals } from "@/lib/hooks/use-approvals";
import {
  RequestItem,
  RequestType,
  ViewMode,
  typeConfig,
  ApprovalFilters,
  PendingRequestsView,
  ApprovalHistoryView,
} from "@/components/admin/approvals";

function ApprovalsContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") as RequestType | null;

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("pending");

  // Use the approvals hook
  const {
    loading,
    processingIds,
    stats,
    activeType,
    historyStatus,
    filteredRequests,
    filteredHistory,
    setActiveType,
    setHistoryStatus,
    fetchPending,
    fetchHistory,
    handleAction,
    handleCancel,
  } = useApprovals({
    initialType: typeParam || "all",
  });

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(
    null
  );
  const [cancelling, setCancelling] = useState(false);

  // Update activeType when URL changes
  useEffect(() => {
    if (
      typeParam &&
      ["ot", "leave", "wfh", "late", "field_work"].includes(typeParam)
    ) {
      setActiveType(typeParam);
    }
  }, [typeParam, setActiveType]);

  // Fetch data based on view mode
  useEffect(() => {
    if (viewMode === "pending") {
      fetchPending();
    } else {
      fetchHistory();
    }
  }, [viewMode, fetchPending, fetchHistory]);

  // Handlers
  const handleApprove = async (request: RequestItem) => {
    if (!currentAdmin) return;

    const result = await handleAction(request, true, currentAdmin.id);
    if (result.success) {
      toast.success(
        "อนุมัติแล้ว",
        `${typeConfig[request.type].label} ของ ${request.employeeName}`
      );
    } else {
      toast.error("เกิดข้อผิดพลาด", result.error || "ไม่สามารถดำเนินการได้");
    }
  };

  const handleReject = async (request: RequestItem) => {
    if (!currentAdmin) return;

    const result = await handleAction(request, false, currentAdmin.id);
    if (result.success) {
      toast.success(
        "ปฏิเสธแล้ว",
        `${typeConfig[request.type].label} ของ ${request.employeeName}`
      );
    } else {
      toast.error("เกิดข้อผิดพลาด", result.error || "ไม่สามารถดำเนินการได้");
    }
  };

  const openCancelModal = (request: RequestItem) => {
    setSelectedRequest(request);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const handleCancelSubmit = async () => {
    if (!selectedRequest || !currentAdmin || !cancelReason.trim()) return;

    setCancelling(true);
    const result = await handleCancel(
      selectedRequest,
      currentAdmin.id,
      cancelReason
    );

    if (result.success) {
      toast.success(
        "ยกเลิกสำเร็จ",
        `${typeConfig[selectedRequest.type].label} ของ ${selectedRequest.employeeName}`
      );
      setCancelModalOpen(false);
    } else {
      toast.error("เกิดข้อผิดพลาด", result.error || "ไม่สามารถยกเลิกได้");
    }
    setCancelling(false);
  };

  return (
    <AdminLayout title="อนุมัติคำขอ">
      {/* Filters */}
      <ApprovalFilters
        viewMode={viewMode}
        activeType={activeType}
        historyStatus={historyStatus}
        stats={stats}
        loading={loading}
        onViewModeChange={setViewMode}
        onTypeChange={setActiveType}
        onHistoryStatusChange={setHistoryStatus}
        onRefresh={viewMode === "pending" ? fetchPending : fetchHistory}
      />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === "pending" ? (
        <PendingRequestsView
          requests={filteredRequests}
          stats={stats}
          processingIds={processingIds}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      ) : (
        <ApprovalHistoryView
          requests={filteredHistory}
          onCancel={openCancelModal}
        />
      )}

      {/* Cancel Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="ยกเลิกคำขอ"
      >
        <div className="space-y-4">
          {selectedRequest && (
            <div className="p-3 bg-[#f5f5f7] rounded-xl">
              <p className="text-[14px] font-medium text-[#1d1d1f]">
                {selectedRequest.employeeName} -{" "}
                {typeConfig[selectedRequest.type].label}
              </p>
              <p className="text-[13px] text-[#86868b]">
                {selectedRequest.title}
              </p>
            </div>
          )}

          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
              เหตุผลการยกเลิก <span className="text-[#ff3b30]">*</span>
            </label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="เช่น: เผลอกดอนุมัติ, ข้อมูลไม่ถูกต้อง"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setCancelModalOpen(false)}
              fullWidth
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleCancelSubmit}
              loading={cancelling}
              disabled={!cancelReason.trim()}
              fullWidth
              className="!bg-[#ff3b30] hover:!bg-[#e0352b]"
            >
              ยืนยันยกเลิก
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}

export default function ApprovalsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <ApprovalsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
