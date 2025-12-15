"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { MapPin, Plus, Edit2, Trash2, Building2 } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  address: string;
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
}

function BranchesContent() {
  const toast = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: "",
    name: "",
  });
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    gps_lat: "",
    gps_lng: "",
    radius_meters: "100",
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("name");
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลสาขาได้");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        name: formData.name,
        address: formData.address,
        gps_lat: parseFloat(formData.gps_lat),
        gps_lng: parseFloat(formData.gps_lng),
        radius_meters: parseInt(formData.radius_meters),
      };

      if (editingId) {
        const { error } = await supabase.from("branches").update(data).eq("id", editingId);
        if (error) throw error;
        toast.success("อัพเดตสำเร็จ", "แก้ไขข้อมูลสาขาเรียบร้อยแล้ว");
      } else {
        const { error } = await supabase.from("branches").insert(data);
        if (error) throw error;
        toast.success("เพิ่มสำเร็จ", "เพิ่มสาขาใหม่เรียบร้อยแล้ว");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "", address: "", gps_lat: "", gps_lng: "", radius_meters: "100" });
      fetchBranches();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (branch: Branch) => {
    setFormData({
      name: branch.name,
      address: branch.address || "",
      gps_lat: branch.gps_lat?.toString() || "",
      gps_lng: branch.gps_lng?.toString() || "",
      radius_meters: branch.radius_meters?.toString() || "100",
    });
    setEditingId(branch.id);
    setShowForm(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("branches").delete().eq("id", deleteConfirm.id);
      if (error) throw error;

      toast.success("ลบสำเร็จ", "ลบสาขาเรียบร้อยแล้ว");
      setDeleteConfirm({ open: false, id: "", name: "" });
      fetchBranches();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถลบสาขาได้");
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", address: "", gps_lat: "", gps_lng: "", radius_meters: "100" });
  };

  return (
    <AdminLayout title="จัดการสาขา" description="ตั้งค่าที่ตั้งและขอบเขตของสาขา">
      {/* Add Button */}
      <div className="flex justify-end mb-6">
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="w-5 h-5" />
          เพิ่มสาขา
        </Button>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingId ? "แก้ไขสาขา" : "เพิ่มสาขาใหม่"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="ชื่อสาขา"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="สาขาหลัก"
            required
          />
          <Input
            label="ที่อยู่"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="123 ถ.สุขุมวิท กรุงเทพฯ"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude (ละติจูด)"
              type="number"
              step="any"
              value={formData.gps_lat}
              onChange={(e) => setFormData({ ...formData, gps_lat: e.target.value })}
              placeholder="13.7563"
              required
            />
            <Input
              label="Longitude (ลองจิจูด)"
              type="number"
              step="any"
              value={formData.gps_lng}
              onChange={(e) => setFormData({ ...formData, gps_lng: e.target.value })}
              placeholder="100.5018"
              required
            />
          </div>
          <Input
            label="รัศมี (เมตร)"
            type="number"
            value={formData.radius_meters}
            onChange={(e) => setFormData({ ...formData, radius_meters: e.target.value })}
            placeholder="100"
            required
          />
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
        message={`คุณต้องการลบสาขา "${deleteConfirm.name}" ใช่หรือไม่?`}
        type="danger"
        confirmText="ลบ"
        loading={deleting}
      />

      {/* Branches List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : branches.length === 0 ? (
        <Card elevated>
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-[#86868b]" />
            </div>
            <p className="text-[17px] text-[#86868b]">ยังไม่มีสาขา</p>
            <p className="text-[14px] text-[#86868b] mt-1">
              กดปุ่ม "เพิ่มสาขา" เพื่อเริ่มต้น
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((branch) => (
            <Card key={branch.id} elevated>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#0071e3]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-[#0071e3]" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
                      {branch.name}
                    </h3>
                    {branch.address && (
                      <p className="text-[14px] text-[#86868b] mt-1">{branch.address}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-[13px] text-[#6e6e73]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {branch.gps_lat?.toFixed(4)}, {branch.gps_lng?.toFixed(4)}
                      </span>
                      <span>📏 {branch.radius_meters}m</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(branch)}
                    className="p-2 text-[#86868b] hover:text-[#0071e3] hover:bg-[#f5f5f7] rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ open: true, id: branch.id, name: branch.name })}
                    className="p-2 text-[#86868b] hover:text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

export default function BranchesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <BranchesContent />
    </ProtectedRoute>
  );
}
