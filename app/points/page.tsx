"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/lib/supabase/client";
import { useGameProfile } from "@/lib/hooks/use-gamification";
import { format, isToday, isYesterday, isThisWeek, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import {
  ArrowLeft,
  Clock,
  Zap,
  Flame,
  Briefcase,
  AlertCircle,
  CheckCircle,
  Star,
  TrendingUp,
  ChevronDown,
  Calendar,
  Filter,
  Sunrise,
} from "lucide-react";

interface PointTransaction {
  id: string;
  points: number;
  action_type: string;
  description: string;
  created_at: string;
  reference_type: string | null;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; color: string; bg: string; category: string }
> = {
  on_time_checkin: {
    label: "เช็กอินตรงเวลา",
    icon: CheckCircle,
    color: "text-[#34c759]",
    bg: "bg-[#34c759]/10",
    category: "checkin",
  },
  early_checkin: {
    label: "เข้างานก่อนเวลา",
    icon: Sunrise,
    color: "text-[#ffd700]",
    bg: "bg-[#ffd700]/10",
    category: "checkin",
  },
  full_attendance_day: {
    label: "เข้า-ออกครบวัน",
    icon: Star,
    color: "text-[#0071e3]",
    bg: "bg-[#0071e3]/10",
    category: "checkin",
  },
  ot_completed: {
    label: "ทำ OT สำเร็จ",
    icon: Briefcase,
    color: "text-[#ff9500]",
    bg: "bg-[#ff9500]/10",
    category: "ot",
  },
  streak_bonus: {
    label: "โบนัส Streak",
    icon: Flame,
    color: "text-[#ff3b30]",
    bg: "bg-[#ff3b30]/10",
    category: "bonus",
  },
  no_leave_week: {
    label: "ไม่ลาทั้งสัปดาห์",
    icon: Calendar,
    color: "text-[#5ac8fa]",
    bg: "bg-[#5ac8fa]/10",
    category: "bonus",
  },
  late_penalty: {
    label: "มาสาย",
    icon: AlertCircle,
    color: "text-[#ff3b30]",
    bg: "bg-[#ff3b30]/10",
    category: "penalty",
  },
};

const FILTER_TABS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "checkin", label: "เช็กอิน" },
  { key: "ot", label: "OT" },
  { key: "bonus", label: "โบนัส" },
  { key: "penalty", label: "หักแต้ม" },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]["key"];

function getDateGroup(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return "วันนี้";
  if (isYesterday(d)) return "เมื่อวาน";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "สัปดาห์นี้";
  return format(d, "MMMM yyyy", { locale: th });
}

