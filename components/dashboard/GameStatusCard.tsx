"use client";

import Link from "next/link";
import { Trophy, Flame, Star, ChevronRight, TrendingUp } from "lucide-react";
import { useGameProfile } from "@/lib/hooks/use-gamification";
import { LEVELS } from "@/lib/services/gamification.service";

const TIER_COLORS: Record<string, string> = {
  bronze: "from-[#cd7f32] to-[#a0522d]",
  silver: "from-[#c0c0c0] to-[#808080]",
  gold: "from-[#ffd700] to-[#daa520]",
  platinum: "from-[#e5e4e2] to-[#b0b0b0]",
};

export function GameStatusCard() {
  const { profile, isLoading } = useGameProfile();

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

  const nextLevel = LEVELS.find((l) => l.level === profile.level + 1);

  return (
    <Link href="/leaderboard">
      <div className="bg-gradient-to-br from-[#1d1d1f] to-[#2d2d2f] rounded-2xl p-5 mb-4 shadow-lg text-white hover:shadow-xl transition-all active:scale-[0.98]">
        {/* Top row: Level & Rank */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#ffd700]" />
            </div>
            <div>
              <p className="text-[11px] text-white/60 font-medium">Level {profile.level}</p>
              <p className="text-[15px] font-semibold">{profile.levelName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {profile.rank && (
              <div className="px-2.5 py-1 bg-white/10 rounded-lg">
                <span className="text-[12px] font-medium text-white/80">#{profile.rank}</span>
              </div>
            )}
            <ChevronRight className="w-4 h-4 text-white/40" />
          </div>
        </div>

        {/* Level progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[11px] text-white/50 mb-1.5">
            <span>{profile.totalPoints.toLocaleString()} pts</span>
            {nextLevel && <span>{nextLevel.minPoints.toLocaleString()} pts</span>}
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#0071e3] to-[#34c759] rounded-full transition-all duration-500"
              style={{ width: `${profile.progressToNextLevel}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Quarterly Points */}
          <div className="bg-white/8 rounded-xl p-2.5 text-center">
            <TrendingUp className="w-4 h-4 text-[#0071e3] mx-auto mb-1" />
            <p className="text-[16px] font-bold">{profile.quarterlyPoints}</p>
            <p className="text-[10px] text-white/50">ไตรมาส</p>
          </div>

          {/* Streak */}
          <div className="bg-white/8 rounded-xl p-2.5 text-center">
            <Flame className="w-4 h-4 text-[#ff9500] mx-auto mb-1" />
            <p className="text-[16px] font-bold">{profile.currentStreak}</p>
            <p className="text-[10px] text-white/50">Streak</p>
          </div>

          {/* Latest Badge */}
          <div className="bg-white/8 rounded-xl p-2.5 text-center">
            {profile.recentBadges.length > 0 ? (
              <>
                <span className="text-[16px] block mb-0.5">{profile.recentBadges[0].icon}</span>
                <p className="text-[10px] text-white/50 truncate">{profile.recentBadges[0].name}</p>
              </>
            ) : (
              <>
                <Star className="w-4 h-4 text-white/30 mx-auto mb-1" />
                <p className="text-[10px] text-white/50">ไม่มีเหรียญ</p>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
