"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { Avatar } from "@/components/ui/Avatar";
import { useLeaderboard } from "@/lib/hooks/use-gamification";
import { supabase } from "@/lib/supabase/client";
import { LEVELS, RANK_TIERS, getEmployeeGameProfile, getBadgesWithProgress, calculateRankTier, getCurrentQuarter } from "@/lib/services/gamification.service";
import {
  ArrowLeft,
  Trophy,
  Flame,
  Medal,
  Crown,
  Star,
  Filter,
  TrendingUp,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  Target,
  Award,
} from "lucide-react";

// ─── Rank Visual Config ───────────────────────────────────────────────────────

interface RankVisualConfig {
  icon: string;
  label: string;
  cardBg: string;
  // Badge: solid gradient bg + white text = readable on ANY background
  badgeSolid: string;
  badgeText: string;
  barStyle: string;
  glow: string;
  shimmer: boolean;
  // accent color (hex) for glow/highlight
  accent: string;
}

const RANK_VISUAL: Record<string, RankVisualConfig> = {
  Unranked: {
    icon: "🔒",
    label: "Unranked",
    cardBg: "from-[#3a3a3c] to-[#1d1d1f]",
    badgeSolid: "bg-[#636366]",
    badgeText: "text-white",
    barStyle: "bg-[#636366]",
    glow: "",
    shimmer: false,
    accent: "#636366",
  },
  Bronze: {
    icon: "🥉",
    label: "Bronze",
    cardBg: "from-[#92400e] via-[#78350f] to-[#1c0a00]",
    badgeSolid: "bg-gradient-to-r from-[#d97706] to-[#b45309]",
    badgeText: "text-white",
    barStyle: "bg-gradient-to-r from-[#d97706] to-[#b45309]",
    glow: "shadow-[0_2px_20px_rgba(217,119,6,0.5)]",
    shimmer: false,
    accent: "#d97706",
  },
  Silver: {
    icon: "🥈",
    label: "Silver",
    cardBg: "from-[#374151] via-[#1f2937] to-[#111827]",
    badgeSolid: "bg-gradient-to-r from-[#6b7280] to-[#4b5563]",
    badgeText: "text-white",
    barStyle: "bg-gradient-to-r from-[#9ca3af] to-[#6b7280]",
    glow: "shadow-[0_2px_20px_rgba(107,114,128,0.5)]",
    shimmer: false,
    accent: "#9ca3af",
  },
  Gold: {
    icon: "🥇",
    label: "Gold",
    cardBg: "from-[#78350f] via-[#92400e] to-[#1c0a00]",
    badgeSolid: "bg-gradient-to-r from-[#f59e0b] to-[#d97706]",
    badgeText: "text-[#1c0a00]",
    barStyle: "bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]",
    glow: "shadow-[0_2px_24px_rgba(245,158,11,0.6)]",
    shimmer: false,
    accent: "#f59e0b",
  },
  Platinum: {
    icon: "💎",
    label: "Platinum",
    cardBg: "from-[#1e3a5f] via-[#1e1b4b] to-[#0a0a1a]",
    badgeSolid: "bg-gradient-to-r from-[#0ea5e9] to-[#6366f1]",
    badgeText: "text-white",
    barStyle: "bg-gradient-to-r from-[#38bdf8] to-[#818cf8]",
    glow: "shadow-[0_2px_28px_rgba(14,165,233,0.55)]",
    shimmer: false,
    accent: "#38bdf8",
  },
  Diamond: {
    icon: "👑",
    label: "Diamond",
    cardBg: "from-[#581c87] via-[#1e1b4b] to-[#0c4a6e]",
    badgeSolid: "bg-gradient-to-r from-[#d946ef] via-[#818cf8] to-[#22d3ee]",
    badgeText: "text-white",
    barStyle: "bg-gradient-to-r from-[#d946ef] via-[#818cf8] to-[#22d3ee]",
    glow: "shadow-[0_2px_32px_rgba(217,70,239,0.65)]",
    shimmer: true,
    accent: "#d946ef",
  },
};

// ─── RankBadge Component ──────────────────────────────────────────────────────
// Uses solid gradient background + contrasting text → readable on ANY background

