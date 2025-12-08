"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Calendar, FileText, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  reason: string;
  status: string;
  attachment_url: string | null;
  created_at: string;
  employee: {
    name: string;
    email: string;
  };
}

const leaveTypeLabels: Record<string, { label: string; color: string }> = {
  sick: { label: "ลาป่วย", color: "text-[#ff3b30] bg-[#ff3b30]/10" },
  personal: { label: "ลากิจ", color: "text-[#ff9500] bg-[#ff9500]/10" },
  annual: { label: "ลาพักร้อน", color: "text-[#34c759] bg-[#34c759]/10" },
  maternity: { label: "ลาคลอด", color: "text-[#af52de] bg-[#af52de]/10" },
  military: { label: "ลากรณีทหาร", color: "text-[#0071e3] bg-[#0071e3]/10" },
  other: { label: "อื่นๆ", color: "text-[#86868b] bg-[#86868b]/10" },
};

function LeaveManagementContent() {
  const { employee } = useAuth();
  const toast = useToast();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    id: string;
    action: "approve" | "reject";
    name: string;
  }>({ open: false, id: "", action: "approve", name: "" });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchLeaveRequests();
  }, [filter]);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("leave_requests")
        .select(`*, employee:employees!employee_id(name, email)`)
        .order("created_at", { ascending: false });

      if (filter !== "all") query = query.eq("status", filter);

      const { data, error } = await query;

      if (error) throw error;

      setLeaveRequests(data || []);
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!employee) return;

    setProcessing(true);
    try {
      const leave = leaveRequests.find((l) => l.id === confirmDialog.id);
      const newStatus = confirmDialog.action === "approve" ? "approved" : "rejected";

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: newStatus,
          approved_by: employee.id,
        })
        .eq("id", confirmDialog.id);

      if (error) throw error;

      // Send LINE notification
      try {
        console.log("[Leave Page] Sending LINE notification...");
        const notifyResponse = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "leave_approval",
            data: {
              employeeName: leave?.employee?.name || confirmDialog.name,
              leaveType: leave?.leave_type,
              startDate: leave?.start_date,
              endDate: leave?.end_date,
              approved: confirmDialog.action === "approve",
            },
          }),
        });
        const notifyResult = await notifyResponse.json();
        console.log("[Leave Page] Notification result:", notifyResult);
      } catch (notifyError) {
        console.error("[Leave Page] Failed to send LINE notification:", notifyError);
      }

      setLeaveRequests(
        leaveRequests.map((req) =>
          req.id === confirmDialog.id ? { ...req, status: newStatus } : req
        )
      );

      toast.success(
        "สำเร็จ",
        `${confirmDialog.action === "approve" ? "อนุมัติ" : "ปฏิเสธ"}คำขอแล้ว`
      );
      setConfirmDialog({ open: false, id: "", action: "approve", name: "" });
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถดำเนินการได้");
    } finally {
      setProcessing(false);
    }
  };

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter((r) => r.status === "pending").length,
    approved: leaveRequests.filter((r) => r.status === "approved").length,
    rejected: leaveRequests.filter((r) => r.status === "rejected").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">รออนุมัติ</Badge>;
      case "approved":
        return <Badge variant="success">อนุมัติแล้ว</Badge>;
      case "rejected":
        return <Badge variant="danger">ปฏิเสธ</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const calculateDays = (startDate: string, endDate: string, isHalfDay: boolean) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay ? 0.5 : diffDays;
  };

  return (
    <AdminLayout title="จัดการคำขอลา">
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: "all", label: "ทั้งหมด", count: stats.total },
          { key: "pending", label: "รออนุมัติ", count: stats.pending },
          { key: "approved", label: "อนุมัติแล้ว", count: stats.approved },
          { key: "rejected", label: "ปฏิเสธ", count: stats.rejected },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-medium whitespace-nowrap
              transition-colors
              ${
                filter === tab.key
                  ? "bg-[#0071e3] text-white"
                  : "bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#e8e8ed]"
              }
            `}
          >
            {tab.label}
            <span
              className={`
                px-2 py-0.5 rounded-full text-[12px]
                ${filter === tab.key ? "bg-white/20" : "bg-[#d2d2d7]"}
              `}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Leave Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaveRequests.length === 0 ? (
          <Card elevated>
            <div className="text-center py-20 text-[#86868b]">
              ไม่มีคำขอลา
            </div>
          </Card>
        ) : (
          leaveRequests.map((leave) => {
            const leaveTypeInfo = leaveTypeLabels[leave.leave_type] || leaveTypeLabels.other;
            const days = calculateDays(leave.start_date, leave.end_date, leave.is_half_day);

            return (
              <Card key={leave.id} elevated>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar name={leave.employee?.name || "?"} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                          {leave.employee?.name}
                        </h3>
                        {getStatusBadge(leave.status)}
                      </div>

                      {/* Leave Type */}
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`
                            inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-medium
                            ${leaveTypeInfo.color}
                          `}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {leaveTypeInfo.label}
                        </span>
                        <span className="text-[14px] text-[#86868b]">
                          {days} วัน
                        </span>
                      </div>

                      {/* Date Range */}
                      <div className="flex items-center gap-2 text-[14px] text-[#6e6e73] mb-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(leave.start_date), "d MMM", { locale: th })} -{" "}
                        {format(new Date(leave.end_date), "d MMM yyyy", { locale: th })}
                        {leave.is_half_day && " (ครึ่งวัน)"}
                      </div>

                      {/* Reason */}
                      <div className="bg-[#f5f5f7] rounded-xl p-4 mb-3">
                        <p className="text-[14px] text-[#6e6e73]">
                          <span className="font-medium text-[#1d1d1f]">เหตุผล:</span>{" "}
                          {leave.reason}
                        </p>
                      </div>

                      {/* Attachment */}
                      {leave.attachment_url && (
                        <a
                          href={leave.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[14px] text-[#0071e3] hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          ดูเอกสารแนบ
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {leave.status === "pending" && (
                    <div className="flex gap-2 md:flex-col">
                      <Button
                        size="sm"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            id: leave.id,
                            action: "approve",
                            name: leave.employee?.name || "",
                          })
                        }
                        className="flex-1 md:flex-none"
                      >
                        <CheckCircle className="w-4 h-4" />
                        อนุมัติ
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            id: leave.id,
                            action: "reject",
                            name: leave.employee?.name || "",
                          })
                        }
                        className="flex-1 md:flex-none"
                      >
                        <XCircle className="w-4 h-4" />
                        ปฏิเสธ
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, id: "", action: "approve", name: "" })}
        onConfirm={handleConfirm}
        title={
          confirmDialog.action === "approve"
            ? "ยืนยันการอนุมัติ"
            : "ยืนยันการปฏิเสธ"
        }
        message={`คุณต้องการ${
          confirmDialog.action === "approve" ? "อนุมัติ" : "ปฏิเสธ"
        }คำขอลาของ "${confirmDialog.name}" ใช่หรือไม่?`}
        type={confirmDialog.action === "approve" ? "success" : "danger"}
        confirmText={confirmDialog.action === "approve" ? "อนุมัติ" : "ปฏิเสธ"}
        loading={processing}
      />
    </AdminLayout>
  );
}

export default function LeaveManagementPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <LeaveManagementContent />
    </ProtectedRoute>
  );
}

