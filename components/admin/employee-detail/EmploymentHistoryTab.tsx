"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase/client";
import {
  Briefcase,
  LogOut,
  UserPlus,
  Ban,
  Clock,
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
  switch (action) {
    case "hired":
      return "เข้าทำงาน";
    case "resigned":
      return "ลาออก";
    case "terminated":
      return "เลิกจ้าง";
    case "rehired":
      return "รับกลับเข้าทำงาน";
    default:
      return action;
  }
}

function getActionBadgeVariant(action: string): "success" | "warning" | "danger" | "info" | "default" {
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

export function EmploymentHistoryTab({ employeeId }: EmploymentHistoryTabProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employment_history")
        .select("*, performer:employees!employment_history_performed_by_fkey(name)")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (error) {
        const { data: fallbackData } = await supabase
          .from("employment_history")
          .select("*")
          .eq("employee_id", employeeId)
          .order("created_at", { ascending: false });
        
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card elevated>
        <div className="text-center py-12">
          <Briefcase className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
          <p className="text-[15px] text-[#86868b]">ยังไม่มีประวัติการเข้า-ออกงาน</p>
          <p className="text-[13px] text-[#86868b] mt-1">
            ประวัติจะแสดงเมื่อมีการลาออก หรือรับกลับเข้าทำงาน
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card elevated padding="none">
      <div className="p-6 border-b border-[#e8e8ed]">
        <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
          ประวัติการเข้า-ออกงาน
        </h3>
        <p className="text-[13px] text-[#86868b] mt-1">
          บันทึกเหตุการณ์การเข้าทำงาน ลาออก และรับกลับเข้าทำงาน
        </p>
      </div>

      <div className="p-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-[#e8e8ed]" />

          <div className="space-y-6">
            {history.map((entry, index) => (
              <div key={entry.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0 w-10 h-10 bg-white rounded-full border-2 border-[#e8e8ed] flex items-center justify-center">
                  {getActionIcon(entry.action)}
                </div>

                {/* Content */}
                <div className={`flex-1 pb-2 ${index === history.length - 1 ? "" : ""}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={getActionBadgeVariant(entry.action)}>
                      {getActionLabel(entry.action)}
                    </Badge>
                    <span className="text-[13px] text-[#86868b]">
                      {format(new Date(entry.effective_date), "d MMMM yyyy", { locale: th })}
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
                      บันทึกเมื่อ {format(new Date(entry.created_at), "d MMM yyyy HH:mm", { locale: th })}
                    </span>
                    {entry.performer && (
                      <span>โดย {entry.performer.name}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
