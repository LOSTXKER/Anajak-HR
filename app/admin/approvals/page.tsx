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
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

// Types
type RequestType = "ot" | "leave" | "wfh" | "late";

interface PendingRequest {
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
  rawData: any;
}

// Config - Apple Theme Colors
const typeConfig: Record<RequestType, { label: string; icon: any; color: string; bgColor: string }> = {
  ot: { label: "OT", icon: Clock, color: "text-[#ff9500]", bgColor: "bg-[#ff9500]/10" },
  leave: { label: "ลา", icon: Calendar, color: "text-[#0071e3]", bgColor: "bg-[#0071e3]/10" },
  wfh: { label: "WFH", icon: Home, color: "text-[#af52de]", bgColor: "bg-[#af52de]/10" },
  late: { label: "มาสาย", icon: AlertTriangle, color: "text-[#ff3b30]", bgColor: "bg-[#ff3b30]/10" },
};

function ApprovalsContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") as RequestType | null;
  
  // State
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<RequestType | "all">(typeParam || "all");
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Update activeType when URL changes
  useEffect(() => {
    if (typeParam && ["ot", "leave", "wfh", "late"].includes(typeParam)) {
      setActiveType(typeParam);
    }
  }, [typeParam]);

  // Stats
  const stats = useMemo(() => {
    const counts = { ot: 0, leave: 0, wfh: 0, late: 0 };
    requests.forEach(r => counts[r.type]++);
    return { ...counts, total: requests.length };
  }, [requests]);

  // Fetch all pending requests
  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const [otRes, leaveRes, wfhRes, lateRes] = await Promise.all([
        // OT requests
        supabase
          .from("ot_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        
        // Leave requests
        supabase
          .from("leave_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        
        // WFH requests
        supabase
          .from("wfh_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        
        // Late requests
        supabase
          .from("late_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]);

      const allRequests: PendingRequest[] = [];

      // Process OT (skip if employee not found - admin or deleted)
      (otRes.data || []).forEach((r: any) => {
        if (!r.employee?.id) return;
        allRequests.push({
          id: r.id,
          type: "ot",
          employeeId: r.employee.id,
          employeeName: r.employee.name,
          employeeEmail: r.employee.email || "",
          date: r.request_date,
          title: `OT ${format(new Date(r.requested_start_time), "HH:mm")} - ${format(new Date(r.requested_end_time), "HH:mm")}`,
          subtitle: format(new Date(r.request_date), "d MMM yyyy", { locale: th }),
          reason: r.reason,
          createdAt: r.created_at,
          rawData: r,
        });
      });

      // Process Leave (skip if employee not found - admin or deleted)
      (leaveRes.data || []).forEach((r: any) => {
        if (!r.employee?.id) return;
        const leaveTypeLabels: Record<string, string> = {
          sick: "ลาป่วย", personal: "ลากิจ", annual: "ลาพักร้อน",
          maternity: "ลาคลอด", military: "ลากรณีทหาร", other: "อื่นๆ"
        };
        allRequests.push({
          id: r.id,
          type: "leave",
          employeeId: r.employee.id,
          employeeName: r.employee.name,
          employeeEmail: r.employee.email || "",
          date: r.start_date,
          title: leaveTypeLabels[r.leave_type] || r.leave_type,
          subtitle: r.is_half_day 
            ? `${format(new Date(r.start_date), "d MMM", { locale: th })} (ครึ่งวัน)`
            : `${format(new Date(r.start_date), "d MMM", { locale: th })} - ${format(new Date(r.end_date), "d MMM", { locale: th })}`,
          reason: r.reason,
          createdAt: r.created_at,
          rawData: r,
        });
      });

      // Process WFH (skip if employee not found - admin or deleted)
      (wfhRes.data || []).forEach((r: any) => {
        if (!r.employee?.id) return;
        allRequests.push({
          id: r.id,
          type: "wfh",
          employeeId: r.employee.id,
          employeeName: r.employee.name,
          employeeEmail: r.employee.email || "",
          date: r.date,
          title: r.is_half_day ? "WFH ครึ่งวัน" : "WFH เต็มวัน",
          subtitle: format(new Date(r.date), "EEEE d MMM yyyy", { locale: th }),
          reason: r.reason,
          createdAt: r.created_at,
          rawData: r,
        });
      });

      // Process Late (skip if employee not found - admin or deleted)
      (lateRes.data || []).forEach((r: any) => {
        if (!r.employee?.id) return;
        allRequests.push({
          id: r.id,
          type: "late",
          employeeId: r.employee.id,
          employeeName: r.employee.name,
          employeeEmail: r.employee.email || "",
          date: r.request_date,
          title: r.actual_late_minutes ? `สาย ${r.actual_late_minutes} นาที` : "ขออนุมัติมาสาย",
          subtitle: format(new Date(r.request_date), "d MMM yyyy", { locale: th }),
          reason: r.reason,
          createdAt: r.created_at,
          rawData: r,
        });
      });

      // Sort by createdAt
      allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setRequests(allRequests);
    } catch (error) {
      console.error("Error fetching pending:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // Handle approve/reject
  const handleAction = async (request: PendingRequest, approved: boolean) => {
    if (!currentAdmin) return;
    
    const key = `${request.type}_${request.id}`;
    setProcessingIds(prev => new Set(prev).add(key));

    try {
      const tableMap: Record<RequestType, string> = {
        ot: "ot_requests",
        leave: "leave_requests",
        wfh: "wfh_requests",
        late: "late_requests",
      };

      const updateData: any = {
        status: approved ? "approved" : "rejected",
        approved_by: currentAdmin.id,
        approved_at: new Date().toISOString(),
      };

      // For OT, also set approved times
      if (request.type === "ot" && approved) {
        updateData.approved_start_time = request.rawData.requested_start_time;
        updateData.approved_end_time = request.rawData.requested_end_time;
      }

      const { error } = await supabase
        .from(tableMap[request.type])
        .update(updateData)
        .eq("id", request.id);

      if (error) throw error;

      // Send notification
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: `${request.type}_approval`,
            data: {
              employeeName: request.employeeName,
              approved,
              date: request.date,
            },
          }),
        });
      } catch (e) {
        console.error("Notification error:", e);
      }

      toast.success(
        approved ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว",
        `${typeConfig[request.type].label} ของ ${request.employeeName}`
      );

      // Remove from list
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

  // Filtered requests
  const filteredRequests = activeType === "all" 
    ? requests 
    : requests.filter(r => r.type === activeType);

  return (
    <AdminLayout title="อนุมัติคำขอ">
      {/* Stats Bar */}
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
          {stats.total > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeType === "all" ? "bg-white/20" : "bg-[#ff3b30] text-white"
            }`}>
              {stats.total}
            </span>
          )}
        </button>

        {(Object.keys(typeConfig) as RequestType[]).map((type) => {
          const config = typeConfig[type];
          const count = stats[type];
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
              {count > 0 && (
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

        <Button 
          variant="text" 
          size="sm" 
          onClick={fetchPending} 
          disabled={loading}
          className="!px-3"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredRequests.length === 0 ? (
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
                  {/* Left Color Bar */}
                  <div className={`w-1.5 ${config.bgColor}`} />
                  
                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <Avatar name={request.employeeName} size="md" />
                      
                      {/* Info */}
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

                      {/* Action Buttons */}
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
      )}

      {/* Quick Stats Footer */}
      {stats.total > 0 && (
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
