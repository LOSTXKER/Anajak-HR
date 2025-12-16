"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BottomNav } from "@/components/BottomNav";
import {
  Clock,
  Calendar,
  Plus,
  Play,
  Square,
  ChevronRight,
  Timer,
  CheckCircle2,
  XCircle,
  Trash2,
  Camera,
  X,
} from "lucide-react";
import { format, differenceInMinutes, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { th } from "date-fns/locale";

interface OTRequest {
  id: string;
  request_date: string;
  requested_start_time: string;
  requested_end_time: string;
  status: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  actual_ot_hours: number | null;
  ot_amount: number | null;
  reason: string;
  ot_type: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
}

function OTPageContent() {
  const { employee } = useAuth();
  const [activeOT, setActiveOT] = useState<OTRequest | null>(null);
  const [pendingApproval, setPendingApproval] = useState<OTRequest[]>([]);
  const [approvedOT, setApprovedOT] = useState<OTRequest[]>([]);
  const [completedOT, setCompletedOT] = useState<OTRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [canceling, setCanceling] = useState<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; type: string } | null>(null);

  useEffect(() => {
    if (employee) {
      fetchOTData();
    }
  }, [employee]);

  // Update elapsed time for active OT
  useEffect(() => {
    if (activeOT?.actual_start_time) {
      const updateTime = () => {
        const totalSeconds = Math.floor((new Date().getTime() - new Date(activeOT.actual_start_time!).getTime()) / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        setElapsedTime(
          `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        );
      };
      updateTime();
      const timer = setInterval(updateTime, 1000);
      return () => clearInterval(timer);
    }
  }, [activeOT]);

  const fetchOTData = async () => {
    if (!employee) return;
    setLoading(true);

    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const lastMonth = format(subMonths(new Date(), 1), "yyyy-MM-dd");

      // Fetch all OT requests
      const { data } = await supabase
        .from("ot_requests")
        .select("*")
        .eq("employee_id", employee.id)
        .gte("request_date", lastMonth)
        .order("request_date", { ascending: false });

      if (data) {
        // Find active OT (started but not ended)
        const active = data.find((ot: any) => ot.actual_start_time && !ot.actual_end_time);
        setActiveOT(active || null);

        // Pending approval
        setPendingApproval(data.filter((ot: any) => ot.status === "pending"));

        // Approved but not started
        setApprovedOT(data.filter((ot: any) => ot.status === "approved" && !ot.actual_start_time));

        // Completed
        setCompletedOT(data.filter((ot: any) => ot.status === "completed" || (ot.actual_end_time)));
      }
    } catch (error) {
      console.error("Error fetching OT data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOT = async (id: string) => {
    if (!confirm("ต้องการยกเลิกคำขอ OT นี้ใช่หรือไม่?")) return;
    if (!employee) return;

    setCanceling(id);
    try {
      const { error } = await supabase
        .from("ot_requests")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("employee_id", employee.id)
        .eq("status", "pending");

      if (error) throw error;
      fetchOTData();
    } catch (error: any) {
      console.error("Error canceling OT:", error);
      alert(error?.message || "ไม่สามารถยกเลิกคำขอได้");
    } finally {
      setCanceling(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">รออนุมัติ</Badge>;
      case "approved":
        return <Badge variant="success">อนุมัติแล้ว</Badge>;
      case "rejected":
        return <Badge variant="danger">ปฏิเสธ</Badge>;
      case "completed":
        return <Badge variant="info">เสร็จสิ้น</Badge>;
      case "cancelled":
        return <Badge variant="default">ยกเลิก</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Calculate total OT hours this month
  const thisMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const thisMonthOT = completedOT.filter((ot: any) => ot.request_date >= thisMonthStart);
  const totalHours = thisMonthOT.reduce((sum: number, ot: any) => sum + (ot.actual_ot_hours || 0), 0);
  const totalAmount = thisMonthOT.reduce((sum: number, ot: any) => sum + (ot.ot_amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#fbfbfd] pb-20 pt-safe">
      <main className="max-w-[600px] mx-auto px-4 pt-6 pb-4">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[32px] font-bold text-[#1d1d1f]">ระบบ OT</h1>
          <Link href="/ot/request">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              ขอ OT
            </Button>
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Active OT */}
            {activeOT && (
              <Card elevated className="mb-6 border-2 border-[#ff9500] bg-gradient-to-br from-[#ff9500]/10 to-transparent">
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="w-3 h-3 bg-[#ff9500] rounded-full animate-pulse" />
                    <p className="text-[15px] font-medium text-[#ff9500]">กำลังทำ OT</p>
                  </div>
                  <p className="text-[48px] font-bold text-[#ff9500] font-mono mb-2">
                    {elapsedTime}
                  </p>
                  <p className="text-[14px] text-[#6e6e73] mb-4">
                    เริ่ม: {format(new Date(activeOT.actual_start_time!), "HH:mm")} น.
                  </p>
                  <Link href={`/ot/end/${activeOT.id}`}>
                    <Button variant="danger" size="lg">
                      <Square className="w-5 h-5" />
                      จบ OT
                    </Button>
                  </Link>
                </div>
              </Card>
            )}

            {/* Summary Card */}
            <Card elevated className="mb-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="py-2">
                  <p className="text-[28px] font-bold text-[#0071e3]">{totalHours.toFixed(1)}</p>
                  <p className="text-[13px] text-[#86868b]">ชั่วโมง OT เดือนนี้</p>
                </div>
                <div className="py-2">
                  <p className="text-[28px] font-bold text-[#34c759]">฿{totalAmount.toFixed(0)}</p>
                  <p className="text-[13px] text-[#86868b]">รายได้ OT เดือนนี้</p>
                </div>
              </div>
            </Card>

            {/* Request OT Button */}
            <Link href="/ot/request">
              <Card elevated className="mb-6 hover:scale-[1.01] transition-transform cursor-pointer">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#ff9500] rounded-xl flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[17px] font-medium text-[#1d1d1f]">ขอ OT ใหม่</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#86868b]" />
                </div>
              </Card>
            </Link>

            {/* OT Ready to Start */}
            {approvedOT.length > 0 && (
              <div className="mb-6">
                <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#34c759]" />
                  OT ที่อนุมัติแล้ว ({approvedOT.length})
                </h2>
                <div className="space-y-3">
                  {approvedOT.map((ot) => {
                    const today = format(new Date(), "yyyy-MM-dd");
                    const isToday = ot.request_date === today;
                    const isPast = ot.request_date < today;
                    const canStart = isToday || isPast;

                    return (
                      <Card key={ot.id} elevated className={`border-l-4 ${canStart ? "border-l-[#34c759]" : "border-l-[#86868b]"}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-4 h-4 text-[#86868b]" />
                              <span className={`text-[15px] font-medium ${canStart ? "text-[#1d1d1f]" : "text-[#86868b]"}`}>
                                {format(new Date(ot.request_date), "d MMMM yyyy", { locale: th })}
                              </span>
                              {ot.ot_type === "holiday" && (
                                <Badge variant="danger">วันหยุด</Badge>
                              )}
                              {ot.ot_type === "weekend" && (
                                <Badge variant="warning">สุดสัปดาห์</Badge>
                              )}
                              {!canStart && (
                                <Badge variant="default">ยังไม่ถึงวัน</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
                              <Clock className="w-4 h-4" />
                              {format(new Date(ot.requested_start_time), "HH:mm")} - {format(new Date(ot.requested_end_time), "HH:mm")} น.
                            </div>
                          </div>
                          {canStart ? (
                            <Link href={`/ot/start/${ot.id}`}>
                              <Button size="sm" className="bg-[#34c759] hover:bg-[#30b350]">
                                <Play className="w-4 h-4" />
                                เริ่ม
                              </Button>
                            </Link>
                          ) : (
                            <Button size="sm" disabled className="bg-[#86868b]/50 cursor-not-allowed">
                              <Play className="w-4 h-4" />
                              รอวัน
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pending Approval */}
            {pendingApproval.length > 0 && (
              <div className="mb-6">
                <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
                  <Timer className="w-4 h-4 text-[#ff9500]" />
                  รออนุมัติ ({pendingApproval.length})
                </h2>
                <div className="space-y-3">
                  {pendingApproval.map((ot) => (
                    <Card key={ot.id} elevated className="border-l-4 border-l-[#ff9500]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-[#86868b]" />
                            <span className="text-[15px] font-medium text-[#1d1d1f]">
                              {format(new Date(ot.request_date), "d MMMM yyyy", { locale: th })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
                            <Clock className="w-4 h-4" />
                            {format(new Date(ot.requested_start_time), "HH:mm")} - {format(new Date(ot.requested_end_time), "HH:mm")} น.
                          </div>
                          <p className="text-[13px] text-[#86868b] mt-1">{ot.reason}</p>
                        </div>
                        <button
                          onClick={() => handleCancelOT(ot.id)}
                          disabled={canceling === ot.id}
                          className="flex items-center gap-1 px-3 py-2 text-[13px] text-[#ff3b30] bg-[#ff3b30]/10 rounded-lg hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50"
                        >
                          {canceling === ot.id ? (
                            <div className="w-4 h-4 border-2 border-[#ff3b30] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          ยกเลิก
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Completed OT */}
            {completedOT.length > 0 && (
              <div>
                <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0071e3]" />
                  ประวัติ OT
                </h2>
                <div className="space-y-3">
                  {completedOT.slice(0, 10).map((ot) => (
                    <Card key={ot.id} elevated>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[15px] font-medium text-[#1d1d1f]">
                              {format(new Date(ot.request_date), "d MMM", { locale: th })}
                            </span>
                            {ot.ot_type === "holiday" && (
                              <Badge variant="danger">วันหยุด</Badge>
                            )}
                            {ot.ot_type === "weekend" && (
                              <Badge variant="warning">สุดสัปดาห์</Badge>
                            )}
                          </div>
                          {ot.actual_start_time && ot.actual_end_time && (
                            <p className="text-[13px] text-[#6e6e73]">
                              {format(new Date(ot.actual_start_time), "HH:mm")} - {format(new Date(ot.actual_end_time), "HH:mm")} น.
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {ot.actual_ot_hours && (
                            <p className="text-[17px] font-semibold text-[#0071e3]">
                              {ot.actual_ot_hours} ชม.
                            </p>
                          )}
                          {ot.ot_amount && (
                            <p className="text-[13px] text-[#34c759]">
                              ฿{ot.ot_amount.toFixed(0)}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Photos */}
                      {(ot.before_photo_url || ot.after_photo_url) && (
                        <div className="mt-3 pt-3 border-t border-[#e8e8ed] flex gap-2">
                          {ot.before_photo_url && (
                            <button
                              onClick={() => setViewingPhoto({ url: ot.before_photo_url!, type: "ก่อน OT" })}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#ff9500] bg-[#ff9500]/10 rounded-lg hover:bg-[#ff9500]/20 transition-colors"
                            >
                              <Camera className="w-3 h-3" />
                              ก่อน
                            </button>
                          )}
                          {ot.after_photo_url && (
                            <button
                              onClick={() => setViewingPhoto({ url: ot.after_photo_url!, type: "หลัง OT" })}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-[#34c759] bg-[#34c759]/10 rounded-lg hover:bg-[#34c759]/20 transition-colors"
                            >
                              <Camera className="w-3 h-3" />
                              หลัง
                            </button>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!activeOT && approvedOT.length === 0 && pendingApproval.length === 0 && completedOT.length === 0 && (
              <Card elevated>
                <div className="text-center py-12">
                  <Timer className="w-16 h-16 text-[#86868b] mx-auto mb-4" />
                  <p className="text-[17px] font-medium text-[#1d1d1f] mb-2">ยังไม่มีข้อมูล OT</p>
                  <p className="text-[15px] text-[#86868b] mb-6">เริ่มต้นขอ OT เพื่อบันทึกการทำงานล่วงเวลา</p>
                  <Link href="/ot/request">
                    <Button>
                      <Plus className="w-4 h-4" />
                      ขอ OT ใหม่
                    </Button>
                  </Link>
                </div>
              </Card>
            )}
          </>
        )}
      </main>

      {/* Photo Modal */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <div className="relative max-w-full max-h-[90vh]">
            <button
              className="absolute -top-12 right-0 p-2 bg-white rounded-full shadow-lg"
              onClick={() => setViewingPhoto(null)}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-white rounded-2xl overflow-hidden">
              <div className="px-4 py-2 bg-[#f5f5f7] border-b border-[#e8e8ed]">
                <p className="text-[14px] font-medium text-[#1d1d1f]">
                  รูปภาพ{viewingPhoto.type}
                </p>
              </div>
              <img
                src={viewingPhoto.url}
                alt={viewingPhoto.type}
                className="max-w-[90vw] max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default function OTPage() {
  return (
    <ProtectedRoute>
      <OTPageContent />
    </ProtectedRoute>
  );
}

