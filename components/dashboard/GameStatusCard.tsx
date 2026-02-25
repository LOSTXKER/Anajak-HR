"use client";

import Link from "next/link";
import { Trophy, Flame, Star, ChevronRight, TrendingUp, RotateCcw, Zap } from "lucide-react";
import { useGameProfile } from "@/lib/hooks/use-gamification";
import { LEVELS, RANK_TIERS } from "@/lib/services/gamification.service";

// Solid gradient badges → readable on any background
const RANK_STYLE: Record<string, {
  cardBg: string;
  badgeSolid: string;
  badgeText: string;
  barStyle: string;
  glow: string;
  icon: string;
}> = {
  Unranked: {
    cardBg: "from-[#3a3a3c] to-[#1d1d1f]",
    badgeSolid: "bg-[#636366]",
    badgeText: "text-white",
    barStyle: "bg-[#636366]",
    glow: "",
    icon: "🔒",
  },
  Bronze: {
    cardBg: "from-[#92400e] via-[#78350f] to-[#1c0a00]",
    badgeSolid: "bg-gradient-to-r from-[#d97706] to-[#b45309]",
    badgeText: "text-white",
    barStyle: "bg-gradient-to-r from-[#d97706] to-[#b45309]",
    glow: "shadow-[0_4px_20px_rgba(217,119,6,0.5)]",
    icon: "🥉",
  },
  Silver: {
    cardBg: "from-[#374151] via-[#1f2937] to-[#111827]",
    badgeSolid: "bg-gradient-to-r from-[#6b7280] to-[#4b5563]",
    badgeText: "text-white",
    barStyle: "bg-gradient-to-r from-[#9ca3af] to-[#6b7280]",
    glow: "shadow-[0_4px_20px_rgba(107,114,128,0.5)]",
    icon: "🥈",
  },
  Gold: {
    cardBg: "from-[#78350f] via-[#92400e] to-[#1c0a00]",
    badgeSolid: "bg-gradient-to-r from-[#f59e0b] to-[#d97706]",
    badgeText: "text-[#1c0a00]",
    barStyle: "bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]",
    glow: "shadow-[0_4px_24px_rgba(245,158,11,0.6)]",
    icon: "🥇",
  },
  Platinum: {
    cardBg: "from-[#1e3a5f] via-[#1e1b4b] to-[#0a0a1a]",
    badgeSolid: "bg-gradient-to-r from-[#0ea5e9] to-[#6366f1]",
    badgeText: "text-white",
    barStyle: "bg-gradient-to-r from-[#38bdf8] to-[#818cf8]",
    glow: "shadow-[0_4px_28px_rgba(14,165,233,0.55)]",
    icon: "💎",
  },
  Diamond: {
    cardBg: "from-[#581c87] via-[#1e1b4b] to-[#0c4a6e]",
    badgeSolid: "bg-gradient-to-r from-[#d946ef] via-[#818cf8] to-[#22d3ee]",
    badgeText: "text-white",
    barStyle: "bg-gradient-to-r from-[#d946ef] via-[#818cf8] to-[#22d3ee]",
    glow: "shadow-[0_4px_32px_rgba(217,70,239,0.65)]",
    icon: "👑",
  },
};

