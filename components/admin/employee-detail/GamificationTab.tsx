"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Trophy,
  Flame,
  TrendingUp,
  Star,
  Zap,
  Clock,
  CheckCircle,
  Sunrise,
  Briefcase,
  AlertCircle,
  Calendar,
  ChevronDown,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getEmployeeGameProfile, getBadgesWithProgress, RANK_TIERS, calculateRankTier, getRankProgress } from "@/lib/services/gamification.service";
import type { GameProfile, BadgeWithProgress } from "@/lib/services/gamification.service";
import { supabase } from "@/lib/supabase/client";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";

interface PointTransaction {
  id: string;
  points: number;
  action_type: string;
  description: string;
  created_at: string;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; color: string; bg: string; category: string }
> = {
  on_time_checkin: { label: "เช็กอินตรงเวลา", icon: CheckCircle, color: "text-[#34c759]", bg: "bg-[#34c759]/10", category: "checkin" },
  early_checkin: { label: "เข้างานก่อนเวลา", icon: Sunrise, color: "text-[#ffd700]", bg: "bg-[#ffd700]/10", category: "checkin" },
  full_attendance_day: { label: "เข้า-ออกครบวัน", icon: Star, color: "text-[#0071e3]", bg: "bg-[#0071e3]/10", category: "checkin" },
  ot_completed: { label: "ทำ OT สำเร็จ", icon: Briefcase, color: "text-[#ff9500]", bg: "bg-[#ff9500]/10", category: "ot" },
  streak_bonus: { label: "โบนัส Streak", icon: Flame, color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10", category: "bonus" },
  no_leave_week: { label: "ไม่ลาทั้งสัปดาห์", icon: Calendar, color: "text-[#5ac8fa]", bg: "bg-[#5ac8fa]/10", category: "bonus" },
  late_penalty: { label: "มาสาย", icon: AlertCircle, color: "text-[#ff3b30]", bg: "bg-[#ff3b30]/10", category: "penalty" },
};

const ADMIN_FILTER_TABS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "checkin", label: "เช็กอิน" },
  { key: "ot", label: "OT" },
  { key: "bonus", label: "โบนัส" },
  { key: "penalty", label: "หักแต้ม" },
] as const;
type AdminFilterKey = (typeof ADMIN_FILTER_TABS)[number]["key"];

interface GamificationTabProps {
  employeeId: string;
}

// Rank tier visual config
const RANK_VISUAL: Record<string, { cardBg: string; badgeSolid: string; badgeText: string; barStyle: string; glow: string; icon: string }> = {
  Unranked: { cardBg: "from-[#3a3a3c] to-[#1d1d1f]", badgeSolid: "bg-[#636366]", badgeText: "text-white", barStyle: "bg-[#636366]", glow: "", icon: "🔒" },
  Bronze:   { cardBg: "from-[#92400e] to-[#1c0a00]", badgeSolid: "bg-gradient-to-r from-[#d97706] to-[#b45309]", badgeText: "text-white", barStyle: "bg-gradient-to-r from-[#d97706] to-[#b45309]", glow: "shadow-[0_2px_16px_rgba(217,119,6,0.4)]", icon: "🥉" },
  Silver:   { cardBg: "from-[#374151] to-[#111827]", badgeSolid: "bg-gradient-to-r from-[#6b7280] to-[#4b5563]", badgeText: "text-white", barStyle: "bg-gradient-to-r from-[#9ca3af] to-[#6b7280]", glow: "shadow-[0_2px_16px_rgba(107,114,128,0.4)]", icon: "🥈" },
  Gold:     { cardBg: "from-[#78350f] to-[#1c0a00]", badgeSolid: "bg-gradient-to-r from-[#f59e0b] to-[#d97706]", badgeText: "text-[#1c0a00]", barStyle: "bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]", glow: "shadow-[0_2px_20px_rgba(245,158,11,0.5)]", icon: "🥇" },
  Platinum: { cardBg: "from-[#1e3a5f] to-[#0a0a1a]", badgeSolid: "bg-gradient-to-r from-[#0ea5e9] to-[#6366f1]", badgeText: "text-white", barStyle: "bg-gradient-to-r from-[#38bdf8] to-[#818cf8]", glow: "shadow-[0_2px_20px_rgba(14,165,233,0.45)]", icon: "💎" },
  Diamond:  { cardBg: "from-[#581c87] to-[#0c4a6e]", badgeSolid: "bg-gradient-to-r from-[#d946ef] via-[#818cf8] to-[#22d3ee]", badgeText: "text-white", barStyle: "bg-gradient-to-r from-[#d946ef] via-[#818cf8] to-[#22d3ee]", glow: "shadow-[0_2px_24px_rgba(217,70,239,0.55)]", icon: "👑" },
};

