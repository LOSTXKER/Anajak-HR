"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  AlertTriangle,
  Clock,
  MapPin,
  UserX,
  CheckCircle,
  XCircle,
  Edit,
  Filter,
  RefreshCw,
  Eye,
} from "lucide-react";

interface Anomaly {
  id: string;
  attendance_id: string;
  employee_id: string;
  date: string;
  anomaly_type: string;
  description: string;
  status: string;
  resolved_by: string;
  resolved_at: string;
  resolution_note: string;
  created_at: string;
  employee?: {
    name: string;
    email: string;
  };
  resolver?: {
    name: string;
  };
}

const anomalyTypeLabels: Record<string, { label: string; icon: any; color: string }> = {
  forgot_checkout: {
    label: "ลืมเช็คเอาท์",
    icon: Clock,
    color: "text-[#ff9500] bg-[#ff9500]/10",
  },
  auto_checkout: {
    label: "Auto Check-out",
    icon: Clock,
    color: "text-[#0071e3] bg-[#0071e3]/10",
  },
  overtime_no_request: {
    label: "อยู่เกินเวลาไม่ขอ OT",
    icon: AlertTriangle,
    color: "text-[#ff3b30] bg-[#ff3b30]/10",
  },
  late_checkin: {
    label: "เช็คอินสาย",
    icon: Clock,
    color: "text-[#ff9500] bg-[#ff9500]/10",
  },
  early_checkout: {
    label: "เช็คเอาท์ก่อนเวลา",
    icon: Clock,
    color: "text-[#ff9500] bg-[#ff9500]/10",
  },
  location_mismatch: {
    label: "ตำแหน่งไม่ตรง",
    icon: MapPin,
    color: "text-[#ff3b30] bg-[#ff3b30]/10",
  },
  manual_edit: {
    label: "แก้ไขข้อมูล",
    icon: Edit,
    color: "text-[#5856d6] bg-[#5856d6]/10",
  },
};

const statusOptions = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "resolved", label: "ตรวจสอบแล้ว" },
  { value: "ignored", label: "ไม่ต้องดำเนินการ" },
];

function AnomaliesContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [filter, setFilter] = useState("pending");
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");

  useEffect(() => {
    fetchAnomalies();
  }, [filter]);

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("attendance_anomalies")
        .select(
          `
          *,
          employee:employees!employee_id(name, email),
          resolver:employees!resolved_by(name)
        `
        )
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAnomalies(data || []);
    } catch (error) {
      console.error("Error fetching anomalies:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (status: "resolved" | "ignored") => {
    if (!selectedAnomaly) return;
    setResolving(true);
    try {
      const { error } = await supabase
        .from("attendance_anomalies")
        .update({
          status,
          resolution_note: resolutionNote,
          resolved_at: new Date().toISOString(),
          // resolved_by จะต้องใส่ user id ที่ login อยู่
        })
        .eq("id", selectedAnomaly.id);

      if (error) throw error;

      toast.success(
        "บันทึกสำเร็จ",
        status === "resolved" ? "ตรวจสอบเรียบร้อยแล้ว" : "ไม่ต้องดำเนินการ"
      );
      setShowModal(false);
      setSelectedAnomaly(null);
      setResolutionNote("");
      fetchAnomalies();
    } catch (error) {
      console.error("Error resolving anomaly:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกได้");
    } finally {
      setResolving(false);
    }
  };

  const pendingCount = anomalies.filter((a) => a.status === "pending").length;

  return (
    <AdminLayout
      title="ตรวจสอบความผิดปกติ"
      description="รายการเหตุการณ์ที่ต้องตรวจสอบและดำเนินการ"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card elevated className="text-center">
            <div className="text-[32px] font-bold text-[#ff3b30]">{pendingCount}</div>
            <p className="text-[13px] text-[#86868b]">รอตรวจสอบ</p>
          </Card>
          <Card elevated className="text-center">
            <div className="text-[32px] font-bold text-[#ff9500]">
              {anomalies.filter((a) => a.anomaly_type === "forgot_checkout").length}
            </div>
            <p className="text-[13px] text-[#86868b]">ลืมเช็คเอาท์</p>
          </Card>
          <Card elevated className="text-center">
            <div className="text-[32px] font-bold text-[#0071e3]">
              {anomalies.filter((a) => a.anomaly_type === "auto_checkout").length}
            </div>
            <p className="text-[13px] text-[#86868b]">Auto Check-out</p>
          </Card>
          <Card elevated className="text-center">
            <div className="text-[32px] font-bold text-[#5856d6]">
              {anomalies.filter((a) => a.anomaly_type === "overtime_no_request").length}
            </div>
            <p className="text-[13px] text-[#86868b]">OT ไม่ได้ขอ</p>
          </Card>
        </div>

        {/* Filter */}
        <Card elevated>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-[#86868b]" />
              <span className="text-[15px] font-medium text-[#1d1d1f]">กรอง:</span>
              <Select
                value={filter}
                onChange={setFilter}
                options={statusOptions}
                className="w-40"
              />
            </div>
            <Button variant="secondary" onClick={fetchAnomalies}>
              <RefreshCw className="w-4 h-4" />
              รีเฟรช
            </Button>
          </div>
        </Card>

        {/* Anomalies List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : anomalies.length === 0 ? (
          <Card elevated className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-[#34c759] mx-auto mb-4" />
            <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
              ไม่มีรายการที่ต้องตรวจสอบ
            </h3>
            <p className="text-[15px] text-[#86868b]">
              ระบบทำงานปกติ ไม่พบความผิดปกติ
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {anomalies.map((anomaly) => {
              const typeInfo = anomalyTypeLabels[anomaly.anomaly_type] || {
                label: anomaly.anomaly_type,
                icon: AlertTriangle,
                color: "text-[#86868b] bg-[#f5f5f7]",
              };
              const Icon = typeInfo.icon;

              return (
                <Card key={anomaly.id} elevated className="hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeInfo.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        {anomaly.status === "pending" && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#ff3b30]/10 text-[#ff3b30]">
                            รอตรวจสอบ
                          </span>
                        )}
                        {anomaly.status === "resolved" && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#34c759]/10 text-[#34c759]">
                            ตรวจสอบแล้ว
                          </span>
                        )}
                        {anomaly.status === "ignored" && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#86868b]/10 text-[#86868b]">
                            ไม่ต้องดำเนินการ
                          </span>
                        )}
                      </div>

                      <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-1">
                        {anomaly.employee?.name || "ไม่ระบุ"}{" "}
                        <span className="text-[#86868b] font-normal text-[13px]">
                          ({anomaly.employee?.email})
                        </span>
                      </h3>

                      <p className="text-[13px] text-[#86868b] mb-2">
                        {anomaly.description}
                      </p>

                      <p className="text-[12px] text-[#86868b]">
                        📅{" "}
                        {format(new Date(anomaly.date), "EEEE d MMMM yyyy", {
                          locale: th,
                        })}
                        {" • "}
                        🕐{" "}
                        {format(new Date(anomaly.created_at), "HH:mm น.", {
                          locale: th,
                        })}
                      </p>

                      {anomaly.resolution_note && (
                        <div className="mt-2 p-2 bg-[#f5f5f7] rounded-lg">
                          <p className="text-[12px] text-[#86868b]">
                            💬 {anomaly.resolution_note}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {anomaly.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedAnomaly(anomaly);
                              setShowModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                            ตรวจสอบ
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              // ไปหน้าแก้ไขเวลา
                              window.location.href = `/admin/attendance/edit/${anomaly.attendance_id}`;
                            }}
                          >
                            <Edit className="w-4 h-4" />
                            แก้ไข
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {showModal && selectedAnomaly && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6">
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">
                ตรวจสอบความผิดปกติ
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-[#f5f5f7] rounded-xl">
                  <p className="text-[13px] text-[#86868b] mb-1">พนักงาน</p>
                  <p className="text-[15px] font-medium text-[#1d1d1f]">
                    {selectedAnomaly.employee?.name}
                  </p>
                </div>

                <div className="p-4 bg-[#f5f5f7] rounded-xl">
                  <p className="text-[13px] text-[#86868b] mb-1">ประเภท</p>
                  <p className="text-[15px] font-medium text-[#1d1d1f]">
                    {anomalyTypeLabels[selectedAnomaly.anomaly_type]?.label ||
                      selectedAnomaly.anomaly_type}
                  </p>
                </div>

                <div className="p-4 bg-[#f5f5f7] rounded-xl">
                  <p className="text-[13px] text-[#86868b] mb-1">รายละเอียด</p>
                  <p className="text-[15px] text-[#1d1d1f]">
                    {selectedAnomaly.description}
                  </p>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                    หมายเหตุการตรวจสอบ
                  </label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none"
                    placeholder="เพิ่มหมายเหตุ (ไม่บังคับ)..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedAnomaly(null);
                    setResolutionNote("");
                  }}
                  fullWidth
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleResolve("ignored")}
                  loading={resolving}
                  fullWidth
                >
                  <XCircle className="w-4 h-4" />
                  ไม่ต้องดำเนินการ
                </Button>
                <Button
                  onClick={() => handleResolve("resolved")}
                  loading={resolving}
                  fullWidth
                >
                  <CheckCircle className="w-4 h-4" />
                  ตรวจสอบแล้ว
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AnomaliesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <AnomaliesContent />
    </ProtectedRoute>
  );
}