function RankBadge({
  tier,
  size = "md",
  showIcon = true,
}: {
  tier: string;
  size?: "sm" | "md" | "lg" | "xl";
  showIcon?: boolean;
}) {
  const cfg = RANK_VISUAL[tier] || RANK_VISUAL.Unranked;
  const sizes = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-[13px] px-2.5 py-1 gap-1.5",
    lg: "text-[15px] px-3.5 py-1.5 gap-2 font-bold",
    xl: "text-[18px] px-4 py-2 gap-2 font-bold",
  };
  return (
    <span
      className={`inline-flex items-center ${sizes[size]} rounded-full font-semibold ${cfg.badgeSolid} ${cfg.badgeText} ${cfg.shimmer ? "relative overflow-hidden" : ""}`}
    >
      {cfg.shimmer && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
      )}
      {showIcon && <span>{cfg.icon}</span>}
      <span>{tier}</span>
    </span>
  );
}

// ─── Rank Journey Bar ─────────────────────────────────────────────────────────

function RankJourneyBar({ quarterlyPoints }: { quarterlyPoints: number }) {
  const tiers = RANK_TIERS.slice(1); // skip Unranked
  const currentTier = calculateRankTier(quarterlyPoints).tier;

  return (
    <div className="flex items-center w-full gap-0.5">
      {tiers.map((t, idx) => {
        const reached = quarterlyPoints >= t.minPoints;
        const isCurrent = currentTier === t.tier;
        const cfg = RANK_VISUAL[t.tier];
        return (
          <div key={t.tier} className="flex items-center flex-1">
            {idx > 0 && (
              <div
                className={`h-1.5 flex-1 rounded-full mx-0.5 transition-all duration-500 ${
                  reached ? cfg.barStyle : "bg-white/20"
                }`}
              />
            )}
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-[16px]
                transition-all duration-300
                ${isCurrent ? `ring-2 ring-offset-2 ring-white/70 scale-125` : ""}
                ${!reached ? "opacity-40" : ""}
              `}
            >
              {t.icon}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Quarter Info ─────────────────────────────────────────────────────────────

function getDaysUntilQuarterEnd(): number {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  const quarterEndMonth = q * 3; // March=3, June=6, Sep=9, Dec=12
  const quarterEnd = new Date(now.getFullYear(), quarterEndMonth, 0); // last day of that month
  const diff = Math.ceil((quarterEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface PlayerProfile {
  totalPoints: number;
  quarterlyPoints: number;
  level: number;
  levelName: string;
  rankTier: string;
  rankIcon: string;
  currentStreak: number;
  longestStreak: number;
  nextLevelPoints: number;
  progressToNextLevel: number;
  nextRankPoints: number;
  progressToNextRank: number;
  rank?: number;
  employeeName?: string;
  badges?: Array<{
    id: string;
    name: string;
    icon: string;
    tier: string;
    earnedAt?: string;
  }>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

function LeaderboardContent() {
  const { employee } = useAuth();

  const [period, setPeriod] = useState<"quarterly" | "alltime">("quarterly");
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const { leaderboard, isLoading } = useLeaderboard(period, branchId);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    const { data } = await supabase.from("branches").select("id, name").order("name");
    setBranches(data || []);
  };

  const openPlayerProfile = useCallback(
    async (employeeId: string) => {
      if (employeeId === employee?.id) return;
      setSelectedPlayer(employeeId);
      setPlayerLoading(true);
      try {
        const [gameProfile, badges] = await Promise.all([
          getEmployeeGameProfile(employeeId),
          getBadgesWithProgress(employeeId),
        ]);
        const { data: emp } = await supabase
          .from("employees")
          .select("name")
          .eq("id", employeeId)
          .maybeSingle();
        setPlayerProfile({
          ...gameProfile,
          employeeName: emp?.name || "",
          badges: badges.filter((b) => b.earned),
        });
      } catch (err) {
        console.error("Error fetching player profile:", err);
      } finally {
        setPlayerLoading(false);
      }
    },
    [employee?.id]
  );

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-[#fbfbfd] pb-20 pt-safe">
      <main className="max-w-[600px] mx-auto px-4 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-[#86868b]" />
            </Link>
            <h1 className="text-[28px] font-bold text-[#1d1d1f]">Leaderboard</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                showHowItWorks ? "bg-[#34c759]/10 text-[#34c759]" : "bg-[#f5f5f7] text-[#86868b]"
              }`}
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                showFilter ? "bg-[#0071e3]/10 text-[#0071e3]" : "bg-[#f5f5f7] text-[#86868b]"
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showHowItWorks && <HowItWorksSection onClose={() => setShowHowItWorks(false)} />}

        {/* Period Tabs */}
        <div className="flex bg-[#f5f5f7] rounded-xl p-1 mb-4">
          <button
            onClick={() => setPeriod("quarterly")}
            className={`flex-1 py-2.5 text-[14px] font-medium rounded-lg transition-all ${
              period === "quarterly" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"
            }`}
          >
            ไตรมาสนี้
          </button>
          <button
            onClick={() => setPeriod("alltime")}
            className={`flex-1 py-2.5 text-[14px] font-medium rounded-lg transition-all ${
              period === "alltime" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"
            }`}
          >
            ตลอดกาล
          </button>
        </div>

        {/* Branch Filter */}
        {showFilter && (
          <div className="mb-4 p-4 bg-white rounded-2xl border border-[#e8e8ed] shadow-sm">
            <p className="text-[13px] font-medium text-[#86868b] mb-2">กรองตามสาขา</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setBranchId(undefined)}
                className={`px-3 py-1.5 text-[13px] rounded-lg transition-all ${
                  !branchId ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"
                }`}
              >
                ทั้งหมด
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBranchId(b.id)}
                  className={`px-3 py-1.5 text-[13px] rounded-lg transition-all ${
                    branchId === b.id ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}


        {/* Leaderboard List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-[#e8e8ed] animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#f5f5f7] rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-[#f5f5f7] rounded w-32 mb-1" />
                    <div className="h-3 bg-[#f5f5f7] rounded w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-[#d2d2d7] mx-auto mb-4" />
            <p className="text-[17px] font-medium text-[#86868b]">ยังไม่มีข้อมูล</p>
            <p className="text-[14px] text-[#d2d2d7] mt-1">เริ่มเช็กอินเพื่อสะสมแต้ม</p>
          </div>
        ) : (
          <>
            {top3.length >= 3 && (
              <div className="flex items-end justify-center gap-3 mb-6 px-2">
                <PodiumCard entry={top3[1]} position={2} period={period} currentUserId={employee?.id} onTap={openPlayerProfile} />
                <PodiumCard entry={top3[0]} position={1} period={period} currentUserId={employee?.id} onTap={openPlayerProfile} />
                <PodiumCard entry={top3[2]} position={3} period={period} currentUserId={employee?.id} onTap={openPlayerProfile} />
              </div>
            )}

            {top3.length < 3 && top3.length > 0 && (
              <div className="space-y-2 mb-4">
                {top3.map((entry) => (
                  <LeaderboardRow
                    key={entry.employeeId}
                    entry={entry}
                    period={period}
                    isCurrentUser={entry.employeeId === employee?.id}
                    onTap={openPlayerProfile}
                  />
                ))}
              </div>
            )}

            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((entry) => (
                  <LeaderboardRow
                    key={entry.employeeId}
                    entry={entry}
                    period={period}
                    isCurrentUser={entry.employeeId === employee?.id}
                    onTap={openPlayerProfile}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <BottomNav />

      {selectedPlayer && (
        <PlayerProfileModal
          profile={playerProfile}
          loading={playerLoading}
          onClose={() => {
            setSelectedPlayer(null);
            setPlayerProfile(null);
          }}
        />
      )}
    </div>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorksSection({ onClose }: { onClose: () => void }) {
  const [expandedSection, setExpandedSection] = useState<string | null>("ranks");

  const sections = [
    {
      id: "ranks",
      title: "Rank ไตรมาส (รีเซตทุก Q1-Q4)",
      icon: <Crown className="w-4 h-4 text-[#ffd700]" />,
      items: RANK_TIERS.slice(1).map((r) => ({
        label: `${r.icon} ${r.tier}`,
        value: `${r.minPoints}+ pts`,
        desc: "",
      })).concat([{
        label: "⟳ รีเซต",
        value: "",
        desc: "คะแนน Rank รีเซตเป็น 0 ทุกต้นไตรมาส (มี.ค., มิ.ย., ก.ย., ธ.ค.) Level ไม่รีเซต",
      }]),
    },
    {
      id: "points",
      title: "การได้แต้ม",
      icon: <Zap className="w-4 h-4 text-[#ff9500]" />,
      items: [
        { label: "เช็กอินตรงเวลา", value: "+5 แต้ม", desc: "" },
        { label: "เช็กอินก่อนเวลา 15 นาที", value: "+2 แต้ม", desc: "" },
        { label: "เข้า-ออกงานครบวัน", value: "+2 แต้ม", desc: "" },
        { label: "ทำ OT สำเร็จ", value: "+10 แต้ม", desc: "" },
        { label: "ไม่ลาทั้งสัปดาห์", value: "+10 แต้ม", desc: "" },
        { label: "โบนัส Streak ทุก 5 วัน", value: "+15 แต้ม", desc: "" },
        { label: "มาสาย", value: "-10 แต้ม", desc: "หักแต้มรายวัน" },
      ],
    },
    {
      id: "levels",
      title: "Level (ถาวร ไม่รีเซต)",
      icon: <TrendingUp className="w-4 h-4 text-[#0071e3]" />,
      items: LEVELS.map((l) => ({
        label: `Lv.${l.level} ${l.name}`,
        value: l.minPoints > 0 ? `${l.minPoints.toLocaleString()} pts` : "เริ่มต้น",
        desc: "",
      })),
    },
    {
      id: "streak",
      title: "Streak",
      icon: <Flame className="w-4 h-4 text-[#ff3b30]" />,
      items: [
        { label: "เพิ่ม Streak", value: "", desc: "เช็กอินตรงเวลาต่อเนื่องทุกวันทำงาน" },
        { label: "Reset Streak", value: "", desc: "มาสายหรือไม่มาทำงาน streak เป็น 0 ทันที" },
      ],
    },
    {
      id: "badges",
      title: "เหรียญ (Badge)",
      icon: <Award className="w-4 h-4 text-[#af52de]" />,
      items: [
        { label: "ได้อัตโนมัติ", value: "", desc: "เมื่อทำตามเงื่อนไขครบ เช่น streak 7 วัน, OT 10 ครั้ง" },
        { label: "โบนัสแต้ม", value: "", desc: "แต่ละเหรียญให้แต้มพิเศษตามระดับ Bronze-Platinum" },
      ],
    },
  ];

  return (
    <div className="mb-4 bg-white rounded-2xl border border-[#e8e8ed] shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[#f5f5f7]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#34c759]" />
            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">ระบบคะแนน</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f5f7]">
            <X className="w-4 h-4 text-[#86868b]" />
          </button>
        </div>
      </div>

      {sections.map((section) => (
        <div key={section.id} className="border-b border-[#f5f5f7] last:border-b-0">
          <button
            onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-[#f5f5f7]/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {section.icon}
              <span className="text-[14px] font-medium text-[#1d1d1f]">{section.title}</span>
            </div>
            {expandedSection === section.id ? (
              <ChevronUp className="w-4 h-4 text-[#86868b]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#86868b]" />
            )}
          </button>
          {expandedSection === section.id && (
            <div className="px-4 pb-4 space-y-2">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 bg-[#f5f5f7]/50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-[#1d1d1f]">{item.label}</span>
                      {item.value && (
                        <span className={`text-[13px] font-bold ml-2 whitespace-nowrap ${item.value.startsWith("-") ? "text-[#ff3b30]" : "text-[#34c759]"}`}>
                          {item.value}
                        </span>
                      )}
                    </div>
                    {item.desc && <p className="text-[11px] text-[#86868b] mt-0.5">{item.desc}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Player Profile Modal ─────────────────────────────────────────────────────

function PlayerProfileModal({
  profile,
  loading,
  onClose,
}: {
  profile: PlayerProfile | null;
  loading: boolean;
  onClose: () => void;
}) {
  const nextLevel = profile ? LEVELS.find((l) => l.level === profile.level + 1) : null;
  const cfg = profile ? RANK_VISUAL[profile.rankTier] || RANK_VISUAL.Unranked : RANK_VISUAL.Unranked;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-[600px] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#d2d2d7] rounded-full" />
        </div>

        {loading || !profile ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-[#f5f5f7] rounded-full mx-auto mb-4 animate-pulse" />
            <div className="h-5 bg-[#f5f5f7] rounded w-32 mx-auto mb-2 animate-pulse" />
            <div className="h-4 bg-[#f5f5f7] rounded w-20 mx-auto animate-pulse" />
          </div>
        ) : (
          <>
            {/* Rank Header Banner */}
            <div className={`bg-gradient-to-br ${cfg.cardBg} px-6 pt-4 pb-6 text-white ${cfg.glow}`}>
              <div className="flex flex-col items-center text-center">
                <Avatar name={profile.employeeName || ""} size="lg" />
                <h3 className="text-[20px] font-bold mt-3">{profile.employeeName}</h3>
                <p className="text-[13px] text-white/70 mb-3">Lv.{profile.level} {profile.levelName}</p>

                {/* Big Rank Badge */}
                <RankBadge tier={profile.rankTier} size="xl" />

                {/* Rank Journey inside header */}
                <div className="w-full mt-4">
                  <RankJourneyBar quarterlyPoints={profile.quarterlyPoints} />
                </div>
                {profile.nextRankPoints > 0 && (
                  <p className="text-[11px] text-white/60 mt-2">
                    อีก {profile.nextRankPoints - profile.quarterlyPoints} pts ถึงขั้นถัดไป
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 pb-8 pt-5">
              {/* Level progress */}
              <div className="mb-5">
                <div className="flex justify-between text-[12px] text-[#86868b] mb-1.5">
                  <span className="font-medium text-[#1d1d1f]">Level Progress</span>
                  <span>{profile.totalPoints.toLocaleString()} / {nextLevel ? nextLevel.minPoints.toLocaleString() : "Max"} pts</span>
                </div>
                <div className="h-2.5 bg-[#f5f5f7] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0071e3] to-[#34c759] rounded-full transition-all duration-500"
                    style={{ width: `${profile.progressToNextLevel}%` }}
                  />
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                <div className="bg-[#f5f5f7] rounded-2xl p-3 text-center">
                  <Trophy className="w-4 h-4 text-[#ffd700] mx-auto mb-1" />
                  <p className="text-[16px] font-bold text-[#1d1d1f]">#{profile.rank}</p>
                  <p className="text-[10px] text-[#86868b]">อันดับ</p>
                </div>
                <div className="bg-[#f5f5f7] rounded-2xl p-3 text-center">
                  <TrendingUp className="w-4 h-4 text-[#0071e3] mx-auto mb-1" />
                  <p className="text-[16px] font-bold text-[#1d1d1f]">{profile.quarterlyPoints}</p>
                  <p className="text-[10px] text-[#86868b]">ไตรมาส</p>
                </div>
                <div className="bg-[#f5f5f7] rounded-2xl p-3 text-center">
                  <Flame className="w-4 h-4 text-[#ff9500] mx-auto mb-1" />
                  <p className="text-[16px] font-bold text-[#1d1d1f]">{profile.currentStreak}</p>
                  <p className="text-[10px] text-[#86868b]">Streak</p>
                </div>
                <div className="bg-[#f5f5f7] rounded-2xl p-3 text-center">
                  <Star className="w-4 h-4 text-[#ffd700] mx-auto mb-1" />
                  <p className="text-[16px] font-bold text-[#1d1d1f]">{profile.longestStreak}</p>
                  <p className="text-[10px] text-[#86868b]">Best</p>
                </div>
              </div>

              {/* Badges */}
              {profile.badges && profile.badges.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-[14px] font-semibold text-[#1d1d1f] mb-3">เหรียญ ({profile.badges.length})</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {profile.badges.map((badge) => (
                      <div key={badge.id} className="bg-[#f5f5f7] rounded-xl p-2.5 text-center">
                        <span className="text-[24px] block mb-1">{badge.icon}</span>
                        <p className="text-[10px] font-medium text-[#1d1d1f] leading-tight truncate">{badge.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 bg-[#f5f5f7] rounded-xl text-[14px] font-medium text-[#86868b] active:bg-[#e8e8ed] transition-colors"
              >
                ปิด
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Podium Card ──────────────────────────────────────────────────────────────

function PodiumCard({
  entry,
  position,
  period,
  currentUserId,
  onTap,
}: {
  entry: any;
  position: number;
  period: "quarterly" | "alltime";
  currentUserId?: string;
  onTap: (employeeId: string) => void;
}) {
  const isMe = entry.employeeId === currentUserId;
  const height = position === 1 ? "h-28" : position === 2 ? "h-20" : "h-16";
  const points = period === "quarterly" ? entry.quarterlyPoints : entry.totalPoints;
  const cfg = RANK_VISUAL[entry.rankTier] || RANK_VISUAL.Unranked;

  const podiumBg = [
    "bg-gradient-to-br from-[#ffd700]/20 to-[#daa520]/10 border-[#ffd700]/30",
    "bg-gradient-to-br from-[#c0c0c0]/20 to-[#808080]/10 border-[#c0c0c0]/30",
    "bg-gradient-to-br from-[#cd7f32]/20 to-[#a0522d]/10 border-[#cd7f32]/30",
  ];
  const positionBg = ["bg-[#ffd700]", "bg-[#9ca3af]", "bg-[#cd7f32]"];

  return (
    <div
      className={`flex-1 flex flex-col items-center cursor-pointer ${
        position === 1 ? "order-2" : position === 2 ? "order-1" : "order-3"
      }`}
      onClick={() => onTap(entry.employeeId)}
    >
      <div className="relative mb-2">
        <Avatar name={entry.employeeName} size={position === 1 ? "lg" : "md"} />
        <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${positionBg[position - 1]}`}>
          <span className="text-[11px] font-bold text-white">{position}</span>
        </div>
      </div>
      <p className={`text-[13px] font-semibold text-center mb-0.5 truncate max-w-full ${isMe ? "text-[#0071e3]" : "text-[#1d1d1f]"}`}>
        {entry.employeeName.split(" ")[0]}
      </p>
      {/* Rank badge */}
      {entry.rankTier && entry.rankTier !== "Unranked" && (
        <span className={`text-[10px] font-bold mb-1 ${cfg.badgeText}`}>
          {cfg.icon} {entry.rankTier}
        </span>
      )}
      <p className="text-[11px] text-[#86868b] mb-1">{points.toLocaleString()} pts</p>
      <div className={`w-full ${height} rounded-t-xl ${podiumBg[position - 1]} border flex items-center justify-center`}>
        {position === 1 ? (
          <Crown className="w-6 h-6 text-[#ffd700]" />
        ) : (
          <Medal className={`w-5 h-5 ${position === 2 ? "text-[#9ca3af]" : "text-[#cd7f32]"}`} />
        )}
      </div>
    </div>
  );
}

// ─── Leaderboard Row ──────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  period,
  isCurrentUser,
  onTap,
}: {
  entry: any;
  period: "quarterly" | "alltime";
  isCurrentUser: boolean;
  onTap: (employeeId: string) => void;
}) {
  const points = period === "quarterly" ? entry.quarterlyPoints : entry.totalPoints;
  const cfg = RANK_VISUAL[entry.rankTier] || RANK_VISUAL.Unranked;

  return (
    <div
      onClick={() => onTap(entry.employeeId)}
      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
        isCurrentUser
          ? "bg-[#0071e3]/5 border-[#0071e3]/20"
          : "bg-white border-[#e8e8ed] hover:border-[#d2d2d7]"
      }`}
    >
      <div className="w-8 text-center">
        <span className={`text-[16px] font-bold ${isCurrentUser ? "text-[#0071e3]" : "text-[#86868b]"}`}>
          {entry.rank}
        </span>
      </div>

      <Avatar name={entry.employeeName} size="sm" />

      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-medium truncate ${isCurrentUser ? "text-[#0071e3]" : "text-[#1d1d1f]"}`}>
          {entry.employeeName}
          {isCurrentUser && <span className="text-[11px] text-[#0071e3]/60 ml-1">(คุณ)</span>}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-[#86868b]">
          <span>Lv.{entry.level}</span>
          {entry.currentStreak > 0 && (
            <span className="flex items-center gap-0.5">
              <Flame className="w-3 h-3 text-[#ff9500]" />
              {entry.currentStreak}
            </span>
          )}
          {entry.badgeCount > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-[#ffd700]" />
              {entry.badgeCount}
            </span>
          )}
        </div>
      </div>

      {/* Rank badge - prominent right side */}
      <div className="flex flex-col items-end gap-1">
        {entry.rankTier && entry.rankTier !== "Unranked" && (
          <RankBadge tier={entry.rankTier} size="sm" />
        )}
        <div className="text-right">
          <p className={`text-[16px] font-bold ${isCurrentUser ? "text-[#0071e3]" : "text-[#1d1d1f]"}`}>
            {points.toLocaleString()}
          </p>
          <p className="text-[10px] text-[#86868b]">pts</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  return (
    <ProtectedRoute>
      <LeaderboardContent />
    </ProtectedRoute>
  );
}
