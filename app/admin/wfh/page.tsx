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
import { Calendar, Home, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface WFHRequest {
  id: string;
  date: string;
  is_half_day: boolean;
  reason: string;
  status: string;
  created_at: string;
  employee: {
    name: string;
    email: string;
  };
}

function WFHManagementContent() {
  const { employee } = useAuth();
  const toast = useToast();
  const [wfhRequests, setWfhRequests] = useState<WFHRequest[]>([]);
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
    fetchWFHRequests();
  }, [filter]);

  const fetchWFHRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("wfh_requests")
        .select(`*, employee:employees!employee_id(name, email)`)
        .order("created_at", { ascending: false });

      if (filter !== "all") query = query.eq("status", filter);

      const { data, error } = await query;

      if (error) throw error;

      setWfhRequests(data || []);
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
      const wfh = wfhRequests.find((w) => w.id === confirmDialog.id);
      const newStatus = confirmDialog.action === "approve" ? "approved" : "rejected";

      const { error } = await supabase
        .from("wfh_requests")
        .update({
          status: newStatus,
          approved_by: employee.id,
        })
        .eq("id", confirmDialog.id);

      if (error) throw error;

      // Send LINE notification
      try {
        console.log("[WFH Page] Sending LINE notification...");
        const notifyResponse = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "wfh_approval",
            data: {
              employeeName: wfh?.employee?.name || confirmDialog.name,
              date: wfh?.date,
              approved: confirmDialog.action === "approve",
            },
          }),
        });
        const notifyResult = await notifyResponse.json();
        console.log("[WFH Page] Notification result:", notifyResult);
      } catch (notifyError) {
        console.error("[WFH Page] Failed to send LINE notification:", notifyError);
      }

      setWfhRequests(
        wfhRequests.map((req) =>
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
    total: wfhRequests.length,
    pending: wfhRequests.filter((r) => r.status === "pending").length,
    approved: wfhRequests.filter((r) => r.status === "approved").length,
    rejected: wfhRequests.filter((r) => r.status === "rejected").length,
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
    <AdminLayout title="จัดการคำขอ WFH">
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

      {/* WFH Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : wfhRequests.length === 0 ? (
          <Card elevated>
            <div className="text-center py-20 text-[#86868b]">
              ไม่มีคำขอ WFH
            </div>
          </Card>
        ) : (
          wfhRequests.map((wfh) => (
            <Card key={wfh.id} elevated>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <Avatar name={wfh.employee?.name || "?"} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                        {wfh.employee?.name}
                      </h3>
                      {getStatusBadge(wfh.status)}
                    </div>

                    {/* WFH Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-medium text-[#0071e3] bg-[#0071e3]/10">
                        <Home className="w-3.5 h-3.5" />
                        Work From Home
                      </span>
                      {wfh.is_half_day && (
                        <span className="text-[13px] text-[#86868b]">(ครึ่งวัน)</span>
                      )}
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2 text-[14px] text-[#6e6e73] mb-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(wfh.date), "EEEE d MMMM yyyy", { locale: th })}
                    </div>

                    {/* Reason */}
                    <div className="bg-[#f5f5f7] rounded-xl p-4">
                      <p className="text-[14px] text-[#6e6e73]">
                        <span className="font-medium text-[#1d1d1f]">เหตุผล:</span>{" "}
                        {wfh.reason}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {wfh.status === "pending" && (
                  <div className="flex gap-2 md:flex-col">
                    <Button
                      size="sm"
                      onClick={() =>
                        setConfirmDialog({
                          open: true,
                          id: wfh.id,
                          action: "approve",
                          name: wfh.employee?.name || "",
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
                          id: wfh.id,
                          action: "reject",
                          name: wfh.employee?.name || "",
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
        title={
          confirmDialog.action === "approve"
            ? "ยืนยันการอนุมัติ"
            : "ยืนยันการปฏิเสธ"
        }
        message={`คุณต้องการ${
          confirmDialog.action === "approve" ? "อนุมัติ" : "ปฏิเสธ"
        }คำขอ WFH ของ "${confirmDialog.name}" ใช่หรือไม่?`}
        type={confirmDialog.action === "approve" ? "success" : "danger"}
        confirmText={confirmDialog.action === "approve" ? "อนุมัติ" : "ปฏิเสธ"}
        loading={processing}
      />
    </AdminLayout>
  );
}

export default function WFHManagementPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <WFHManagementContent />
    </ProtectedRoute>
  );
}

