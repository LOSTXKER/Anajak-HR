"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  Clock,
  Calendar,
  Home,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type TabType = "all" | "ot" | "leave" | "wfh" | "late";

interface PendingItem {
  id: string;
  type: "ot" | "leave" | "wfh" | "late";
  employee: { name: string; email: string };
  date: string;
  details: string;
  reason?: string;
  created_at: string;
}

function ApprovalsContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  // Pending items
  const [otRequests, setOtRequests] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [wfhRequests, setWfhRequests] = useState<any[]>([]);
  const [lateRequests, setLateRequests] = useState<any[]>([]);

  const fetchAllPending = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch pending OT
      const { data: ot } = await supabase
        .from("ot_requests")
        .select("*, employee:employees!employee_id(name, email)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      // Fetch pending Leave
      const { data: leave } = await supabase
        .from("leave_requests")
        .select("*, employee:employees!employee_id(name, email)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      // Fetch pending WFH
      const { data: wfh } = await supabase
        .from("wfh_requests")
        .select("*, employee:employees!employee_id(name, email)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      // Fetch pending Late Requests
      const { data: late } = await supabase
        .from("late_requests")
        .select("*, employees:employees!employee_id(name, email)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      setOtRequests(ot || []);
      setLeaveRequests(leave || []);
      setWfhRequests(wfh || []);
      setLateRequests(late || []);
    } catch (error) {
      console.error("Error fetching pending:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllPending();
  }, [fetchAllPending]);

  const handleApprove = async (type: string, id: string, approved: boolean) => {
    setProcessing(true);
    try {
      let table = "";
      let updateData: any = {
        status: approved ? "approved" : "rejected",
        approved_by: currentAdmin?.id,
        approved_at: new Date().toISOString(),
      };

      switch (type) {
        case "ot":
          table = "ot_requests";
          break;
        case "leave":
          table = "leave_requests";
          break;
        case "wfh":
          table = "wfh_requests";
          break;
        case "late":
          table = "late_requests";
          break;
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast.success(approved ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว", "ดำเนินการเรียบร้อย");
      fetchAllPending();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถดำเนินการได้");
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchApprove = async (approved: boolean) => {
    if (selected.size === 0) {
      toast.error("กรุณาเลือก", "กรุณาเลือกรายการที่ต้องการ");
      return;
    }

    setProcessing(true);
    try {
      for (const key of selected) {
        const [type, id] = key.split("_");
        await handleApprove(type, id, approved);
      }
      setSelected(new Set());
      toast.success("สำเร็จ", `ดำเนินการ ${selected.size} รายการเรียบร้อย`);
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถดำเนินการบางรายการได้");
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (type: string, id: string) => {
    const key = `${type}_${id}`;
    const newSelected = new Set(selected);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelected(newSelected);
  };

  const getFilteredItems = () => {
    const allItems: PendingItem[] = [];

    if (activeTab === "all" || activeTab === "ot") {
      otRequests.forEach((r) =>
        allItems.push({
          id: r.id,
          type: "ot",
          employee: r.employee,
          date: r.request_date,
          details: `${format(new Date(r.requested_start_time), "HH:mm")} - ${format(new Date(r.requested_end_time), "HH:mm")}`,
          reason: r.reason,
          created_at: r.created_at,
        })
      );
    }

    if (activeTab === "all" || activeTab === "leave") {
      leaveRequests.forEach((r) =>
        allItems.push({
          id: r.id,
          type: "leave",
          employee: r.employee,
          date: r.start_date,
          details: r.is_half_day ? "ครึ่งวัน" : `${r.start_date} - ${r.end_date}`,
          reason: r.reason,
          created_at: r.created_at,
        })
      );
    }

    if (activeTab === "all" || activeTab === "wfh") {
      wfhRequests.forEach((r) =>
        allItems.push({
          id: r.id,
          type: "wfh",
          employee: r.employee,
          date: r.date,
          details: r.is_half_day ? "ครึ่งวัน" : "เต็มวัน",
          reason: r.reason,
          created_at: r.created_at,
        })
      );
    }

    if (activeTab === "all" || activeTab === "late") {
      lateRequests.forEach((r) =>
        allItems.push({
          id: r.id,
          type: "late",
          employee: r.employees,
          date: r.request_date,
          details: `สาย ${r.actual_late_minutes || 0} นาที`,
          reason: r.reason,
          created_at: r.created_at,
        })
      );
    }

    return allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "ot":
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" />OT</Badge>;
      case "leave":
        return <Badge variant="info"><Calendar className="w-3 h-3 mr-1" />ลา</Badge>;
      case "wfh":
        return <Badge variant="success"><Home className="w-3 h-3 mr-1" />WFH</Badge>;
      case "late":
        return <Badge variant="danger"><AlertTriangle className="w-3 h-3 mr-1" />สาย</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const tabs = [
    { key: "all", label: "ทั้งหมด", count: otRequests.length + leaveRequests.length + wfhRequests.length + lateRequests.length },
    { key: "ot", label: "OT", count: otRequests.length },
    { key: "leave", label: "ลางาน", count: leaveRequests.length },
    { key: "wfh", label: "WFH", count: wfhRequests.length },
    { key: "late", label: "มาสาย", count: lateRequests.length },
  ];

  const items = getFilteredItems();

  return (
    <AdminLayout title="อนุมัติคำขอ">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium whitespace-nowrap transition-all ${activeTab === tab.key
                ? "bg-[#0071e3] text-white"
                : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"
              }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[12px] ${activeTab === tab.key ? "bg-white/20" : "bg-[#0071e3] text-white"
                }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}

        <div className="flex-1" />

        <Button variant="secondary" size="sm" onClick={fetchAllPending} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Batch Actions */}
      {selected.size > 0 && (
        <Card elevated className="mb-4 bg-[#0071e3]/5 border border-[#0071e3]/20">
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-[#0071e3]">
              เลือก {selected.size} รายการ
            </span>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleBatchApprove(true)} loading={processing}>
                <CheckCircle className="w-4 h-4" />
                อนุมัติทั้งหมด
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleBatchApprove(false)} loading={processing}>
                <XCircle className="w-4 h-4" />
                ปฏิเสธทั้งหมด
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* List */}
      <Card elevated padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle className="w-12 h-12 text-[#34c759] mx-auto mb-3" />
            <p className="text-[17px] font-medium text-[#1d1d1f]">ไม่มีรายการรออนุมัติ</p>
            <p className="text-[14px] text-[#86868b]">คุณจัดการคำขอทั้งหมดเรียบร้อยแล้ว</p>
          </div>
        ) : (
          <div className="divide-y divide-[#e8e8ed]">
            {items.map((item) => (
              <div
                key={`${item.type}_${item.id}`}
                className="flex items-center gap-4 p-4 hover:bg-[#f5f5f7] transition-colors"
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selected.has(`${item.type}_${item.id}`)}
                  onChange={() => toggleSelect(item.type, item.id)}
                  className="w-5 h-5 rounded border-[#d2d2d7]"
                />

                {/* Avatar */}
                <Avatar name={item.employee?.name || "?"} size="sm" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getTypeBadge(item.type)}
                    <span className="text-[14px] font-medium text-[#1d1d1f] truncate">
                      {item.employee?.name}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#86868b]">
                    {format(new Date(item.date), "d MMM yyyy", { locale: th })} • {item.details}
                  </p>
                  {item.reason && (
                    <p className="text-[12px] text-[#6e6e73] truncate mt-0.5">
                      <FileText className="w-3 h-3 inline mr-1" />
                      {item.reason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(item.type, item.id, true)}
                    disabled={processing}
                    className="flex items-center gap-1 px-3 py-1.5 text-[13px] font-medium text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    อนุมัติ
                  </button>
                  <button
                    onClick={() => handleApprove(item.type, item.id, false)}
                    disabled={processing}
                    className="flex items-center gap-1 px-3 py-1.5 text-[13px] font-medium text-[#ff3b30] bg-[#ff3b30]/10 rounded-lg hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    ปฏิเสธ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}

export default function ApprovalsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <ApprovalsContent />
    </ProtectedRoute>
  );
}
