"use client";

import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useMonitor } from "@/lib/hooks/use-monitor";
import { TodayStats } from "@/components/admin/monitor/TodayStats";
import { AnomalyList } from "@/components/admin/monitor/AnomalyList";
import { EmployeeStatusGrid } from "@/components/admin/monitor/EmployeeStatusGrid";
function MonitorContent() {
  const {
    viewMode,
    setViewMode,
    loading,
    refreshing,
    error,
    anomalyError,
    stats,
    activeOTs,
    recentActivity,
    currentTime,
    otTimes,
    fetchRealtimeData,
    anomalies,
    anomalyFilter,
    setAnomalyFilter,
    fetchAnomalies,
    pendingAnomaliesCount,
    selectedAnomaly,
    setSelectedAnomaly,
    showModal,
    setShowModal,
    resolving,
    resolutionNote,
    setResolutionNote,
    handleResolve,
  } = useMonitor();

  return (
    <AdminLayout title="Monitor" description="ติดตามสถานะและความผิดปกติ">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 p-1 bg-[#f5f5f7] rounded-2xl w-fit">
          <button
            onClick={() => setViewMode("realtime")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium transition-all ${
              viewMode === "realtime"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
          >
            <Activity className="w-4 h-4" />
            Real-time
          </button>
          <button
            onClick={() => setViewMode("anomalies")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-medium transition-all ${
              viewMode === "anomalies"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            ความผิดปกติ
            {pendingAnomaliesCount > 0 && (
              <span className="px-2 py-0.5 bg-[#ff3b30] text-white text-[11px] font-bold rounded-full">
                {pendingAnomaliesCount}
              </span>
            )}
          </button>
        </div>

        {viewMode === "realtime" && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[28px] font-light text-[#1d1d1f]">
                {format(currentTime, "HH:mm:ss")}
              </p>
              <p className="text-[13px] text-[#86868b]">
                {format(currentTime, "EEEE d MMMM yyyy", { locale: th })}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchRealtimeData}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        )}
      </div>

      {/* Realtime View Error State */}
      {viewMode === "realtime" && error && (
        <div className="mb-6 p-4 rounded-2xl border-l-4 border-l-[#ff3b30] bg-[#ff3b30]/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-[#ff3b30] flex-shrink-0" />
            <div>
              <p className="text-[15px] font-semibold text-[#1d1d1f]">
                ไม่สามารถโหลดข้อมูลได้
              </p>
              <p className="text-[13px] text-[#86868b] mt-0.5">{error}</p>
            </div>
          </div>
          <Button onClick={fetchRealtimeData} size="sm">
            ลองอีกครั้ง
          </Button>
        </div>
      )}

      {/* Realtime View */}
      {viewMode === "realtime" && (
        <>
          <TodayStats stats={stats} loading={loading} />
          <EmployeeStatusGrid
            activeOTs={activeOTs}
            recentActivity={recentActivity}
            otTimes={otTimes}
            loading={loading}
          />
        </>
      )}

      {/* Anomalies View */}
      {viewMode === "anomalies" && (
        <AnomalyList
          anomalies={anomalies}
          anomalyFilter={anomalyFilter}
          setAnomalyFilter={setAnomalyFilter}
          onRefresh={fetchAnomalies}
          onSelectAnomaly={(a) => {
            setSelectedAnomaly(a);
            setShowModal(true);
          }}
          loading={loading}
          error={anomalyError}
          onRetry={fetchAnomalies}
        />
      )}

      {/* Resolve Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="ตรวจสอบความผิดปกติ"
      >
        <div className="space-y-4">
          {selectedAnomaly && (
            <>
              <div className="p-4 bg-[#f5f5f7] rounded-xl">
                <p className="text-[13px] text-[#86868b] mb-1">พนักงาน</p>
                <p className="text-[15px] font-medium text-[#1d1d1f]">
                  {selectedAnomaly.employee?.name}
                </p>
              </div>
              <div className="p-4 bg-[#f5f5f7] rounded-xl">
                <p className="text-[13px] text-[#86868b] mb-1">รายละเอียด</p>
                <p className="text-[15px] text-[#1d1d1f]">
                  {selectedAnomaly.description}
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
              หมายเหตุ
            </label>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all resize-none"
              placeholder="เพิ่มหมายเหตุ (ไม่บังคับ)..."
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowModal(false)}
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
      </Modal>
    </AdminLayout>
  );
}

export default function MonitorPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <MonitorContent />
    </ProtectedRoute>
  );
}
