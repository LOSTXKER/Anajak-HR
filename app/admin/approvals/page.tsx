"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  Clock,
  Calendar,
  Home,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Inbox,
  Check,
  X,
  History,
  FileText,
  Ban,
  MapPin,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

// Types
type RequestType = "ot" | "leave" | "wfh" | "late" | "field_work";
type ViewMode = "pending" | "history";
type HistoryStatus = "approved" | "rejected" | "cancelled" | "all";

interface RequestItem {
  id: string;
  type: RequestType;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  date: string;
  title: string;
  subtitle: string;
  reason?: string;
  createdAt: string;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
  rawData: any;
}

// Config
const typeConfig: Record<RequestType, { label: string; icon: any; color: string; bgColor: string }> = {
  ot: { label: "OT", icon: Clock, color: "text-[#ff9500]", bgColor: "bg-[#ff9500]/10" },
  leave: { label: "ลา", icon: Calendar, color: "text-[#0071e3]", bgColor: "bg-[#0071e3]/10" },
  wfh: { label: "WFH", icon: Home, color: "text-[#af52de]", bgColor: "bg-[#af52de]/10" },
  late: { label: "มาสาย", icon: AlertTriangle, color: "text-[#ff3b30]", bgColor: "bg-[#ff3b30]/10" },
  field_work: { label: "งานนอกสถานที่", icon: MapPin, color: "text-[#34c759]", bgColor: "bg-[#34c759]/10" },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: "รออนุมัติ", color: "text-[#ff9500]", bgColor: "bg-[#ff9500]/10" },
  approved: { label: "อนุมัติแล้ว", color: "text-[#34c759]", bgColor: "bg-[#34c759]/10" },
  completed: { label: "เสร็จสิ้น", color: "text-[#0071e3]", bgColor: "bg-[#0071e3]/10" },
  rejected: { label: "ปฏิเสธ", color: "text-[#ff3b30]", bgColor: "bg-[#ff3b30]/10" },
  cancelled: { label: "ยกเลิก", color: "text-[#86868b]", bgColor: "bg-[#86868b]/10" },
};

function ApprovalsContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") as RequestType | null;
  
  // State
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("pending");
  const [activeType, setActiveType] = useState<RequestType | "all">(typeParam || "all");
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>("all");
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [historyRequests, setHistoryRequests] = useState<RequestItem[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  
  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Update activeType when URL changes
  useEffect(() => {
    if (typeParam && ["ot", "leave", "wfh", "late", "field_work"].includes(typeParam)) {
      setActiveType(typeParam);
    }
  }, [typeParam]);

  // Stats for pending
  const stats = useMemo(() => {
    const counts = { ot: 0, leave: 0, wfh: 0, late: 0, field_work: 0 };
    requests.forEach(r => counts[r.type]++);
    return { ...counts, total: requests.length };
  }, [requests]);

  // Process raw data to RequestItem
  const processRequest = (r: any, type: RequestType, status: string): RequestItem | null => {
    if (!r.employee?.id) return null;
    
    const leaveTypeLabels: Record<string, string> = {
      sick: "ลาป่วย", personal: "ลากิจ", annual: "ลาพักร้อน",
      maternity: "ลาคลอด", military: "ลากรณีทหาร", other: "อื่นๆ"
    };

    let title = "";
    let subtitle = "";
    let date = "";

    switch (type) {
      case "ot":
        title = `OT ${format(new Date(r.requested_start_time), "HH:mm")} - ${format(new Date(r.requested_end_time), "HH:mm")}`;
        subtitle = format(new Date(r.request_date), "d MMM yyyy", { locale: th });
        date = r.request_date;
        break;
      case "leave":
        title = leaveTypeLabels[r.leave_type] || r.leave_type;
        subtitle = r.is_half_day 
          ? `${format(new Date(r.start_date), "d MMM", { locale: th })} (ครึ่งวัน)`
          : `${format(new Date(r.start_date), "d MMM", { locale: th })} - ${format(new Date(r.end_date), "d MMM", { locale: th })}`;
        date = r.start_date;
        break;
      case "wfh":
        title = r.is_half_day ? "WFH ครึ่งวัน" : "WFH เต็มวัน";
        subtitle = format(new Date(r.date), "EEEE d MMM yyyy", { locale: th });
        date = r.date;
        break;
      case "late":
        title = r.actual_late_minutes ? `สาย ${r.actual_late_minutes} นาที` : "ขออนุมัติมาสาย";
        subtitle = format(new Date(r.request_date), "d MMM yyyy", { locale: th });
        date = r.request_date;
        break;
      case "field_work":
        title = r.is_half_day ? "งานนอกสถานที่ ครึ่งวัน" : "งานนอกสถานที่ เต็มวัน";
        subtitle = `${format(new Date(r.date), "d MMM", { locale: th })} • ${r.location}`;
        date = r.date;
        break;
    }

    return {
      id: r.id,
      type,
      employeeId: r.employee.id,
      employeeName: r.employee.name,
      employeeEmail: r.employee.email || "",
      date,
      title,
      subtitle,
      reason: r.reason,
      createdAt: r.created_at,
      status,
      approvedBy: r.approved_by,
      approvedAt: r.approved_at,
      cancelledBy: r.cancelled_by,
      cancelledAt: r.cancelled_at,
      cancelReason: r.cancel_reason,
      rawData: r,
    };
  };

  // Fetch pending requests
  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const [otRes, leaveRes, wfhRes, lateRes, fieldWorkRes] = await Promise.all([
        supabase.from("ot_requests").select("*, employee:employees!employee_id(id, name, email)").eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("leave_requests").select("*, employee:employees!employee_id(id, name, email)").eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("wfh_requests").select("*, employee:employees!employee_id(id, name, email)").eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("late_requests").select("*, employee:employees!employee_id(id, name, email)").eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("field_work_requests").select("*, employee:employees!employee_id(id, name, email)").eq("status", "pending").order("created_at", { ascending: false }),
      ]);

      const allRequests: RequestItem[] = [];

      (otRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "ot", "pending");
        if (item) allRequests.push(item);
      });
      (leaveRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "leave", "pending");
        if (item) allRequests.push(item);
      });
      (wfhRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "wfh", "pending");
        if (item) allRequests.push(item);
      });
      (lateRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "late", "pending");
        if (item) allRequests.push(item);
      });
      (fieldWorkRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "field_work", "pending");
        if (item) allRequests.push(item);
      });

      allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(allRequests);
    } catch (error) {
      console.error("Error fetching pending:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter = historyStatus === "all" ? ["approved", "rejected", "cancelled"] : [historyStatus];
      
      const [otRes, leaveRes, wfhRes, lateRes, fieldWorkRes] = await Promise.all([
        supabase.from("ot_requests").select("*, employee:employees!employee_id(id, name, email)").in("status", statusFilter).order("created_at", { ascending: false }).limit(50),
        supabase.from("leave_requests").select("*, employee:employees!employee_id(id, name, email)").in("status", statusFilter).order("created_at", { ascending: false }).limit(50),
        supabase.from("wfh_requests").select("*, employee:employees!employee_id(id, name, email)").in("status", statusFilter).order("created_at", { ascending: false }).limit(50),
        supabase.from("late_requests").select("*, employee:employees!employee_id(id, name, email)").in("status", statusFilter).order("created_at", { ascending: false }).limit(50),
        supabase.from("field_work_requests").select("*, employee:employees!employee_id(id, name, email)").in("status", statusFilter).order("created_at", { ascending: false }).limit(50),
      ]);

      const allHistory: RequestItem[] = [];
      
      (otRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "ot", r.status);
        if (item) allHistory.push(item);
      });
      (leaveRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "leave", r.status);
        if (item) allHistory.push(item);
      });
      (wfhRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "wfh", r.status);
        if (item) allHistory.push(item);
      });
      (lateRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "late", r.status);
        if (item) allHistory.push(item);
      });
      (fieldWorkRes.data || []).forEach((r: any) => {
        const item = processRequest(r, "field_work", r.status);
        if (item) allHistory.push(item);
      });

      allHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setHistoryRequests(allHistory);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  }, [historyStatus]);

  useEffect(() => {
    if (viewMode === "pending") {
    fetchPending();
    } else {
      fetchHistory();
    }
  }, [viewMode, fetchPending, fetchHistory]);

  // Handle approve/reject
  const handleAction = async (request: RequestItem, approved: boolean) => {
    if (!currentAdmin) return;
    
    const key = `${request.type}_${request.id}`;
    setProcessingIds(prev => new Set(prev).add(key));

    try {
      const tableMap: Record<RequestType, string> = {
        ot: "ot_requests",
        leave: "leave_requests",
        wfh: "wfh_requests",
        late: "late_requests",
        field_work: "field_work_requests",
      };

      const updateData: any = {
        status: approved ? "approved" : "rejected",
        approved_by: currentAdmin.id,
        approved_at: new Date().toISOString(),
      };

      if (request.type === "ot" && approved) {
        updateData.approved_start_time = request.rawData.requested_start_time;
        updateData.approved_end_time = request.rawData.requested_end_time;
        
        const start = new Date(request.rawData.requested_start_time);
        const end = new Date(request.rawData.requested_end_time);
        updateData.approved_ot_hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }

      const { error } = await supabase
        .from(tableMap[request.type])
        .update(updateData)
        .eq("id", request.id);

      if (error) throw error;

      toast.success(
        approved ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว",
        `${typeConfig[request.type].label} ของ ${request.employeeName}`
      );

      setRequests(prev => prev.filter(r => !(r.type === request.type && r.id === request.id)));
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถดำเนินการได้");
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Handle cancel
  const openCancelModal = (request: RequestItem) => {
    setSelectedRequest(request);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const handleCancel = async () => {
    if (!selectedRequest || !currentAdmin || !cancelReason.trim()) return;
    
    setCancelling(true);
    try {
      const tableMap: Record<RequestType, string> = {
        ot: "ot_requests",
        leave: "leave_requests",
        wfh: "wfh_requests",
        late: "late_requests",
        field_work: "field_work_requests",
      };

      const { error } = await supabase
        .from(tableMap[selectedRequest.type])
        .update({
          status: "cancelled",
          cancelled_by: currentAdmin.id,
          cancelled_at: new Date().toISOString(),
          cancel_reason: cancelReason.trim(),
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.success(
        "ยกเลิกสำเร็จ",
        `${typeConfig[selectedRequest.type].label} ของ ${selectedRequest.employeeName}`
      );

      setCancelModalOpen(false);
      
      // Refresh history
      fetchHistory();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถยกเลิกได้");
    } finally {
      setCancelling(false);
    }
  };

  // Filtered requests
  const filteredRequests = activeType === "all" 
    ? requests 
    : requests.filter(r => r.type === activeType);

  const filteredHistory = activeType === "all"
    ? historyRequests
    : historyRequests.filter(r => r.type === activeType);

  return (
    <AdminLayout title="อนุมัติคำขอ">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-[#f5f5f7] rounded-2xl w-fit">
        <button
          onClick={() => setViewMode("pending")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium transition-all ${
            viewMode === "pending"
              ? "bg-white text-[#1d1d1f] shadow-sm"
              : "text-[#6e6e73] hover:text-[#1d1d1f]"
          }`}
        >
          <FileText className="w-4 h-4" />
          รออนุมัติ
          {stats.total > 0 && (
            <span className="px-2 py-0.5 bg-[#ff3b30] text-white text-[11px] font-bold rounded-full">
              {stats.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewMode("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium transition-all ${
            viewMode === "history"
              ? "bg-white text-[#1d1d1f] shadow-sm"
              : "text-[#6e6e73] hover:text-[#1d1d1f]"
          }`}
        >
          <History className="w-4 h-4" />
          ประวัติ
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        <button
          onClick={() => setActiveType("all")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${
            activeType === "all"
              ? "bg-[#1d1d1f] text-white shadow-lg"
              : "bg-white text-[#1d1d1f] border border-[#e8e8ed] hover:border-[#1d1d1f]"
          }`}
        >
          ทั้งหมด
        </button>

        {(Object.keys(typeConfig) as RequestType[]).map((type) => {
          const config = typeConfig[type];
          const count = viewMode === "pending" ? stats[type] : 0;
          const Icon = config.icon;
          
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${
                activeType === type
                  ? `${config.bgColor} ${config.color} shadow-sm`
                  : "bg-white text-[#6e6e73] border border-[#e8e8ed] hover:border-[#d2d2d7]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {config.label}
              {count > 0 && viewMode === "pending" && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeType === type ? "bg-white/50" : "bg-[#f5f5f7]"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        <div className="flex-1" />

        {/* History Status Filter */}
        {viewMode === "history" && (
          <select
            value={historyStatus}
            onChange={(e) => setHistoryStatus(e.target.value as HistoryStatus)}
            className="px-3 py-2 rounded-xl text-sm bg-white border border-[#e8e8ed] focus:outline-none"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="approved">อนุมัติแล้ว</option>
            <option value="rejected">ปฏิเสธ</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
        )}

        <Button 
          variant="text" 
          size="sm" 
          onClick={viewMode === "pending" ? fetchPending : fetchHistory} 
          disabled={loading}
          className="!px-3"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === "pending" ? (
        /* Pending View */
        filteredRequests.length === 0 ? (
        <Card elevated className="!py-16">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#34c759]/10 rounded-full flex items-center justify-center">
              <Inbox className="w-8 h-8 text-[#34c759]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1d1d1f] mb-1">
              ไม่มีคำขอรออนุมัติ
            </h3>
            <p className="text-sm text-[#86868b]">
              คุณจัดการคำขอทั้งหมดเรียบร้อยแล้ว 🎉
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const config = typeConfig[request.type];
            const Icon = config.icon;
            const isProcessing = processingIds.has(`${request.type}_${request.id}`);

            return (
              <Card 
                key={`${request.type}_${request.id}`} 
                elevated 
                className="!p-0 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="flex items-stretch">
                  <div className={`w-1.5 ${config.bgColor}`} />
                  
                  <div className="flex-1 p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={request.employeeName} size="md" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[15px] font-semibold text-[#1d1d1f] truncate">
                            {request.employeeName}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.bgColor} ${config.color}`}>
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </span>
                        </div>
                        
                        <p className="text-[14px] font-medium text-[#1d1d1f]">
                          {request.title}
                        </p>
                        <p className="text-[13px] text-[#86868b]">
                          {request.subtitle}
                        </p>
                        
                        {request.reason && (
                          <p className="text-[12px] text-[#6e6e73] mt-1.5 line-clamp-2 bg-[#f5f5f7] rounded-lg px-2.5 py-1.5">
                            {request.reason}
                          </p>
                        )}

                        <p className="text-[11px] text-[#86868b] mt-2">
                          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: th })}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 ml-2">
                        <button
                          onClick={() => handleAction(request, true)}
                          disabled={isProcessing}
                          className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#34c759] text-white hover:bg-[#30b350] active:scale-95 transition-all disabled:opacity-50"
                          title="อนุมัติ"
                        >
                          {isProcessing ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleAction(request, false)}
                          disabled={isProcessing}
                          className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#ff3b30] text-white hover:bg-[#e0352b] active:scale-95 transition-all disabled:opacity-50"
                          title="ปฏิเสธ"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        )
      ) : (
        /* History View */
        filteredHistory.length === 0 ? (
          <Card elevated className="!py-16">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#f5f5f7] rounded-full flex items-center justify-center">
                <History className="w-8 h-8 text-[#86868b]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1d1d1f] mb-1">
                ไม่มีประวัติ
              </h3>
              <p className="text-sm text-[#86868b]">
                ยังไม่มีคำขอที่ดำเนินการแล้ว
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((request) => {
              const config = typeConfig[request.type];
              const sConfig = statusConfig[request.status] || statusConfig.pending;
              const Icon = config.icon;

              return (
                <Card 
                  key={`${request.type}_${request.id}`} 
                  elevated 
                  className="!p-0 overflow-hidden"
                >
                  <div className="flex items-stretch">
                    <div className={`w-1.5 ${sConfig.bgColor}`} />
                    
                    <div className="flex-1 p-4">
                      <div className="flex items-start gap-3">
                        <Avatar name={request.employeeName} size="md" />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-[15px] font-semibold text-[#1d1d1f] truncate">
                              {request.employeeName}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.bgColor} ${config.color}`}>
                              <Icon className="w-3 h-3" />
                              {config.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${sConfig.bgColor} ${sConfig.color}`}>
                              {sConfig.label}
                            </span>
                          </div>
                          
                          <p className="text-[14px] font-medium text-[#1d1d1f]">
                            {request.title}
                          </p>
                          <p className="text-[13px] text-[#86868b]">
                            {request.subtitle}
                          </p>

                          {request.cancelReason && (
                            <p className="text-[12px] text-[#ff3b30] mt-1.5 bg-[#ff3b30]/10 rounded-lg px-2.5 py-1.5">
                              เหตุผลยกเลิก: {request.cancelReason}
                            </p>
                          )}

                          <p className="text-[11px] text-[#86868b] mt-2">
                            {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: th })}
                          </p>
                        </div>

                        {/* Cancel Button - Only for approved requests */}
                        {request.status === "approved" && (
                          <button
                            onClick={() => openCancelModal(request)}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-[13px] font-medium text-[#ff3b30] bg-[#ff3b30]/10 hover:bg-[#ff3b30]/20 transition-colors"
                            title="ยกเลิก"
                          >
                            <Ban className="w-4 h-4" />
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Quick Stats Footer - Pending Only */}
      {viewMode === "pending" && stats.total > 0 && (
        <div className="fixed bottom-20 left-0 right-0 md:bottom-6 md:left-auto md:right-6 px-4 md:px-0">
          <Card elevated className="!p-3 !rounded-2xl shadow-xl border border-[#e8e8ed] md:w-auto inline-flex items-center gap-4 mx-auto md:mx-0">
            <span className="text-sm text-[#86868b]">รอดำเนินการ</span>
            <span className="text-lg font-bold text-[#1d1d1f]">{stats.total}</span>
            <div className="flex items-center gap-1">
              {stats.ot > 0 && <span className="w-2 h-2 rounded-full bg-[#ff9500]" title={`OT: ${stats.ot}`} />}
              {stats.leave > 0 && <span className="w-2 h-2 rounded-full bg-[#0071e3]" title={`ลา: ${stats.leave}`} />}
              {stats.wfh > 0 && <span className="w-2 h-2 rounded-full bg-[#af52de]" title={`WFH: ${stats.wfh}`} />}
              {stats.late > 0 && <span className="w-2 h-2 rounded-full bg-[#ff3b30]" title={`มาสาย: ${stats.late}`} />}
            </div>
          </Card>
        </div>
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
                {selectedRequest.employeeName} - {typeConfig[selectedRequest.type].label}
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
              onClick={handleCancel}
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
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <ApprovalsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