export function GamificationTab({ employeeId }: GamificationTabProps) {
  const [profile, setProfile] = useState<GameProfile | null>(null);
  const [badges, setBadges] = useState<BadgeWithProgress[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [profileData, badgeData, txnResult] = await Promise.all([
          getEmployeeGameProfile(employeeId),
          getBadgesWithProgress(employeeId),
          supabase
            .from("point_transactions")
            .select("id, points, action_type, description, created_at")
            .eq("employee_id", employeeId)
            .order("created_at", { ascending: false })
            .limit(500),
        ]);

        setProfile(profileData);
        setBadges(badgeData);
        setTransactions((txnResult.data as PointTransaction[]) || []);
      } catch (err) {
        console.error("Error loading gamification data:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-3 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <div className="text-center py-12 text-[#86868b]">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-[15px]">ไม่พบข้อมูล Gamification</p>
        </div>
      </Card>
    );
  }

  const earnedBadges = badges.filter((b) => b.earned);
  const rankTier = profile.rankTier || "Unranked";
  const rankStyle = RANK_VISUAL[rankTier] || RANK_VISUAL.Unranked;
  const { nextTierPoints: nextRankPoints, progress: rankProgress } = getRankProgress(profile.quarterlyPoints);
  const nextRankTier = RANK_TIERS.find((r) => r.minPoints === nextRankPoints);

  const summaryItems = [
    {
      label: "Level",
      value: `Lv.${profile.level}`,
      sub: profile.levelName,
      icon: Star,
      color: "text-[#ffd700]",
      bg: "bg-[#ffd700]/10",
    },
    {
      label: "แต้มรวม",
      value: profile.totalPoints.toLocaleString(),
      sub: "pts",
      icon: Zap,
      color: "text-[#ff9500]",
      bg: "bg-[#ff9500]/10",
    },
    {
      label: "แต้มไตรมาสนี้",
      value: profile.quarterlyPoints.toLocaleString(),
      sub: "pts",
      icon: TrendingUp,
      color: "text-[#34c759]",
      bg: "bg-[#34c759]/10",
    },
    {
      label: "Streak ปัจจุบัน",
      value: `${profile.currentStreak}`,
      sub: "วัน",
      icon: Flame,
      color: "text-[#ff3b30]",
      bg: "bg-[#ff3b30]/10",
    },
    {
      label: "Streak สูงสุด",
      value: `${profile.longestStreak}`,
      sub: "วัน",
      icon: Flame,
      color: "text-[#af52de]",
      bg: "bg-[#af52de]/10",
    },
    {
      label: "อันดับ",
      value: `#${profile.rank ?? "-"}`,
      sub: "Rank",
      icon: Trophy,
      color: "text-[#0071e3]",
      bg: "bg-[#0071e3]/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Rank Tier Card */}
      <div className={`bg-gradient-to-br ${rankStyle.cardBg} rounded-2xl p-5 text-white ${rankStyle.glow}`}>
        <div className="flex items-center justify-between mb-4">
          {/* Rank Badge */}
          <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl ${rankStyle.badgeSolid}`}>
            <span className="text-[22px] leading-none">{rankStyle.icon}</span>
            <div>
              <p className={`text-[17px] font-bold leading-tight ${rankStyle.badgeText}`}>{rankTier}</p>
              <p className={`text-[10px] font-medium ${rankStyle.badgeText} opacity-80`}>Rank ไตรมาสนี้</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[13px] text-white/60">อันดับ</p>
            <p className="text-[22px] font-bold">#{profile.rank ?? "-"}</p>
          </div>
        </div>

        {/* Tier Journey */}
        <div className="flex items-center gap-1 mb-3">
          {RANK_TIERS.slice(1).map((t, idx) => {
            const reached = profile.quarterlyPoints >= t.minPoints;
            const isCurrent = rankTier === t.tier;
            const ts = RANK_VISUAL[t.tier];
            return (
              <div key={t.tier} className="flex items-center flex-1">
                {idx > 0 && (
                  <div className={`h-1 flex-1 rounded-full mx-0.5 ${reached ? ts.barStyle : "bg-white/15"}`} />
                )}
                <span className={`text-[15px] transition-all ${isCurrent ? "scale-125" : ""} ${!reached ? "opacity-35" : ""}`}>
                  {ts.icon}
                </span>
              </div>
            );
          })}
        </div>

        {/* Rank progress bar */}
        <div>
          <div className="flex justify-between text-[11px] text-white/60 mb-1.5">
            <span className="text-white/80 font-medium">{profile.quarterlyPoints} pts</span>
            {nextRankPoints > 0 && (
              <span>อีก {nextRankPoints - profile.quarterlyPoints} pts → {nextRankTier?.tier || ""}</span>
            )}
          </div>
          <div className="h-2 bg-white/15 rounded-full overflow-hidden">
            <div
              className={`h-full ${rankStyle.barStyle} rounded-full transition-all duration-700`}
              style={{ width: `${rankProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryItems.map((item) => (
          <Card key={item.label} padding="sm">
            <div className="flex flex-col items-center text-center gap-2">
              <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-[#1d1d1f] leading-tight">{item.value}</p>
                <p className="text-[11px] text-[#86868b] mt-0.5">{item.sub}</p>
              </div>
              <p className="text-[12px] text-[#86868b]">{item.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Level Progress */}
      {profile.progressToNextLevel < 100 && (
        <Card padding="sm">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[13px] font-medium text-[#1d1d1f]">
                  Progress to Lv.{profile.level + 1}
                </span>
                <span className="text-[12px] text-[#86868b]">
                  {profile.totalPoints} / {profile.nextLevelPoints} pts
                </span>
              </div>
              <div className="h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0071e3] to-[#5ac8fa] rounded-full transition-all duration-500"
                  style={{ width: `${profile.progressToNextLevel}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Badges */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-[#ffd700]" />
          <h3 className="text-[16px] font-semibold text-[#1d1d1f]">
            เหรียญที่ได้รับ ({earnedBadges.length})
          </h3>
        </div>

        {earnedBadges.length === 0 ? (
          <p className="text-center text-[14px] text-[#86868b] py-8">
            ยังไม่มีเหรียญ
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {earnedBadges.map((badge) => (
              <div
                key={badge.id + (badge.earnedAt || "")}
                className="bg-white border border-[#34c759]/30 rounded-xl p-3 text-center"
              >
                <div className="text-3xl mb-2">{badge.icon}</div>
                <p className="text-[13px] font-semibold text-[#1d1d1f] leading-tight">
                  {badge.name}
                </p>
                <p className="text-[11px] text-[#86868b] mt-1 line-clamp-2">
                  {badge.description}
                </p>
                {badge.earnedAt && (
                  <p className="text-[10px] text-[#86868b] mt-1.5">
                    {format(new Date(badge.earnedAt), "d MMM yy", { locale: th })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Point Breakdown + Transactions */}
      <TransactionSection transactions={transactions} />
    </div>
  );
}

function TransactionSection({ transactions }: { transactions: PointTransaction[] }) {
  const [filter, setFilter] = useState<AdminFilterKey>("all");
  const [showCount, setShowCount] = useState(30);

  const stats = useMemo(() => {
    let earned = 0;
    let deducted = 0;
    const typeCounts: Record<string, { count: number; total: number }> = {};
    for (const t of transactions) {
      if (t.points >= 0) earned += t.points;
      else deducted += t.points;
      if (!typeCounts[t.action_type]) typeCounts[t.action_type] = { count: 0, total: 0 };
      typeCounts[t.action_type].count += 1;
      typeCounts[t.action_type].total += t.points;
    }
    return { earned, deducted, net: earned + deducted, typeCounts };
  }, [transactions]);

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((t) => ACTION_CONFIG[t.action_type]?.category === filter);
  }, [transactions, filter]);

  const displayed = filtered.slice(0, showCount);

  return (
    <>
      {/* Point Breakdown */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#ff9500]" />
          <h3 className="text-[16px] font-semibold text-[#1d1d1f]">สรุปแต้มทั้งหมด</h3>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#34c759]/8 rounded-xl p-3 text-center">
            <p className="text-[18px] font-bold text-[#34c759]">+{stats.earned.toLocaleString()}</p>
            <p className="text-[11px] text-[#86868b]">ได้รับ</p>
          </div>
          <div className="bg-[#ff3b30]/8 rounded-xl p-3 text-center">
            <p className="text-[18px] font-bold text-[#ff3b30]">{stats.deducted.toLocaleString()}</p>
            <p className="text-[11px] text-[#86868b]">หัก</p>
          </div>
          <div className="bg-[#0071e3]/8 rounded-xl p-3 text-center">
            <p className="text-[18px] font-bold text-[#0071e3]">
              {stats.net >= 0 ? "+" : ""}{stats.net.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#86868b]">สุทธิ</p>
          </div>
        </div>

        <div className="space-y-2">
          {Object.entries(stats.typeCounts)
            .sort(([, a], [, b]) => b.count - a.count)
            .map(([type, data]) => {
              const cfg = ACTION_CONFIG[type] || { label: type, icon: Zap, color: "text-[#86868b]", bg: "bg-[#f5f5f7]" };
              const Icon = cfg.icon;
              return (
                <div key={type} className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <span className="text-[13px] text-[#1d1d1f] flex-1">{cfg.label}</span>
                  <span className="text-[12px] text-[#86868b] tabular-nums">{data.count} ครั้ง</span>
                  <span className={`text-[13px] font-semibold tabular-nums min-w-[60px] text-right ${data.total >= 0 ? "text-[#34c759]" : "text-[#ff3b30]"}`}>
                    {data.total >= 0 ? "+" : ""}{data.total}
                  </span>
                </div>
              );
            })}
        </div>
      </Card>

      {/* Transaction History */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#86868b]" />
            <h3 className="text-[16px] font-semibold text-[#1d1d1f]">
              ประวัติแต้ม ({transactions.length} รายการ)
            </h3>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {ADMIN_FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setFilter(tab.key); setShowCount(30); }}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-lg whitespace-nowrap transition-all ${
                filter === tab.key
                  ? "bg-[#1d1d1f] text-white"
                  : "bg-[#f5f5f7] text-[#86868b] hover:bg-[#e8e8ed]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <Filter className="w-8 h-8 text-[#d2d2d7] mx-auto mb-2" />
            <p className="text-[14px] text-[#86868b]">ไม่มีรายการ</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#f5f5f7]">
              {displayed.map((txn) => {
                const cfg = ACTION_CONFIG[txn.action_type] || { label: txn.action_type, icon: Zap, color: "text-[#86868b]", bg: "bg-[#f5f5f7]" };
                const Icon = cfg.icon;
                return (
                  <div key={txn.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#1d1d1f] truncate">{txn.description}</p>
                      <p className="text-[11px] text-[#86868b]">
                        {format(parseISO(txn.created_at), "d MMM yy · HH:mm น.", { locale: th })}
                      </p>
                    </div>
                    <span
                      className={`text-[15px] font-bold tabular-nums flex-shrink-0 ${
                        txn.points >= 0 ? "text-[#34c759]" : "text-[#ff3b30]"
                      }`}
                    >
                      {txn.points >= 0 ? "+" : ""}{txn.points}
                    </span>
                  </div>
                );
              })}
            </div>

            {filtered.length > showCount && (
              <button
                onClick={() => setShowCount((c) => c + 30)}
                className="w-full mt-3 py-2.5 bg-[#f5f5f7] rounded-xl text-[13px] font-medium text-[#86868b] hover:bg-[#e8e8ed] transition-colors flex items-center justify-center gap-1.5"
              >
                <ChevronDown className="w-4 h-4" />
                โหลดเพิ่ม ({filtered.length - showCount} รายการ)
              </button>
            )}
          </>
        )}
      </Card>
    </>
  );
}
