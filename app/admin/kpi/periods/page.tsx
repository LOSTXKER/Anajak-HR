"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import { Plus, Calendar, ChevronRight } from "lucide-react";
import type { KPIPeriod } from "@/lib/services/kpi.service";

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string; nextLabel: string }> = {
  draft: { label: "แบบร่าง", color: "#86868b", next: "goal_setting", nextLabel: "เปิดตั้งเป้าหมาย" },
  goal_setting: { label: "ตั้งเป้าหมาย", color: "#ff9f0a", next: "in_progress", nextLabel: "เริ่มรอบประเมิน" },
  in_progress: { label: "กำลังดำเนินการ", color: "#007aff", next: "evaluating", nextLabel: "เปิดช่วงประเมิน" },
  evaluating: { label: "ช่วงประเมิน", color: "#bf5af2", next: "closed", nextLabel: "ปิดรอบประเมิน" },
  closed: { label: "ปิดแล้ว", color: "#30d158", next: "", nextLabel: "" },
};

function PeriodsContent() {
  const toast = useToast();
  const [periods, setPeriods] = useState<KPIPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from("kpi_periods")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      setPeriods(data || []);
    } catch {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (periodId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("kpi_periods")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", periodId);
      if (error) throw error;

      if (newStatus === "evaluating") {
        try {
          const res = await fetch(`/api/kpi/auto-metrics/${periodId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const result = await res.json();
          toast.success("สำเร็จ", result.message || "คำนวณตัวชี้วัดสำเร็จ");
        } catch {
          toast.warning("คำเตือน", "เปลี่ยนสถานะแล้ว แต่ไม่สามารถคำนวณ auto metrics");
        }
      } else {
        toast.success("สำเร็จ", "เปลี่ยนสถานะเรียบร้อย");
      }

      fetchPeriods();
    } catch {
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถเปลี่ยนสถานะได้");
    }
  };

  return (
    <AdminLayout title="รอบประเมิน KPI" description="จัดการรอบการประเมินผลงานพนักงาน">
      <div className="flex justify-end mb-6">
        <Link href="/admin/kpi/periods/create">
          <Button>
            <Plus className="w-5 h-5" /> สร้างรอบประเมิน
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : periods.length === 0 ? (
        <Card elevated>
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-[#86868b]" />
            </div>
            <p className="text-[17px] text-[#86868b]">ยังไม่มีรอบประเมิน</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {periods.map((period) => {
            const config = STATUS_CONFIG[period.status] || STATUS_CONFIG.draft;
            return (
              <Card key={period.id} elevated>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${config.color}15` }}>
                      <Calendar className="w-6 h-6" style={{ color: config.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[17px] font-semibold text-[#1d1d1f]">{period.name}</h3>
                        <span
                          className="text-[12px] font-medium px-2 py-0.5 rounded-lg"
                          style={{ backgroundColor: `${config.color}15`, color: config.color }}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="text-[14px] text-[#86868b] mt-0.5">
                        {period.start_date} - {period.end_date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.next && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange(period.id, config.next)}
                      >
                        {config.nextLabel}
                      </Button>
                    )}
                    <Link href={`/admin/kpi/periods/create?edit=${period.id}`}>
                      <Button variant="secondary" size="sm">
                        แก้ไข <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}

export default function PeriodsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <PeriodsContent />
    </ProtectedRoute>
  );
}