function PointsContent() {
  const { employee } = useAuth();
  const { profile } = useGameProfile();
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showCount, setShowCount] = useState(50);

  const fetchTransactions = useCallback(async () => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("point_transactions")
        .select("id, points, action_type, description, created_at, reference_type")
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false })
        .limit(500);
      setTransactions((data as PointTransaction[]) || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [employee?.id]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((t) => {
      const cfg = ACTION_CONFIG[t.action_type];
      return cfg?.category === filter;
    });
  }, [transactions, filter]);

  const displayed = filtered.slice(0, showCount);

  const grouped = useMemo(() => {
    const groups: { label: string; items: PointTransaction[] }[] = [];
    let currentGroup = "";
    for (const txn of displayed) {
      const group = getDateGroup(txn.created_at);
      if (group !== currentGroup) {
        groups.push({ label: group, items: [] });
        currentGroup = group;
      }
      groups[groups.length - 1].items.push(txn);
    }
    return groups;
  }, [displayed]);

  const stats = useMemo(() => {
    let earned = 0;
    let deducted = 0;
    const typeCounts: Record<string, number> = {};
    for (const t of transactions) {
      if (t.points >= 0) earned += t.points;
      else deducted += t.points;
      typeCounts[t.action_type] = (typeCounts[t.action_type] || 0) + 1;
    }
    return { earned, deducted, net: earned + deducted, typeCounts };
  }, [transactions]);

  return (
    <div className="min-h-screen bg-[#fbfbfd] pb-20 pt-safe">
      <main className="max-w-[600px] mx-auto px-4 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-[#86868b]" />
          </Link>
          <div>
            <h1 className="text-[22px] font-bold text-[#1d1d1f]">ประวัติแต้ม</h1>
            <p className="text-[13px] text-[#86868b]">ดูที่มาแต้มทั้งหมดของคุณ</p>
          </div>
        </div>

        {/* Summary Cards */}
        {profile && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white rounded-2xl border border-[#e8e8ed] p-3 text-center">
              <Zap className="w-4 h-4 text-[#ff9500] mx-auto mb-1" />
              <p className="text-[18px] font-bold text-[#1d1d1f]">
                {profile.totalPoints.toLocaleString()}
              </p>
              <p className="text-[10px] text-[#86868b]">แต้มรวม</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#e8e8ed] p-3 text-center">
              <TrendingUp className="w-4 h-4 text-[#34c759] mx-auto mb-1" />
              <p className="text-[18px] font-bold text-[#34c759]">
                {profile.quarterlyPoints.toLocaleString()}
              </p>
              <p className="text-[10px] text-[#86868b]">ไตรมาสนี้</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#e8e8ed] p-3 text-center">
              <Flame className="w-4 h-4 text-[#ff3b30] mx-auto mb-1" />
              <p className="text-[18px] font-bold text-[#1d1d1f]">{profile.currentStreak}</p>
              <p className="text-[10px] text-[#86868b]">Streak</p>
            </div>
          </div>
        )}

        {/* Breakdown Bar */}
        <div className="bg-white rounded-2xl border border-[#e8e8ed] p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-semibold text-[#1d1d1f]">สรุปแต้ม</span>
            <span className="text-[13px] font-bold text-[#1d1d1f]">
              {stats.net >= 0 ? "+" : ""}
              {stats.net.toLocaleString()} pts
            </span>
          </div>
          <div className="flex gap-3 mb-3">
            <div className="flex-1 bg-[#34c759]/8 rounded-xl p-2.5 text-center">
              <p className="text-[15px] font-bold text-[#34c759]">
                +{stats.earned.toLocaleString()}
              </p>
              <p className="text-[10px] text-[#86868b]">ได้รับ</p>
            </div>
            <div className="flex-1 bg-[#ff3b30]/8 rounded-xl p-2.5 text-center">
              <p className="text-[15px] font-bold text-[#ff3b30]">
                {stats.deducted.toLocaleString()}
              </p>
              <p className="text-[10px] text-[#86868b]">หัก</p>
            </div>
          </div>

          {/* Type breakdown */}
          <div className="space-y-1.5">
            {Object.entries(stats.typeCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const cfg = ACTION_CONFIG[type] || {
                  label: type,
                  icon: Zap,
                  color: "text-[#86868b]",
                  bg: "bg-[#f5f5f7]",
                };
                const Icon = cfg.icon;
                return (
                  <div key={type} className="flex items-center gap-2.5">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center ${cfg.bg}`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </div>
                    <span className="text-[12px] text-[#1d1d1f] flex-1">{cfg.label}</span>
                    <span className="text-[12px] font-medium text-[#86868b] tabular-nums">
                      {count} ครั้ง
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setFilter(tab.key);
                setShowCount(50);
              }}
              className={`px-3.5 py-2 text-[13px] font-medium rounded-xl whitespace-nowrap transition-all ${
                filter === tab.key
                  ? "bg-[#1d1d1f] text-white"
                  : "bg-[#f5f5f7] text-[#86868b] hover:bg-[#e8e8ed]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 border border-[#e8e8ed] animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#f5f5f7] rounded-xl" />
                  <div className="flex-1">
                    <div className="h-4 bg-[#f5f5f7] rounded w-32 mb-1" />
                    <div className="h-3 bg-[#f5f5f7] rounded w-20" />
                  </div>
                  <div className="h-5 bg-[#f5f5f7] rounded w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-[#d2d2d7] mx-auto mb-3" />
            <p className="text-[15px] font-medium text-[#86868b]">ไม่มีรายการ</p>
            <p className="text-[13px] text-[#d2d2d7] mt-1">
              {filter === "all"
                ? "ยังไม่มีประวัติแต้ม"
                : "ไม่มีรายการในหมวดนี้"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wide mb-2 px-1">
                  {group.label}
                </p>
                <div className="bg-white rounded-2xl border border-[#e8e8ed] divide-y divide-[#f5f5f7] overflow-hidden">
                  {group.items.map((txn) => {
                    const cfg = ACTION_CONFIG[txn.action_type] || {
                      label: txn.action_type,
                      icon: Zap,
                      color: "text-[#86868b]",
                      bg: "bg-[#f5f5f7]",
                    };
                    const Icon = cfg.icon;
                    const isPositive = txn.points >= 0;

                    return (
                      <div
                        key={txn.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                        >
                          <Icon className={`w-4.5 h-4.5 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-[#1d1d1f] truncate">
                            {txn.description}
                          </p>
                          <p className="text-[11px] text-[#86868b]">
                            {format(parseISO(txn.created_at), "d MMM yy · HH:mm น.", {
                              locale: th,
                            })}
                          </p>
                        </div>
                        <span
                          className={`text-[16px] font-bold tabular-nums flex-shrink-0 ${
                            isPositive ? "text-[#34c759]" : "text-[#ff3b30]"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {txn.points}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filtered.length > showCount && (
              <button
                onClick={() => setShowCount((c) => c + 50)}
                className="w-full py-3 bg-[#f5f5f7] rounded-xl text-[14px] font-medium text-[#86868b] hover:bg-[#e8e8ed] transition-colors flex items-center justify-center gap-2"
              >
                <ChevronDown className="w-4 h-4" />
                โหลดเพิ่ม ({filtered.length - showCount} รายการ)
              </button>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

export default function PointsPage() {
  return (
    <ProtectedRoute>
      <PointsContent />
    </ProtectedRoute>
  );
}
