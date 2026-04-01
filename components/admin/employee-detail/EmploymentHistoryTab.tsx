"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { supabase } from "@/lib/supabase/client";
import {
  Briefcase,
  LogOut,
  UserPlus,
  Ban,
  Clock,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface HistoryEntry {
  id: string;
  employee_id: string;
  action: string;
  effective_date: string;
  reason: string | null;
  performed_by: string | null;
  created_at: string;
  performer?: { name: string } | null;
}

interface EmploymentHistoryTabProps {
  employeeId: string;
}

interface EntryFormData {
  action: string;
  effective_date: string;
  reason: string;
}

const ACTION_OPTIONS = [
  { value: "hired", label: "เข้าทำงาน" },
  { value: "resigned", label: "ลาออก" },
  { value: "terminated", label: "เลิกจ้าง" },
  { value: "rehired", label: "รับกลับเข้าทำงาน" },
];

function getActionIcon(action: string) {
  switch (action) {
    case "hired":
      return <Briefcase className="w-5 h-5 text-[#34c759]" />;
    case "resigned":
      return <LogOut className="w-5 h-5 text-[#ff9500]" />;
    case "terminated":
      return <Ban className="w-5 h-5 text-[#ff3b30]" />;
    case "rehired":
      return <UserPlus className="w-5 h-5 text-[#0071e3]" />;
    default:
      return <Clock className="w-5 h-5 text-[#86868b]" />;
  }
}

function getActionLabel(action: string) {
  return ACTION_OPTIONS.find((o) => o.value === action)?.label || action;
}

function getActionBadgeVariant(
  action: string
): "success" | "warning" | "danger" | "info" | "default" {
  switch (action) {
    case "hired":
      return "success";
    case "resigned":
      return "warning";
    case "terminated":
      return "danger";
    case "rehired":
      return "info";
    default:
      return "default";
  }
}

function EntryForm({
  data,
  onChange,
}: {
  data: EntryFormData;
  onChange: (d: EntryFormData) => void;
}) {
  return (
    <div className="space-y-4">
      <Select
        label="ประเภท"
        value={data.action}
        onChange={(val) => onChange({ ...data, action: val })}
        options={ACTION_OPTIONS}
      />
      <div>
        <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
          วันที่มีผล
        </label>
        <input
          type="date"
          value={data.effective_date}
          onChange={(e) =>
            onChange({ ...data, effective_date: e.target.value })
          }
          className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all outline-none"
        />
      </div>
      <div>
        <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
          เหตุผล (ไม่บังคับ)
        </label>
        <textarea
          value={data.reason}
          onChange={(e) => onChange({ ...data, reason: e.target.value })}
          rows={2}
          placeholder="ระบุเหตุผล..."
          className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all outline-none resize-none"
        />
      </div>
    </div>
  );
}

export function EmploymentHistoryTab({
  employeeId,
}: EmploymentHistoryTabProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<EntryFormData>({
    action: "hired",
    effective_date: new Date().toISOString().split("T")[0],
    reason: "",
  });

  // Edit modal
  const [editEntry, setEditEntry] = useState<HistoryEntry | null>(null);
  const [editForm, setEditForm] = useState<EntryFormData>({
    action: "",
    effective_date: "",
    reason: "",
  });

  // Delete confirm
  const [deleteEntry, setDeleteEntry] = useState<HistoryEntry | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employment_history")
        .select(
          "*, performer:employees!employment_history_performed_by_fkey(name)"
        )
        .eq("employee_id", employeeId)
        .order("effective_date", { ascending: false });

      if (error) {
        const { data: fallbackData } = await supabase
          .from("employment_history")
          .select("*")
          .eq("employee_id", employeeId)
          .order("effective_date", { ascending: false });

        setHistory(fallbackData || []);
      } else {
        setHistory(data || []);
      }
    } catch (err) {
      console.error("Error fetching employment history:", err);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleAdd = async () => {
    if (!addForm.effective_date || !addForm.action) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("employment_history").insert({
        employee_id: employeeId,
        action: addForm.action,
        effective_date: addForm.effective_date,
        reason: addForm.reason || null,
      });
      if (error) throw error;
      setShowAddModal(false);
      setAddForm({
        action: "hired",
        effective_date: new Date().toISOString().split("T")[0],
        reason: "",
      });
      fetchHistory();
    } catch (err) {
      console.error("Error adding entry:", err);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (entry: HistoryEntry) => {
    setEditEntry(entry);
    setEditForm({
      action: entry.action,
      effective_date: entry.effective_date.slice(0, 10),
      reason: entry.reason || "",
    });
  };

  const handleEdit = async () => {
    if (!editEntry || !editForm.effective_date || !editForm.action) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("employment_history")
        .update({
          action: editForm.action,
          effective_date: editForm.effective_date,
          reason: editForm.reason || null,
        })
        .eq("id", editEntry.id);
      if (error) throw error;
      setEditEntry(null);
      fetchHistory();
    } catch (err) {
      console.error("Error updating entry:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("employment_history")
        .delete()
        .eq("id", deleteEntry.id);
      if (error) throw error;
      setDeleteEntry(null);
      fetchHistory();
    } catch (err) {
      console.error("Error deleting entry:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card elevated padding="none">
        <div className="p-6 border-b border-[#e8e8ed] flex items-center justify-between">
          <div>
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              ประวัติการเข้า-ออกงาน
            </h3>
            <p className="text-[13px] text-[#86868b] mt-1">
              บันทึกเหตุการณ์การเข้าทำงาน ลาออก และรับกลับเข้าทำงาน
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4" />
            เพิ่มรายการ
          </Button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
            <p className="text-[15px] text-[#86868b]">
              ยังไม่มีประวัติการเข้า-ออกงาน
            </p>
          </div>
        ) : (
          <div className="p-6">
            <div className="relative">
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-[#e8e8ed]" />

              <div className="space-y-6">
                {history.map((entry) => (
                  <div key={entry.id} className="relative flex gap-4">
                    <div className="relative z-10 flex-shrink-0 w-10 h-10 bg-white rounded-full border-2 border-[#e8e8ed] flex items-center justify-center">
                      {getActionIcon(entry.action)}
                    </div>

                    <div className="flex-1 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={getActionBadgeVariant(entry.action)}
                            >
                              {getActionLabel(entry.action)}
                            </Badge>
                            <span className="text-[13px] text-[#86868b]">
                              {format(
                                new Date(entry.effective_date),
                                "d MMMM yyyy",
                                { locale: th }
                              )}
                            </span>
                          </div>

                          {entry.reason && (
                            <p className="text-[14px] text-[#1d1d1f] mt-2">
                              เหตุผล: {entry.reason}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-2 text-[12px] text-[#86868b]">
                            <Clock className="w-3 h-3" />
                            <span>
                              บันทึกเมื่อ{" "}
                              {format(
                                new Date(entry.created_at),
                                "d MMM yyyy HH:mm",
                                { locale: th }
                              )}
                            </span>
                            {entry.performer && (
                              <span>โดย {entry.performer.name}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEdit(entry)}
                            className="p-1.5 rounded-lg text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#0071e3] transition-colors"
                            title="แก้ไข"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteEntry(entry)}
                            className="p-1.5 rounded-lg text-[#86868b] hover:bg-[#ff3b30]/10 hover:text-[#ff3b30] transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="เพิ่มประวัติการเข้า-ออกงาน"
        size="md"
      >
        <div className="space-y-5">
          <EntryForm data={addForm} onChange={setAddForm} />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowAddModal(false)}
              fullWidth
              disabled={saving}
            >
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              onClick={handleAdd}
              fullWidth
              loading={saving}
              disabled={!addForm.effective_date || !addForm.action}
            >
              <Plus className="w-4 h-4" />
              เพิ่ม
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editEntry}
        onClose={() => setEditEntry(null)}
        title="แก้ไขประวัติ"
        size="md"
      >
        <div className="space-y-5">
          <EntryForm data={editForm} onChange={setEditForm} />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setEditEntry(null)}
              fullWidth
              disabled={saving}
            >
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              onClick={handleEdit}
              fullWidth
              loading={saving}
              disabled={!editForm.effective_date || !editForm.action}
            >
              <Pencil className="w-4 h-4" />
              บันทึก
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteEntry}
        onClose={() => setDeleteEntry(null)}
        onConfirm={handleDelete}
        title="ลบประวัติ"
        message={
          deleteEntry
            ? `ต้องการลบรายการ "${getActionLabel(deleteEntry.action)}" วันที่ ${format(new Date(deleteEntry.effective_date), "d MMMM yyyy", { locale: th })} หรือไม่?`
            : ""
        }
        type="danger"
        confirmText="ลบ"
        loading={saving}
      />
    </>
  );
}
