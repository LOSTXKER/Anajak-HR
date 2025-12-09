"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { Calendar, Plus, Edit2, Trash2, PartyPopper } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: string;
  is_active: boolean;
  branch_id: string | null;
  created_at: string;
}

const holidayTypes = [
  { value: "public", label: "วันหยุดราชการ", color: "text-[#ff3b30] bg-[#ff3b30]/10" },
  { value: "company", label: "วันหยุดบริษัท", color: "text-[#0071e3] bg-[#0071e3]/10" },
  { value: "branch", label: "วันหยุดเฉพาะสาขา", color: "text-[#ff9500] bg-[#ff9500]/10" },
];

function HolidaysContent() {
  const toast = useToast();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    name: "",
    type: "public",
    branch_id: "",
    is_active: true,
  });

  useEffect(() => {
    fetchHolidays();
    fetchBranches();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลวันหยุดได้");
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data } = await supabase.from("branches").select("id, name").order("name");
      setBranches(data || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        date: formData.date,
        name: formData.name,
        type: formData.type,
        branch_id: formData.type === "branch" && formData.branch_id ? formData.branch_id : null,
        is_active: formData.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from("holidays").update(data).eq("id", editingId);
        if (error) throw error;
        toast.success("อัพเดตสำเร็จ", "แก้ไขวันหยุดเรียบร้อยแล้ว");
      } else {
        const { error } = await supabase.from("holidays").insert(data);
        if (error) throw error;
        toast.success("เพิ่มสำเร็จ", "เพิ่มวันหยุดใหม่เรียบร้อยแล้ว");
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchHolidays();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (holiday: Holiday) => {
    setFormData({
      date: holiday.date,
      name: holiday.name,
      type: holiday.type,
      branch_id: holiday.branch_id || "",
      is_active: holiday.is_active,
    });
    setEditingId(holiday.id);
    setShowForm(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("holidays").delete().eq("id", deleteConfirm.id);
      if (error) throw error;

      toast.success("ลบสำเร็จ", "ลบวันหยุดเรียบร้อยแล้ว");
      setDeleteConfirm({ open: false, id: "", name: "" });
      fetchHolidays();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถลบวันหยุดได้");
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      date: "",
      name: "",
      type: "public",
      branch_id: "",
      is_active: true,
    });
  };

  const getTypeInfo = (type: string) => {
    return holidayTypes.find((t) => t.value === type) || holidayTypes[0];
  };

  // Group holidays by year
  const groupedHolidays = holidays.reduce((acc: any, holiday) => {
    const year = new Date(holiday.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(holiday);
    return acc;
  }, {});

  const currentYear = new Date().getFullYear();
  const years = Object.keys(groupedHolidays).sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <AdminLayout
      title="จัดการวันหยุด"
      description="ตั้งค่าวันหยุดราชการและวันหยุดบริษัท"
    >
      {/* Add Button */}
      <div className="flex justify-end mb-6">
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="w-5 h-5" />
          เพิ่มวันหยุด
        </Button>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingId ? "แก้ไขวันหยุด" : "เพิ่มวันหยุดใหม่"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="ชื่อวันหยุด"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="วันปีใหม่"
            required
          />

          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
              วันที่
            </label>
            <DateInput
              value={formData.date}
              onChange={(val) => setFormData({ ...formData, date: val })}
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
              ประเภท
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
            >
              {holidayTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {formData.type === "branch" && (
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                สาขา
              </label>
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                required
              >
                <option value="">เลือกสาขา</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 bg-[#f5f5f7] rounded-xl">
            <span className="text-[15px] font-medium text-[#1d1d1f]">เปิดใช้งาน</span>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={`
                relative w-12 h-7 rounded-full transition-colors
                ${formData.is_active ? "bg-[#34c759]" : "bg-[#d2d2d7]"}
              `}
            >
              <span
                className={`
                  absolute top-1 w-5 h-5 bg-white rounded-full transition-transform
                  ${formData.is_active ? "right-1" : "left-1"}
                `}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={resetForm} fullWidth>
              ยกเลิก
            </Button>
            <Button type="submit" fullWidth loading={saving}>
              {editingId ? "บันทึก" : "เพิ่ม"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: "", name: "" })}
        onConfirm={handleDelete}
        title="ยืนยันการลบ"
        message={`คุณต้องการลบวันหยุด "${deleteConfirm.name}" ใช่หรือไม่?`}
        type="danger"
        confirmText="ลบ"
        loading={deleting}
      />

      {/* Holidays List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : holidays.length === 0 ? (
        <Card elevated>
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="w-8 h-8 text-[#86868b]" />
            </div>
            <p className="text-[17px] text-[#86868b]">ยังไม่มีวันหยุด</p>
            <p className="text-[14px] text-[#86868b] mt-1">
              กดปุ่ม "เพิ่มวันหยุด" เพื่อเริ่มต้น
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {years.map((year) => (
            <div key={year}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-[21px] font-semibold text-[#1d1d1f]">ปี {year}</h3>
                <Badge variant="info">{groupedHolidays[year].length} วัน</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedHolidays[year].map((holiday: Holiday) => {
                  const typeInfo = getTypeInfo(holiday.type);
                  const isPast = new Date(holiday.date) < new Date();

                  return (
                    <Card key={holiday.id} elevated>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-14 h-14 bg-[#ff3b30]/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                            <span className="text-[20px] font-semibold text-[#ff3b30]">
                              {format(new Date(holiday.date), "d")}
                            </span>
                            <span className="text-[10px] text-[#86868b] uppercase">
                              {format(new Date(holiday.date), "MMM", { locale: th })}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">
                              {holiday.name}
                            </h4>
                            <p className="text-[14px] text-[#86868b] mb-2">
                              {format(new Date(holiday.date), "EEEE d MMMM yyyy", {
                                locale: th,
                              })}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`
                                  inline-flex items-center gap-1 px-3 py-1 rounded-full text-[13px] font-medium
                                  ${typeInfo.color}
                                `}
                              >
                                {typeInfo.label}
                              </span>
                              {!holiday.is_active && (
                                <Badge variant="danger">ปิดใช้งาน</Badge>
                              )}
                              {isPast && <Badge>ผ่านไปแล้ว</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(holiday)}
                            className="p-2 text-[#86868b] hover:text-[#0071e3] hover:bg-[#f5f5f7] rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({ open: true, id: holiday.id, name: holiday.name })
                            }
                            className="p-2 text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

export default function HolidaysPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <HolidaysContent />
    </ProtectedRoute>
  );
}

