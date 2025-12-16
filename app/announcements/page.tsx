"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BottomNav } from "@/components/BottomNav";
import {
  Megaphone,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/components/ui/Toast";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import type { Announcement } from "@/types/announcement";

function AnnouncementsContent() {
  const { employee } = useAuth();
  const toast = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchAnnouncements = useCallback(async () => {
    if (!employee?.id) return;

    try {
      // Fetch announcements
      const { data: announcementsData, error: announcementsError } = await supabase
        .from("announcements")
        .select(`
          *,
          creator:created_by(name)
        `)
        .eq("published", true)
        .is("deleted_at", null)
        .lte("published_at", new Date().toISOString())
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false });

      if (announcementsError) throw announcementsError;

      // Fetch read status
      const { data: readsData, error: readsError } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("employee_id", employee.id);

      if (readsError) throw readsError;

      const readSet = new Set(readsData?.map((r: any) => r.announcement_id) || []);
      setReadIds(readSet);

      const announcementsWithMeta = (announcementsData || []).map((a: any) => ({
        ...a,
        creator_name: a.creator?.name || "Unknown",
        is_read: readSet.has(a.id),
      }));

      setAnnouncements(announcementsWithMeta);
    } catch (error: any) {
      console.error("Error fetching announcements:", error);
      toast.error("เกิดข้อผิดพลาด", error.message);
    } finally {
      setLoading(false);
    }
  }, [employee?.id, toast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const markAsRead = async (announcementId: string) => {
    if (!employee?.id || readIds.has(announcementId)) return;

    try {
      const { error } = await supabase
        .from("announcement_reads")
        .insert([{
          announcement_id: announcementId,
          employee_id: employee.id,
        }]);

      if (error && !error.message.includes("duplicate")) {
        throw error;
      }

      setReadIds((prev) => new Set(prev).add(announcementId));
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcementId ? { ...a, is_read: true } : a
        )
      );
    } catch (error: any) {
      console.error("Error marking as read:", error);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="danger">🚨 ด่วนมาก</Badge>;
      case "high":
        return <Badge variant="warning">⚠️ สำคัญ</Badge>;
      case "normal":
        return <Badge variant="info">📢 ปกติ</Badge>;
      case "low":
        return <Badge variant="default">💬 ทั่วไป</Badge>;
      default:
        return <Badge variant="default">{priority}</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      general: "ทั่วไป",
      hr: "ทรัพยากรบุคคล",
      payroll: "เงินเดือน",
      holiday: "วันหยุด",
      urgent: "ด่วน",
    };
    return labels[category] || category;
  };

  const filteredAnnouncements = announcements.filter((a) =>
    filter === "all" ? true : !a.is_read
  );

  const unreadCount = announcements.filter((a) => !a.is_read).length;

  return (
    <div className="min-h-screen bg-[#fbfbfd] pb-20">
      {/* Header */}
      <header className="bg-white border-b border-[#e8e8ed]">
        <div className="max-w-[600px] mx-auto px-6 pt-safe">
          <div className="py-6">
            <h1 className="text-[28px] font-bold text-[#1d1d1f]">ประกาศ</h1>
          </div>
        </div>
      </header>

      <main className="max-w-[680px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Filter & Unread Count */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 sm:flex-none min-h-[44px] px-5 py-3 rounded-xl text-[15px] font-medium transition-all ${
                filter === "all"
                  ? "bg-[#0071e3] text-white shadow-sm"
                  : "bg-white text-[#86868b] hover:text-[#1d1d1f] border border-[#e8e8ed]"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`flex-1 sm:flex-none min-h-[44px] px-5 py-3 rounded-xl text-[15px] font-medium transition-all relative ${
                filter === "unread"
                  ? "bg-[#0071e3] text-white shadow-sm"
                  : "bg-white text-[#86868b] hover:text-[#1d1d1f] border border-[#e8e8ed]"
              }`}
            >
              ยังไม่อ่าน
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 bg-[#ff3b30] text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Megaphone className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
              <p className="text-[#86868b]">
                {filter === "unread" ? "อ่านหมดแล้ว" : "ยังไม่มีประกาศ"}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => (
              <Card
                key={announcement.id}
                elevated
                className={`overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                  !announcement.is_read ? "border-l-4 border-l-[#0071e3]" : ""
                }`}
                onClick={() => markAsRead(announcement.id)}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        announcement.priority === "urgent"
                          ? "bg-[#ff3b30]/10"
                          : announcement.priority === "high"
                          ? "bg-[#ff9500]/10"
                          : "bg-[#0071e3]/10"
                      }`}
                    >
                      <Megaphone
                        className={`w-6 h-6 ${
                          announcement.priority === "urgent"
                            ? "text-[#ff3b30]"
                            : announcement.priority === "high"
                            ? "text-[#ff9500]"
                            : "text-[#0071e3]"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-[18px] sm:text-[19px] font-semibold text-[#1d1d1f] leading-snug">
                          {announcement.title}
                          {!announcement.is_read && (
                            <span className="ml-2 inline-block w-2 h-2 bg-[#0071e3] rounded-full" />
                          )}
                        </h3>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(announcement.priority)}
                        </div>
                      </div>
                      <p className="text-[16px] text-[#1d1d1f] whitespace-pre-wrap mb-4 leading-relaxed">
                        {announcement.message}
                      </p>

                      {/* Meta Info */}
                      <div className="flex flex-wrap gap-3 text-[13px] text-[#86868b]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(announcement.created_at), "dd MMM yyyy HH:mm", {
                            locale: th,
                          })}
                        </div>
                        {announcement.expires_at && (
                          <div className="flex items-center gap-1 text-[#ff9500]">
                            <AlertCircle className="w-3.5 h-3.5" />
                            หมดอายุ{" "}
                            {format(new Date(announcement.expires_at), "dd MMM yyyy", {
                              locale: th,
                            })}
                          </div>
                        )}
                        {announcement.is_read && (
                          <div className="flex items-center gap-1 text-[#34c759]">
                            <CheckCircle className="w-3.5 h-3.5" />
                            อ่านแล้ว
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function AnnouncementsPage() {
  return (
    <ProtectedRoute>
      <AnnouncementsContent />
    </ProtectedRoute>
  );
}

