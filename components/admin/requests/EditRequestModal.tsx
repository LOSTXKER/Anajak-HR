"use client";

import { useState, useEffect } from "react";
import { Edit, Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { RequestItem, typeConfig, leaveTypeLabels } from "./types";

interface EditRequestModalProps {
  request: RequestItem | null;
  processing?: boolean;
  onClose: () => void;
  onSubmit: (request: RequestItem, editData: any) => void;
}

export function EditRequestModal({
  request,
  processing,
  onClose,
  onSubmit,
}: EditRequestModalProps) {
  const [editData, setEditData] = useState<any>({});

  // Initialize edit data when request changes
  useEffect(() => {
    if (!request) return;

    switch (request.type) {
      case "ot":
        setEditData({
          requested_start_time:
            request.rawData.requested_start_time?.split("T")[1]?.substring(0, 5) ||
            "",
          requested_end_time:
            request.rawData.requested_end_time?.split("T")[1]?.substring(0, 5) ||
            "",
          reason: request.reason || "",
        });
        break;
      case "leave":
        setEditData({
          leave_type: request.rawData.leave_type || "sick",
          start_date: request.rawData.start_date || "",
          end_date: request.rawData.end_date || "",
          is_half_day: request.rawData.is_half_day || false,
          reason: request.reason || "",
        });
        break;
      case "wfh":
        setEditData({
          date: request.rawData.date || "",
          is_half_day: request.rawData.is_half_day || false,
          reason: request.reason || "",
        });
        break;
      case "late":
        setEditData({
          request_date: request.rawData.request_date || "",
          actual_late_minutes: request.rawData.actual_late_minutes || 0,
          reason: request.reason || "",
        });
        break;
      case "field_work":
        setEditData({
          date: request.rawData.date || "",
          location: request.rawData.location || "",
          is_half_day: request.rawData.is_half_day || false,
          reason: request.reason || "",
        });
        break;
    }
  }, [request]);

  if (!request) return null;

  const typeInfo = typeConfig[request.type];

  const handleSubmit = () => {
    onSubmit(request, editData);
  };

  const updateEditData = (key: string, value: any) => {
    setEditData((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal
      isOpen={!!request}
      onClose={onClose}
      title={`แก้ไข ${typeInfo.label}`}
    >
      <div className="space-y-4">
        {/* Request Info */}
        <div className="p-3 bg-[#f5f5f7] rounded-xl">
          <p className="text-sm font-medium text-[#1d1d1f]">
            {request.employeeName}
          </p>
          <p className="text-xs text-[#86868b]">{request.employeeEmail}</p>
        </div>

        {/* OT Edit Form */}
        {request.type === "ot" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  เวลาเริ่ม
                </label>
                <Input
                  type="time"
                  value={editData.requested_start_time || ""}
                  onChange={(e) =>
                    updateEditData("requested_start_time", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  เวลาสิ้นสุด
                </label>
                <Input
                  type="time"
                  value={editData.requested_end_time || ""}
                  onChange={(e) =>
                    updateEditData("requested_end_time", e.target.value)
                  }
                />
              </div>
            </div>
          </>
        )}

        {/* Leave Edit Form */}
        {request.type === "leave" && (
          <>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                ประเภทการลา
              </label>
              <select
                value={editData.leave_type || ""}
                onChange={(e) => updateEditData("leave_type", e.target.value)}
                className="w-full px-4 py-2.5 bg-[#f5f5f7] border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                {Object.entries(leaveTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  วันที่เริ่ม
                </label>
                <Input
                  type="date"
                  value={editData.start_date || ""}
                  onChange={(e) => updateEditData("start_date", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  วันที่สิ้นสุด
                </label>
                <Input
                  type="date"
                  value={editData.end_date || ""}
                  onChange={(e) => updateEditData("end_date", e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
              <span className="text-sm font-medium text-[#1d1d1f]">ครึ่งวัน</span>
              <Toggle
                checked={editData.is_half_day || false}
                onChange={(checked) => updateEditData("is_half_day", checked)}
              />
            </div>
          </>
        )}

        {/* WFH Edit Form */}
        {request.type === "wfh" && (
          <>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                วันที่
              </label>
              <Input
                type="date"
                value={editData.date || ""}
                onChange={(e) => updateEditData("date", e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
              <span className="text-sm font-medium text-[#1d1d1f]">ครึ่งวัน</span>
              <Toggle
                checked={editData.is_half_day || false}
                onChange={(checked) => updateEditData("is_half_day", checked)}
              />
            </div>
          </>
        )}

        {/* Late Edit Form */}
        {request.type === "late" && (
          <>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                วันที่
              </label>
              <Input
                type="date"
                value={editData.request_date || ""}
                onChange={(e) => updateEditData("request_date", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                จำนวนนาทีที่สาย
              </label>
              <Input
                type="number"
                min={0}
                value={editData.actual_late_minutes || 0}
                onChange={(e) =>
                  updateEditData(
                    "actual_late_minutes",
                    parseInt(e.target.value) || 0
                  )
                }
              />
            </div>
          </>
        )}

        {/* Field Work Edit Form */}
        {request.type === "field_work" && (
          <>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                วันที่
              </label>
              <Input
                type="date"
                value={editData.date || ""}
                onChange={(e) => updateEditData("date", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
                สถานที่
              </label>
              <Input
                type="text"
                value={editData.location || ""}
                onChange={(e) => updateEditData("location", e.target.value)}
                placeholder="ระบุสถานที่ปฏิบัติงาน"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
              <span className="text-sm font-medium text-[#1d1d1f]">ครึ่งวัน</span>
              <Toggle
                checked={editData.is_half_day || false}
                onChange={(checked) => updateEditData("is_half_day", checked)}
              />
            </div>
          </>
        )}

        {/* Common Reason Field */}
        <div>
          <label className="block text-sm font-medium text-[#1d1d1f] mb-2">
            เหตุผล
          </label>
          <Textarea
            value={editData.reason || ""}
            onChange={(e) => updateEditData("reason", e.target.value)}
            placeholder="ระบุเหตุผล (ถ้ามี)"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-[#e8e8ed]">
          <Button className="flex-1" onClick={handleSubmit} disabled={processing}>
            <Save className="w-4 h-4 mr-1" />
            {processing ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </Button>
          <Button variant="text" onClick={onClose}>
            ยกเลิก
          </Button>
        </div>
      </div>
    </Modal>
  );
}
