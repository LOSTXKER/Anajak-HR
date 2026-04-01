"use client";

import { useState } from "react";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import type {
  SalaryEmployee,
  SalaryHistoryEntry,
} from "@/lib/hooks/use-salary-management";

interface SalaryHistoryModalProps {
  employee: SalaryEmployee;
  history: SalaryHistoryEntry[];
  loading: boolean;
  saving: boolean;
  onClose: () => void;
  onAdd: (
    employeeId: string,
    data: { base_salary: number; commission: number; effective_date: string }
  ) => Promise<void>;
  onUpdate: (
    entryId: string,
    employeeId: string,
    data: { base_salary: number; commission: number; effective_date: string }
  ) => Promise<void>;
  onDelete: (entryId: string, employeeId: string) => Promise<void>;
}

interface FormData {
  base_salary: string;
  commission: string;
  effective_date: string;
}

function EntryForm({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (d: FormData) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="เงินเดือนพื้นฐาน (฿)"
        type="number"
        value={data.base_salary}
        onChange={(e) => onChange({ ...data, base_salary: e.target.value })}
      />
      <Input
        label="ค่าคอมมิชชั่น (฿)"
        type="number"
        value={data.commission}
        onChange={(e) => onChange({ ...data, commission: e.target.value })}
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
    </div>
  );
}

function formatCurrency(val: number): string {
  return `฿${val.toLocaleString("th-TH", { minimumFractionDigits: 0 })}`;
}

export function SalaryHistoryModal({
  employee,
  history,
  loading,
  saving,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}: SalaryHistoryModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<FormData>({
    base_salary: (employee.base_salary || 0).toString(),
    commission: (employee.commission || 0).toString(),
    effective_date: new Date().toISOString().split("T")[0],
  });

  const [editEntry, setEditEntry] = useState<SalaryHistoryEntry | null>(null);
  const [editForm, setEditForm] = useState<FormData>({
    base_salary: "",
    commission: "",
    effective_date: "",
  });

  const [deleteEntry, setDeleteEntry] = useState<SalaryHistoryEntry | null>(
    null
  );

  const handleAdd = async () => {
    await onAdd(employee.id, {
      base_salary: parseFloat(addForm.base_salary) || 0,
      commission: parseFloat(addForm.commission) || 0,
      effective_date: addForm.effective_date,
    });
    setShowAddForm(false);
  };

  const openEdit = (entry: SalaryHistoryEntry) => {
    setEditEntry(entry);
    setEditForm({
      base_salary: entry.base_salary.toString(),
      commission: entry.commission.toString(),
      effective_date: entry.effective_date.slice(0, 10),
    });
  };

  const handleEdit = async () => {
    if (!editEntry) return;
    await onUpdate(editEntry.id, employee.id, {
      base_salary: parseFloat(editForm.base_salary) || 0,
      commission: parseFloat(editForm.commission) || 0,
      effective_date: editForm.effective_date,
    });
    setEditEntry(null);
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    await onDelete(deleteEntry.id, employee.id);
    setDeleteEntry(null);
  };

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title={`ประวัติเงินเดือน - ${employee.name}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Current salary summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#34c759]/10 rounded-xl">
              <p className="text-[12px] text-[#86868b]">เงินเดือนปัจจุบัน</p>
              <p className="text-[18px] font-bold text-[#34c759]">
                {formatCurrency(employee.base_salary || 0)}
              </p>
            </div>
            <div className="p-3 bg-[#0071e3]/10 rounded-xl">
              <p className="text-[12px] text-[#86868b]">คอมมิชชั่น</p>
              <p className="text-[18px] font-bold text-[#0071e3]">
                {formatCurrency(employee.commission || 0)}
              </p>
            </div>
          </div>

          {/* Add button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4" />
            เพิ่มรายการ
          </Button>

          {/* Timeline */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
              <p className="text-[15px] text-[#86868b]">
                ยังไม่มีประวัติเงินเดือน
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {history.map((entry, idx) => {
                const prev = history[idx + 1];
                const salaryDiff = prev
                  ? entry.base_salary - prev.base_salary
                  : 0;
                const isIncrease = salaryDiff > 0;
                const isDecrease = salaryDiff < 0;

                return (
                  <div
                    key={entry.id}
                    className="p-4 bg-[#f5f5f7] rounded-xl hover:bg-[#e8e8ed] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <DollarSign className="w-4 h-4 text-[#34c759]" />
                          <span className="font-semibold text-[15px] text-[#1d1d1f]">
                            {formatCurrency(entry.base_salary)}
                          </span>
                          {entry.commission > 0 && (
                            <span className="text-[13px] text-[#0071e3]">
                              + {formatCurrency(entry.commission)} คอม
                            </span>
                          )}
                          {isIncrease && (
                            <span className="flex items-center gap-0.5 text-[12px] text-[#34c759]">
                              <TrendingUp className="w-3 h-3" />+
                              {formatCurrency(salaryDiff)}
                            </span>
                          )}
                          {isDecrease && (
                            <span className="flex items-center gap-0.5 text-[12px] text-[#ff3b30]">
                              <TrendingDown className="w-3 h-3" />
                              {formatCurrency(salaryDiff)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[12px] text-[#86868b]">
                          <Clock className="w-3 h-3" />
                          <span>
                            มีผลตั้งแต่{" "}
                            {format(
                              new Date(entry.effective_date),
                              "d MMMM yyyy",
                              { locale: th }
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(entry)}
                          className="p-1.5 rounded-lg text-[#86868b] hover:bg-white hover:text-[#0071e3] transition-colors"
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
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Modal */}
      <Modal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="เพิ่มประวัติเงินเดือน"
        size="md"
      >
        <div className="space-y-5">
          <EntryForm data={addForm} onChange={setAddForm} />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowAddForm(false)}
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
        title="แก้ไขเงินเดือน"
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
        title="ลบประวัติเงินเดือน"
        message={
          deleteEntry
            ? `ต้องการลบรายการเงินเดือน ${formatCurrency(deleteEntry.base_salary)} วันที่ ${format(new Date(deleteEntry.effective_date), "d MMMM yyyy", { locale: th })} หรือไม่?`
            : ""
        }
        type="danger"
        confirmText="ลบ"
        loading={saving}
      />
    </>
  );
}
