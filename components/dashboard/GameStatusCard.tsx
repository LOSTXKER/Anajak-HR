"use client";

import Link from "next/link";
import { Trophy, Flame, Star, ChevronRight, TrendingUp, RotateCcw } from "lucide-react";
import { useGameProfile } from "@/lib/hooks/use-gamification";
import { LEVELS, RANK_TIERS, calculateRankTier } from "@/lib/services/gamification.service";

const RANK_CARD_STYLE: Record<string, { bg: string; bar: string; glow: string; accent: string; badgeBg: string; badgeText: string }> = {
  Unranked: {
    bg: "from-[#48484a] to-[#1d1d1f]",
    bar: "bg-[#86868b]",
    glow: "",
    accent: "#86868b",
    badgeBg: "bg-white/10",
    badgeText: "text-white/60",
  },
  Bronze: {
    bg: "from-[#7c3a0d] via-[#5a2d0c] to-[#1d1209]",
    bar: "bg-gradient-to-r from-[#cd7f32] to-[#b8860b]",
    glow: "shadow-[0_4px_20px_rgba(205,127,50,0.4)]",
    accent: "#e8951a",
    badgeBg: "bg-[#cd7f32]/20",
    badgeText: "text-[#e8951a]",
  },
  Silver: {
    bg: "from-[#374151] via-[#1f2937] to-[#111827]",
    bar: "bg-gradient-to-r from-[#d1d5db] to-[#9ca3af]",
    glow: "shadow-[0_4px_20px_rgba(156,163,175,0.35)]",
    accent: "#d1d5db",
    badgeBg: "bg-[#9ca3af]/20",
    badgeText: "text-[#d1d5db]",
  },
  Gold: {
    bg: "from-[#78350f] via-[#451a03] to-[#1c0a00]",
    bar: "bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]",
    glow: "shadow-[0_4px_24px_rgba(251,191,36,0.5)]",
    accent: "#fbbf24",
    badgeBg: "bg-[#fbbf24]/20",
    badgeText: "text-[#fbbf24]",
  },
  Platinum: {
    bg: "from-[#1e3a5f] via-[#1e1b4b] to-[#0a0a1a]",
    bar: "bg-gradient-to-r from-[#38bdf8] to-[#818cf8]",
    glow: "shadow-[0_4px_28px_rgba(56,189,248,0.45)]",
    accent: "#7dd3f0",
    badgeBg: "bg-[#38bdf8]/20",
    badgeText: "text-[#7dd3f0]",
  },
  Diamond: {
    bg: "from-[#4a044e] via-[#1e1b4b] to-[#0c4a6e]",
    bar: "bg-gradient-to-r from-[#e879f9] via-[#818cf8] to-[#38bdf8]",
    glow: "shadow-[0_4px_32px_rgba(232,121,249,0.55)]",
    accent: "#e879f9",
    badgeBg: "bg-[#e879f9]/20",
    badgeText: "text-[#e879f9]",
  },
};

const RANK_ICONS: Record<string, string> = {
  Unranked: "⬜",
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🥇",
  Platinum: "💎",
  Diamond: "👑",
};

function getDaysUntilQuarterEnd(): number {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  const quarterEndMonth = q * 3;
  const quarterEnd = new Date(now.getFullYear(), quarterEndMonth, 0);
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
  const style = RANK_CARD_STYLE[rankTier] || RANK_CARD_STYLE.Unranked;
  const rankIcon = RANK_ICONS[rankTier] || "⬜";
  const nextLevel = LEVELS.find((l) => l.level === profile.level + 1);

  // Progress ring segments for tier journey
  const activeTiers = RANK_TIERS.slice(1);

  return (
    <Link href="/leaderboard">
      <div
        className={`bg-gradient-to-br ${style.bg} rounded-2xl p-5 mb-4 text-white hover:opacity-95 transition-all active:scale-[0.98] ${style.glow}`}
      >
        {/* Top: Level + Rank */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-[#ffd700]" />
              <span className="text-[12px] text-white/60">Level {profile.level} · {profile.levelName}</span>
            </div>
            {/* Rank Tier - prominent */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${style.badgeBg}`}>
              <span className="text-[20px] leading-none">{rankIcon}</span>
              <div>
                <p className={`text-[16px] font-bold leading-tight ${style.badgeText}`}>{rankTier}</p>
                <p className="text-[10px] text-white/50">Rank ไตรมาสนี้</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {profile.rank && (
              <div className="px-2.5 py-1 bg-white/10 rounded-lg">
                <span className="text-[13px] font-bold text-white">#{profile.rank}</span>
              </div>
            )}
            <ChevronRight className="w-4 h-4 text-white/40" />
          </div>
        </div>

        {/* Rank Journey Dots */}
        <div className="flex items-center gap-1 mb-3">
          {activeTiers.map((t, idx) => {
            const reached = profile.quarterlyPoints >= t.minPoints;
            const isCurrent = rankTier === t.tier;
            return (
              <div key={t.tier} className="flex items-center flex-1">
                {idx > 0 && (
                  <div
                    className={`h-1 flex-1 rounded-full mx-0.5 transition-all ${
                      reached ? style.bar : "bg-white/10"
                    }`}
                  />
                )}
                <span
                  className={`text-[15px] transition-all duration-300 ${
                    isCurrent ? "scale-125 drop-shadow-sm" : ""
                  } ${!reached ? "opacity-20 grayscale" : ""}`}
                >
                  {RANK_ICONS[t.tier]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Rank progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[11px] text-white/50 mb-1.5">
            <span>{profile.quarterlyPoints} pts ไตรมาสนี้</span>
            <span className="flex items-center gap-1">
              <RotateCcw className="w-2.5 h-2.5" />
              {daysLeft} วัน
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full ${style.bar} rounded-full transition-all duration-700`}
              style={{ width: `${profile.progressToNextRank}%` }}
            />
          </div>
          {profile.nextRankPoints > 0 && (
            <p className="text-[10px] text-white/40 mt-1">
              อีก {profile.nextRankPoints - profile.quarterlyPoints} pts ถึง {
                RANK_TIERS.find((t) => t.minPoints === profile.nextRankPoints)?.tier
              }
            </p>
          )}
        </div>

        {/* Level progress */}
        <div className="mb-4">
          <div className="flex justify-between text-[11px] text-white/40 mb-1">
            <span>Lv.{profile.level} Progress</span>
            {nextLevel && <span>{profile.totalPoints.toLocaleString()} / {nextLevel.minPoints.toLocaleString()}</span>}
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#0071e3] to-[#34c759] rounded-full transition-all duration-500"
              style={{ width: `${profile.progressToNextLevel}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/8 rounded-xl p-2.5 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1" style={{ color: style.accent }} />
            <p className="text-[15px] font-bold">{profile.quarterlyPoints}</p>
            <p className="text-[10px] text-white/50">ไตรมาส</p>
          </div>
          <div className="bg-white/8 rounded-xl p-2.5 text-center">
            <Flame className="w-4 h-4 text-[#ff9500] mx-auto mb-1" />
            <p className="text-[15px] font-bold">{profile.currentStreak}</p>
            <p className="text-[10px] text-white/50">Streak</p>
          </div>
          <div className="bg-white/8 rounded-xl p-2.5 text-center">
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
  );
}
