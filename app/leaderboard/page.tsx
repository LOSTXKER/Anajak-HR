"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { Avatar } from "@/components/ui/Avatar";
import { useLeaderboard, useGameProfile } from "@/lib/hooks/use-gamification";
import { supabase } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Trophy,
  Flame,
  Medal,
  Crown,
  Star,
  Filter,
  TrendingUp,
} from "lucide-react";

const TIER_MEDAL_COLORS = ["text-[#ffd700]", "text-[#c0c0c0]", "text-[#cd7f32]"];
const TIER_BG_COLORS = [
  "bg-gradient-to-br from-[#ffd700]/20 to-[#daa520]/10 border-[#ffd700]/30",
  "bg-gradient-to-br from-[#c0c0c0]/20 to-[#808080]/10 border-[#c0c0c0]/30",
  "bg-gradient-to-br from-[#cd7f32]/20 to-[#a0522d]/10 border-[#cd7f32]/30",
];

function LeaderboardContent() {
  const { employee } = useAuth();
  const router = useRouter();

  const [period, setPeriod] = useState<"monthly" | "alltime">("monthly");
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [showFilter, setShowFilter] = useState(false);

  const { leaderboard, isLoading } = useLeaderboard(period, branchId);
  const { profile } = useGameProfile();

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from("branches")
      .select("id, name")
      .order("name");
    setBranches(data || []);
  };

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-[#fbfbfd] pb-20 pt-safe">
      <main className="max-w-[600px] mx-auto px-4 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-[#86868b]" />
            </Link>
            <h1 className="text-[28px] font-bold text-[#1d1d1f]">Leaderboard</h1>
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              showFilter ? "bg-[#0071e3]/10 text-[#0071e3]" : "bg-[#f5f5f7] text-[#86868b]"
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Period Tabs */}
        <div className="flex bg-[#f5f5f7] rounded-xl p-1 mb-4">
          <button
            onClick={() => setPeriod("monthly")}
            className={`flex-1 py-2.5 text-[14px] font-medium rounded-lg transition-all ${
              period === "monthly"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#86868b]"
            }`}
          >
            เดือนนี้
          </button>
          <button
            onClick={() => setPeriod("alltime")}
            className={`flex-1 py-2.5 text-[14px] font-medium rounded-lg transition-all ${
              period === "alltime"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#86868b]"
            }`}
          >
            ตลอดกาล
          </button>
        </div>

        {/* Branch Filter */}
        {showFilter && (
          <div className="mb-4 p-4 bg-white rounded-2xl border border-[#e8e8ed] shadow-sm animate-fade-in">
            <p className="text-[13px] font-medium text-[#86868b] mb-2">กรองตามสาขา</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setBranchId(undefined)}
                className={`px-3 py-1.5 text-[13px] rounded-lg transition-all ${
                  !branchId
                    ? "bg-[#0071e3] text-white"
                    : "bg-[#f5f5f7] text-[#1d1d1f]"
                }`}
              >
                ทั้งหมด
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBranchId(b.id)}
                  className={`px-3 py-1.5 text-[13px] rounded-lg transition-all ${
                    branchId === b.id
                      ? "bg-[#0071e3] text-white"
                      : "bg-[#f5f5f7] text-[#1d1d1f]"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* My Stats */}
        {profile && (
          <div className="bg-gradient-to-r from-[#0071e3] to-[#34c759] rounded-2xl p-4 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={employee?.name || ""} size="md" />
                <div>
                  <p className="text-[14px] font-semibold">{employee?.name}</p>
                  <p className="text-[12px] text-white/80">
                    Lv.{profile.level} {profile.levelName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[20px] font-bold">
                  #{profile.rank}
                </p>
                <p className="text-[11px] text-white/80">
                  {period === "monthly" ? profile.monthlyPoints : profile.totalPoints} pts
                </p>
              </div>
            </div>
          </div>
        )}

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
            {/* Top 3 Podium */}
            {top3.length >= 3 && (
              <div className="flex items-end justify-center gap-3 mb-6 px-2">
                {/* 2nd place */}
                <PodiumCard entry={top3[1]} position={2} currentUserId={employee?.id} />
                {/* 1st place */}
                <PodiumCard entry={top3[0]} position={1} currentUserId={employee?.id} />
                {/* 3rd place */}
                <PodiumCard entry={top3[2]} position={3} currentUserId={employee?.id} />
              </div>
            )}

            {/* If less than 3, show as list */}
            {top3.length < 3 && top3.length > 0 && (
              <div className="space-y-2 mb-4">
                {top3.map((entry) => (
                  <LeaderboardRow
                    key={entry.employeeId}
                    entry={entry}
                    period={period}
                    isCurrentUser={entry.employeeId === employee?.id}
                  />
                ))}
              </div>
            )}

            {/* Rest of leaderboard */}
            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((entry) => (
                  <LeaderboardRow
                    key={entry.employeeId}
                    entry={entry}
                    period={period}
                    isCurrentUser={entry.employeeId === employee?.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function PodiumCard({
  entry,
  position,
  currentUserId,
}: {
  entry: any;
  position: number;
  currentUserId?: string;
}) {
  const isMe = entry.employeeId === currentUserId;
  const height = position === 1 ? "h-28" : position === 2 ? "h-20" : "h-16";
  const size = position === 1 ? "w-16 h-16" : "w-12 h-12";
  const iconSize = position === 1 ? "w-6 h-6" : "w-5 h-5";

  return (
    <div className={`flex-1 flex flex-col items-center ${position === 1 ? "order-2" : position === 2 ? "order-1" : "order-3"}`}>
      <div className="relative mb-2">
        <Avatar name={entry.employeeName} size={position === 1 ? "lg" : "md"} />
        <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
          position === 1 ? "bg-[#ffd700]" : position === 2 ? "bg-[#c0c0c0]" : "bg-[#cd7f32]"
        }`}>
          <span className="text-[11px] font-bold text-white">{position}</span>
        </div>
      </div>
      <p className={`text-[13px] font-semibold text-center mb-0.5 truncate max-w-full ${isMe ? "text-[#0071e3]" : "text-[#1d1d1f]"}`}>
        {entry.employeeName.split(" ")[0]}
      </p>
      <p className="text-[11px] text-[#86868b] mb-1">{entry.monthlyPoints} pts</p>
      <div className={`w-full ${height} rounded-t-xl ${TIER_BG_COLORS[position - 1]} border flex items-center justify-center`}>
        {position === 1 ? (
          <Crown className={`${iconSize} text-[#ffd700]`} />
        ) : (
          <Medal className={`${iconSize} ${TIER_MEDAL_COLORS[position - 1]}`} />
        )}
      </div>
    </div>
  );
}

function LeaderboardRow({
  entry,
  period,
  isCurrentUser,
}: {
  entry: any;
  period: "monthly" | "alltime";
  isCurrentUser: boolean;
}) {
  const points = period === "monthly" ? entry.monthlyPoints : entry.totalPoints;

  return (
    <div
      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
        isCurrentUser
          ? "bg-[#0071e3]/5 border-[#0071e3]/20"
          : "bg-white border-[#e8e8ed]"
      }`}
    >
      {/* Rank */}
      <div className="w-8 text-center">
        <span className={`text-[16px] font-bold ${isCurrentUser ? "text-[#0071e3]" : "text-[#86868b]"}`}>
          {entry.rank}
        </span>
      </div>

      {/* Avatar */}
      <Avatar name={entry.employeeName} size="sm" />

      {/* Info */}
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

      {/* Points */}
      <div className="text-right">
        <p className={`text-[16px] font-bold ${isCurrentUser ? "text-[#0071e3]" : "text-[#1d1d1f]"}`}>
          {points.toLocaleString()}
        </p>
        <p className="text-[10px] text-[#86868b]">pts</p>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <ProtectedRoute>
      <LeaderboardContent />
    </ProtectedRoute>
  );
}
