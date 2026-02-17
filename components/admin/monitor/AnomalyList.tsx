"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  AlertTriangle,
  Clock,
  Edit,
  MapPin,
  Eye,
  RefreshCw,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import Link from "next/link";
import { ListSkeleton } from "@/components/ui/Skeleton";
import type { Anomaly } from "@/lib/hooks/use-monitor";

const anomalyTypeLabels: Record<
  string,
  { label: string; icon: any; color: string }
> = {
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

interface AnomalyListProps {
  anomalies: Anomaly[];
  anomalyFilter: string;
  setAnomalyFilter: (filter: string) => void;
  onRefresh: () => void;
  onSelectAnomaly: (anomaly: Anomaly) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function AnomalyList({
  anomalies,
  anomalyFilter,
  setAnomalyFilter,
  onRefresh,
  onSelectAnomaly,
  loading,
  error,
  onRetry,
}: AnomalyListProps) {
  return (
    <>
      {/* Filter */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 p-1 bg-[#f5f5f7] rounded-xl">
          {["pending", "resolved", "ignored", "all"].map((status) => (
            <button
              key={status}
              onClick={() => setAnomalyFilter(status)}
              className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                anomalyFilter === status
                  ? "bg-white text-[#1d1d1f] shadow-sm"
                  : "text-[#6e6e73] hover:text-[#1d1d1f]"
              }`}
            >
              {status === "pending" && "รอตรวจสอบ"}
              {status === "resolved" && "ตรวจสอบแล้ว"}
              {status === "ignored" && "ไม่ต้องดำเนินการ"}
              {status === "all" && "ทั้งหมด"}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card elevated className="mb-6 border-l-4 border-l-[#ff3b30] bg-[#ff3b30]/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-[#ff3b30] flex-shrink-0" />
              <div>
                <p className="text-[15px] font-semibold text-[#1d1d1f]">
                  ไม่สามารถโหลดข้อมูลได้
                </p>
                <p className="text-[13px] text-[#86868b] mt-0.5">{error}</p>
              </div>
            </div>
            {onRetry && (
              <Button onClick={onRetry} size="sm">
                ลองอีกครั้ง
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Loading State */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : anomalies.length === 0 ? (
        <Card elevated className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-[#34c759] mx-auto mb-4" />
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
            ไม่มีรายการที่ต้องตรวจสอบ
          </h3>
          <p className="text-[15px] text-[#86868b]">ระบบทำงานปกติ</p>
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
              <Card
                key={anomaly.id}
                elevated
                className="hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeInfo.color}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${typeInfo.color}`}
                      >
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
                      {anomaly.employee?.name || "ไม่ระบุ"}
                    </h3>

                    <p className="text-[13px] text-[#86868b] mb-2">
                      {anomaly.description}
                    </p>

                    <p className="text-[12px] text-[#86868b] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(anomaly.date), "d MMM yyyy", {
                        locale: th,
                      })}
                    </p>
                  </div>

                  {anomaly.status === "pending" && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => onSelectAnomaly(anomaly)}
                      >
                        <Eye className="w-4 h-4" />
                        ตรวจสอบ
                      </Button>
                      <Link href={`/admin/attendance/edit/${anomaly.attendance_id}`}>
                        <Button size="sm" variant="secondary" fullWidth>
                          <Edit className="w-4 h-4" />
                          แก้ไข
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