function getDaysUntilQuarterEnd(): number {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  const quarterEnd = new Date(now.getFullYear(), q * 3, 0);
  return Math.ceil((quarterEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function GameStatusCard() {
  const { profile, isLoading } = useGameProfile();
  const daysLeft = getDaysUntilQuarterEnd();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-[#e8e8ed] animate-pulse">
        <div className="h-5 bg-[#f5f5f7] rounded w-32 mb-3" />
        <div className="h-8 bg-[#f5f5f7] rounded w-24 mb-3" />
        <div className="h-3 bg-[#f5f5f7] rounded w-full" />
      </div>
    );
  }

  if (!profile) return null;

  const rankTier = profile.rankTier || "Unranked";
  const style = RANK_STYLE[rankTier] || RANK_STYLE.Unranked;
  const nextLevel = LEVELS.find((l) => l.level === profile.level + 1);
  const activeTiers = RANK_TIERS.slice(1);

  return (
    <>
    <Link href="/leaderboard">
      <div
        className={`bg-gradient-to-br ${style.cardBg} rounded-2xl p-5 mb-4 text-white hover:opacity-95 transition-all active:scale-[0.98] ${style.glow}`}
      >
        {/* Top row: Level + Rank number */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#ffd700]" />
            <span className="text-[12px] text-white/70">Level {profile.level} · {profile.levelName}</span>
          </div>
          <div className="flex items-center gap-2">
            {profile.rank && (
              <span className="text-[13px] font-bold bg-white/20 px-2.5 py-1 rounded-xl">#{profile.rank}</span>
            )}
            <ChevronRight className="w-4 h-4 text-white/40" />
          </div>
        </div>

        {/* Rank Badge – solid color, always readable */}
        <div className="flex items-center justify-between mb-4">
          <div className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl ${style.badgeSolid} relative overflow-hidden`}>
            {rankTier === "Diamond" && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
            )}
            <span className="text-[22px] leading-none">{style.icon}</span>
            <div>
              <p className={`text-[16px] font-bold leading-tight ${style.badgeText}`}>{rankTier}</p>
              <p className={`text-[9px] font-medium ${style.badgeText} opacity-80`}>Rank ไตรมาสนี้</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-white/60">
            <RotateCcw className="w-3 h-3" />
            {daysLeft} วัน
          </span>
        </div>

        {/* Rank Journey dots */}
        <div className="flex items-center gap-1 mb-3">
          {activeTiers.map((t, idx) => {
            const reached = profile.quarterlyPoints >= t.minPoints;
            const isCurrent = rankTier === t.tier;
            const tStyle = RANK_STYLE[t.tier];
            return (
              <div key={t.tier} className="flex items-center flex-1">
                {idx > 0 && (
                  <div
                    className={`h-1 flex-1 rounded-full mx-0.5 transition-all ${
                      reached ? tStyle.barStyle : "bg-white/15"
                    }`}
                  />
                )}
                <span
                  className={`text-[15px] transition-all duration-300 ${
                    isCurrent ? "scale-125 drop-shadow-sm" : ""
                  } ${!reached ? "opacity-35" : ""}`}
                >
                  {tStyle.icon}
                </span>
              </div>
            );
          })}
        </div>

        {/* Rank progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[11px] text-white/60 mb-1.5">
            <span className="font-medium text-white/80">{profile.quarterlyPoints} pts ไตรมาสนี้</span>
            {profile.nextRankPoints > 0 && (
              <span>อีก {profile.nextRankPoints - profile.quarterlyPoints} pts</span>
            )}
          </div>
          <div className="h-2 bg-white/15 rounded-full overflow-hidden">
            <div
              className={`h-full ${style.barStyle} rounded-full transition-all duration-700`}
              style={{ width: `${profile.progressToNextRank}%` }}
            />
          </div>
        </div>

        {/* Level progress */}
        <div className="mb-4">
          <div className="flex justify-between text-[11px] text-white/45 mb-1">
            <span>Lv.{profile.level} Progress · {profile.totalPoints.toLocaleString()} pts</span>
            {nextLevel && <span>{nextLevel.minPoints.toLocaleString()}</span>}
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#34c759] to-[#0071e3] rounded-full transition-all duration-500"
              style={{ width: `${profile.progressToNextLevel}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 opacity-70" />
            <p className="text-[15px] font-bold">{profile.quarterlyPoints}</p>
            <p className="text-[10px] text-white/50">ไตรมาส</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <Flame className="w-4 h-4 text-[#ff9500] mx-auto mb-1" />
            <p className="text-[15px] font-bold">{profile.currentStreak}</p>
            <p className="text-[10px] text-white/50">Streak</p>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            {profile.recentBadges.length > 0 ? (
              <>
                <span className="text-[15px] block mb-0.5">{profile.recentBadges[0].icon}</span>
                <p className="text-[10px] text-white/50 truncate">{profile.recentBadges[0].name}</p>
              </>
            ) : (
              <>
                <Star className="w-4 h-4 text-white/30 mx-auto mb-1" />
                <p className="text-[10px] text-white/50">เหรียญ</p>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>

    {/* Point History Link */}
    <Link href="/points">
      <div className="bg-white rounded-2xl p-3.5 mb-4 shadow-sm border border-[#e8e8ed] flex items-center justify-between hover:bg-[#f5f5f7] transition-colors active:scale-[0.98]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#ff9500]/10 flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-[#ff9500]" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#1d1d1f]">ประวัติแต้ม</p>
            <p className="text-[11px] text-[#86868b]">ดูที่มาแต้มทั้งหมดของคุณ</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#d2d2d7]" />
      </div>
    </Link>
    </>
  );
}
