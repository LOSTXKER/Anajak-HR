"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Modal";
import {
  Plus,
  Megaphone,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Calendar,
  Users,
  AlertCircle,
  Bell,
  BellOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/utils/auth-fetch";
import { useToast } from "@/components/ui/Toast";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import type { Announcement } from "@/types/announcement";

function AnnouncementsContent() {
  const router = useRouter();
  const toast = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const fetchAnnouncements = useCallback(async () => {
    try {
      let query = supabase
        .from("announcements")
        .select(`
          *,
          creator:created_by(name)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filter === "published") {
        query = query.eq("published", true);
      } else if (filter === "draft") {
        query = query.eq("published", false);
      }

      const { data, error } = await query;

      if (error) throw error;

      const announcementsWithCreator = (data || []).map((a: any) => ({
        ...a,
        creator_name: a.creator?.name || "Unknown",
      }));

      setAnnouncements(announcementsWithCreator);
    } catch (error: any) {
      console.error("Error fetching announcements:", error);
      toast.error("เกิดข้อผิดพลาด", error.message);
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase
        .from("announcements")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast.success("ลบสำเร็จ", "ลบประกาศเรียบร้อยแล้ว");
      setDeleteTarget(null);
      fetchAnnouncements();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePublish = async (announcement: Announcement) => {
    try {
      const newPublished = !announcement.published;
      const { error } = await supabase
        .from("announcements")
        .update({
          published: newPublished,
          published_at: newPublished ? new Date().toISOString() : null,
        })
        .eq("id", announcement.id);

      if (error) throw error;

      if (newPublished && announcement.send_notification && !announcement.notification_sent_at) {
        try {
          await authFetch("/api/push/send-announcement", {
            method: "POST",
            body: JSON.stringify({
              title: announcement.title,
              message: announcement.message,
              target_type: announcement.target_type,
              target_branch_id: announcement.target_branch_id,
              announcement_id: announcement.id,
            }),
          });

          await authFetch("/api/notifications", {
            method: "POST",
            body: JSON.stringify({
              type: "announcement",
              data: {
                title: announcement.title,
                content: announcement.message,
                isPinned: false,
              },
            }),
          });

          await supabase
            .from("announcements")
            .update({ notification_sent_at: new Date().toISOString() })
            .eq("id", announcement.id);
        } catch (notifError) {
          console.error("Error sending notifications:", notifError);
        }
      }

      toast.success(
        newPublished ? "เผยแพร่แล้ว" : "ยกเลิกการเผยแพร่",
        newPublished ? "ประกาศถูกเผยแพร่แล้ว" : "ประกาศถูกซ่อนแล้ว"
      );
      fetchAnnouncements();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error.message);
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

  const getTargetLabel = (announcement: Announcement) => {
    switch (announcement.target_type) {
      case "all":
        return "ทุกคน";
      case "branch":
        return `สาขาเฉพาะ`;
      case "employee":
        return `${announcement.target_employee_ids?.length || 0} คน`;
      default:
        return announcement.target_type;
    }
  };

  const filteredAnnouncements = announcements;

  if (loading) {
    return (
      <AdminLayout title="จัดการประกาศ">
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="จัดการประกาศ">
      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        {/* Filters */}
        <div className="flex gap-2">
          {[
            { id: "all", label: "ทั้งหมด" },
            { id: "published", label: "เผยแพร่แล้ว" },
            { id: "draft", label: "แบบร่าง" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                filter === tab.id
                  ? "bg-[#0071e3] text-white"
                  : "bg-white text-[#86868b] hover:text-[#1d1d1f]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Create Button */}
        <Button onClick={() => router.push("/admin/announcements/create")}>
          <Plus className="w-5 h-5" />
          สร้างประกาศ
        </Button>
      </div>

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Megaphone className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
            <p className="text-[#86868b]">ยังไม่มีประกาศ</p>
          </div>
        </Card>
      ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => (
              <Card key={announcement.id} elevated className="overflow-hidden">
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        announcement.priority === "urgent"
                          ? "bg-[#ff3b30]/10"
                          : announcement.priority === "high"
                          ? "bg-[#ff9500]/10"
                          : "bg-[#0071e3]/10"
                      }`}
                    >
                      <Megaphone
                        className={`w-5 h-5 ${
                          announcement.priority === "urgent"
                            ? "text-[#ff3b30]"
                            : announcement.priority === "high"
                            ? "text-[#ff9500]"
                            : "text-[#0071e3]"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                          {announcement.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(announcement.priority)}
                        </div>
                      </div>
                      <p className="text-[13px] text-[#86868b] line-clamp-2 mb-2">
                        {announcement.message}
                      </p>

                      {/* Meta Info */}
                      <div className="flex flex-wrap gap-3 text-[12px] text-[#86868b]">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {getTargetLabel(announcement)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(announcement.created_at), "dd MMM yyyy", {
                            locale: th,
                          })}
                        </div>
                        {announcement.expires_at && (
                          <div className="flex items-center gap-1 text-[#ff9500]">
                            <AlertCircle className="w-3.5 h-3.5" />
                            หมดอายุ{" "}
                            {format(new Date(announcement.expires_at), "dd MMM", {
                              locale: th,
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#e8e8ed]">
                    <div className="flex items-center gap-2">
                      <Badge variant={announcement.published ? "success" : "default"}>
                        {announcement.published ? (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            เผยแพร่แล้ว
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            แบบร่าง
                          </>
                        )}
                      </Badge>
                      <Badge variant={announcement.send_notification ? "info" : "default"}>
                        {announcement.send_notification ? (
                          <>
                            <Bell className="w-3 h-3 mr-1" />
                            แจ้งเตือน
                          </>
                        ) : (
                          <>
                            <BellOff className="w-3 h-3 mr-1" />
                            ไม่แจ้งเตือน
                          </>
                        )}
                      </Badge>
                      <span className="text-[11px] text-[#86868b]">
                        โดย {announcement.creator_name}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleTogglePublish(announcement)}
                      >
                        {announcement.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => router.push(`/admin/announcements/edit/${announcement.id}`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setDeleteTarget(announcement.id)}
                        loading={deleting === announcement.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="ลบประกาศ"
        message="ต้องการลบประกาศนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
        type="danger"
        confirmText="ลบ"
        cancelText="ยกเลิก"
        loading={!!deleting}
      />
    </AdminLayout>
  );
}

export default function AnnouncementsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <AnnouncementsContent />
    </ProtectedRoute>
  );
}

