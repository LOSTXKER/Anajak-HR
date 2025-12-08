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
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

function OTManagementContent() {
  const { employee } = useAuth();
  const toast = useToast();
  const [otRequests, setOtRequests] = useState<any[]>([]);
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
    fetchOT();
  }, [filter]);

  const fetchOT = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("ot_requests")
        .select(`*, employee:employees!employee_id(name, email), approver:employees!approved_by(name, email)`)
        .order("created_at", { ascending: false });

      if (filter !== "all") query = query.eq("status", filter);

      const { data, error } = await query;
      
      if (error) {
        console.error("OT fetch error:", error);
        throw error;
      }
      
      setOtRequests(data || []);
    } catch (error: any) {
      console.error("OT error details:", error);
      toast.error(
        "เกิดข้อผิดพลาด", 
        error?.message || error?.code || "ไม่สามารถโหลดข้อมูลได้"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      const ot = otRequests.find((o) => o.id === confirmDialog.id);
      const approved = confirmDialog.action === "approve";

      const { error } = await supabase
        .from("ot_requests")
        .update({
          status: approved ? "approved" : "rejected",
          approved_by: employee?.id,
          approved_start_time: approved ? ot?.requested_start_time : null,
          approved_end_time: approved ? ot?.requested_end_time : null,
        })
        .eq("id", confirmDialog.id);

      if (error) throw error;

      // Send LINE notification
      try {
        console.log("[OT Page] Sending LINE notification...", {
          employeeName: ot?.employee?.name,
          date: ot?.request_date,
          startTime: ot?.requested_start_time,
          endTime: ot?.requested_end_time,
          approved,
        });

        const notifyResponse = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "ot_approval",
            data: {
              employeeName: ot?.employee?.name || confirmDialog.name,
              date: ot?.request_date,
              startTime: ot?.requested_start_time,
              endTime: ot?.requested_end_time,
              approved,
            },
          }),
        });

        const notifyResult = await notifyResponse.json();
        console.log("[OT Page] Notification result:", notifyResult);

        if (!notifyResponse.ok) {
          console.error("[OT Page] Notification API error:", notifyResult);
        }
      } catch (notifyError) {
        console.error("[OT Page] Failed to send LINE notification:", notifyError);
      }

      toast.success(
        approved ? "อนุมัติสำเร็จ" : "ปฏิเสธสำเร็จ",
        approved ? "อนุมัติ OT เรียบร้อยแล้ว" : "ปฏิเสธ OT เรียบร้อยแล้ว"
      );

      setConfirmDialog({ open: false, id: "", action: "approve", name: "" });
      fetchOT();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถดำเนินการได้");
    } finally {
      setProcessing(false);
    }
  };

  const stats = {
    total: otRequests.length,
    pending: otRequests.filter((o) => o.status === "pending").length,
    approved: otRequests.filter((o) => o.status === "approved").length,
    rejected: otRequests.filter((o) => o.status === "rejected").length,
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

  return (
    <AdminLayout title="จัดการ OT">
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

      {/* OT List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : otRequests.length === 0 ? (
          <Card elevated>
            <div className="text-center py-20 text-[#86868b]">
              ไม่มีคำขอ OT
            </div>
          </Card>
        ) : (
          otRequests.map((ot) => (
            <Card key={ot.id} elevated>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <Avatar name={ot.employee?.name || "?"} size="lg" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                        {ot.employee?.name}
                      </h3>
                      {getStatusBadge(ot.status)}
                    </div>
                    <p className="text-[14px] text-[#86868b] mb-2">
                      {format(new Date(ot.request_date), "EEEE d MMMM yyyy", { locale: th })}
                    </p>
                    <div className="flex items-center gap-2 text-[14px] text-[#6e6e73] mb-3">
                      <Clock className="w-4 h-4" />
                      {format(new Date(ot.requested_start_time), "HH:mm")} -{" "}
                      {format(new Date(ot.requested_end_time), "HH:mm")} น.
                    </div>
                    <div className="bg-[#f5f5f7] rounded-xl p-4">
                      <p className="text-[14px] text-[#6e6e73]">
                        <span className="font-medium text-[#1d1d1f]">เหตุผล:</span>{" "}
                        {ot.reason}
                      </p>
                    </div>
                  </div>
                </div>

                {ot.status === "pending" && (
                  <div className="flex gap-2 md:flex-col">
                    <Button
                      size="sm"
                      onClick={() =>
                        setConfirmDialog({
                          open: true,
                          id: ot.id,
                          action: "approve",
                          name: ot.employee?.name,
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
                          id: ot.id,
                          action: "reject",
                          name: ot.employee?.name,
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
          ))
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, id: "", action: "approve", name: "" })}
        onConfirm={handleConfirm}
        title={confirmDialog.action === "approve" ? "ยืนยันการอนุมัติ" : "ยืนยันการปฏิเสธ"}
        message={
          confirmDialog.action === "approve"
            ? `คุณต้องการอนุมัติ OT ของ "${confirmDialog.name}" ใช่หรือไม่?`
            : `คุณต้องการปฏิเสธ OT ของ "${confirmDialog.name}" ใช่หรือไม่?`
        }
        type={confirmDialog.action === "approve" ? "info" : "danger"}
        confirmText={confirmDialog.action === "approve" ? "อนุมัติ" : "ปฏิเสธ"}
        loading={processing}
      />
    </AdminLayout>
  );
}

export default function OTManagementPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <OTManagementContent />
    </ProtectedRoute>
  );
}
