"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { Avatar } from "@/components/ui/Avatar";
import { useLeaderboard, useGameProfile } from "@/lib/hooks/use-gamification";
import { supabase } from "@/lib/supabase/client";
import { LEVELS } from "@/lib/services/gamification.service";
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

const TIER_MEDAL_COLORS = ["text-[#ffd700]", "text-[#c0c0c0]", "text-[#cd7f32]"];
const TIER_BG_COLORS = [
  "bg-gradient-to-br from-[#ffd700]/20 to-[#daa520]/10 border-[#ffd700]/30",
  "bg-gradient-to-br from-[#c0c0c0]/20 to-[#808080]/10 border-[#c0c0c0]/30",
  "bg-gradient-to-br from-[#cd7f32]/20 to-[#a0522d]/10 border-[#cd7f32]/30",
];

interface PlayerProfile {
  totalPoints: number;
  monthlyPoints: number;
  level: number;
  levelName: string;
  currentStreak: number;
  longestStreak: number;
  nextLevelPoints: number;
  progressToNextLevel: number;
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

function LeaderboardContent() {
  const { employee } = useAuth();

  const [period, setPeriod] = useState<"monthly" | "alltime">("monthly");
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);

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

  const openPlayerProfile = useCallback(async (employeeId: string) => {
    if (employeeId === employee?.id) return;
    setSelectedPlayer(employeeId);
    setPlayerLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/gamification/profile?employeeId=${employeeId}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      if (res.ok) {
        setPlayerProfile(await res.json());
      }
    } catch (err) {
      console.error("Error fetching player profile:", err);
    } finally {
      setPlayerLoading(false);
    }
  }, [employee?.id]);

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
          <div className="flex gap-2">
            <button
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                showHowItWorks ? "bg-[#34c759]/10 text-[#34c759]" : "bg-[#f5f5f7] text-[#86868b]"
              }`}
              aria-label="วิธีการคำนวณ"
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                showFilter ? "bg-[#0071e3]/10 text-[#0071e3]" : "bg-[#f5f5f7] text-[#86868b]"
              }`}
              aria-label="กรองตามสาขา"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* How It Works Section */}
        {showHowItWorks && <HowItWorksSection onClose={() => setShowHowItWorks(false)} />}

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

      {/* Player Profile Modal */}
      {selectedPlayer && (
        <PlayerProfileModal
          profile={playerProfile}
          loading={playerLoading}
          onClose={() => { setSelectedPlayer(null); setPlayerProfile(null); }}
        />
      )}
    </div>
  );
}

// ============================================
// How It Works Section
// ============================================

function HowItWorksSection({ onClose }: { onClose: () => void }) {
  const [expandedSection, setExpandedSection] = useState<string | null>("points");

  const sections = [
    {
      id: "points",
      title: "การได้แต้ม",
      icon: <Zap className="w-4 h-4 text-[#ff9500]" />,
      items: [
        { label: "เช็กอินตรงเวลา", value: "+10 แต้ม", desc: "เช็กอินก่อนเวลาเริ่มงาน + เวลาผ่อนผัน" },
        { label: "เช็กอินก่อนเวลา (15 นาที)", value: "+5 แต้ม", desc: "มาก่อนเวลาเริ่มงาน 15 นาทีขึ้นไป" },
        { label: "เข้า-ออกงานครบวัน", value: "+5 แต้ม", desc: "เช็กอินและเช็กเอาท์ครบในวันเดียวกัน" },
        { label: "ทำ OT สำเร็จ", value: "+15 แต้ม", desc: "ทำ OT จนเสร็จตามที่ขออนุมัติ" },
        { label: "ไม่ลาทั้งสัปดาห์", value: "+20 แต้ม", desc: "มาทำงานครบทุกวันทำงานในสัปดาห์" },
        { label: "โบนัส Streak ทุก 5 วัน", value: "+25 แต้ม", desc: "เช็กอินตรงเวลาต่อเนื่อง 5, 10, 15... วัน" },
        { label: "มาสาย", value: "-5 แต้ม", desc: "เช็กอินหลังเวลาเริ่มงาน + เวลาผ่อนผัน" },
      ],
    },
    {
      id: "streak",
      title: "Streak (ต่อเนื่อง)",
      icon: <Flame className="w-4 h-4 text-[#ff3b30]" />,
      items: [
        { label: "เพิ่ม Streak", value: "", desc: "เช็กอินตรงเวลาทุกวันทำงาน (จันทร์-เสาร์) streak จะเพิ่มขึ้นเรื่อยๆ ข้ามวันอาทิตย์ได้โดยไม่ขาด" },
        { label: "Reset Streak", value: "", desc: "ถ้ามาสายหรือไม่มาทำงานในวันทำงาน streak จะ reset เป็น 0 ทันที" },
        { label: "Streak สูงสุด", value: "", desc: "ระบบจะบันทึก streak สูงสุดที่เคยทำได้ไว้ด้วย" },
      ],
    },
    {
      id: "levels",
      title: "ระดับ (Level)",
      icon: <TrendingUp className="w-4 h-4 text-[#0071e3]" />,
      items: LEVELS.map((l) => ({
        label: `Lv.${l.level} ${l.name}`,
        value: l.minPoints > 0 ? `${l.minPoints.toLocaleString()} แต้ม` : "เริ่มต้น",
        desc: "",
      })),
    },
    {
      id: "badges",
      title: "เหรียญ (Badge)",
      icon: <Award className="w-4 h-4 text-[#af52de]" />,
      items: [
        { label: "เหรียญจะได้รับอัตโนมัติ", value: "", desc: "เมื่อคุณทำตามเงื่อนไขครบ เช่น เช็กอินตรงเวลา 5 ครั้ง, streak 7 วัน, ทำ OT 10 ครั้ง" },
        { label: "ดูเหรียญทั้งหมดได้ที่", value: "", desc: "โปรไฟล์ > แท็บเหรียญ จะเห็นเหรียญที่ได้แล้วและเหรียญที่ยังไม่ได้พร้อมความคืบหน้า" },
        { label: "แต่ละเหรียญมีแต้มโบนัส", value: "", desc: "เมื่อได้เหรียญจะได้แต้มเพิ่มตามระดับ Bronze, Silver, Gold, Platinum" },
      ],
    },
  ];

  return (
    <div className="mb-4 bg-white rounded-2xl border border-[#e8e8ed] shadow-sm overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-[#f5f5f7]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#34c759]" />
            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">ระบบคำนวณแต้ม</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f5f7]">
            <X className="w-4 h-4 text-[#86868b]" />
          </button>
        </div>
        <p className="text-[12px] text-[#86868b] mt-1">
          แต้มคำนวณจากการเช็กอิน, OT, และ streak อัตโนมัติ
        </p>
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
                        <span className={`text-[13px] font-bold ml-2 whitespace-nowrap ${
                          item.value.startsWith("-") ? "text-[#ff3b30]" : "text-[#34c759]"
                        }`}>
                          {item.value}
                        </span>
                      )}
                    </div>
                    {item.desc && (
                      <p className="text-[11px] text-[#86868b] mt-0.5">{item.desc}</p>
                    )}
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

// ============================================
// Player Profile Modal
// ============================================

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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-[600px] max-h-[80vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-[#d2d2d7] rounded-full" />
        </div>

        {loading || !profile ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-[#f5f5f7] rounded-full mx-auto mb-4 animate-pulse" />
            <div className="h-5 bg-[#f5f5f7] rounded w-32 mx-auto mb-2 animate-pulse" />
            <div className="h-4 bg-[#f5f5f7] rounded w-20 mx-auto animate-pulse" />
          </div>
        ) : (
          <div className="px-6 pb-8">
            {/* Player header */}
            <div className="text-center mb-6">
              <Avatar name={profile.employeeName || ""} size="lg" />
              <h3 className="text-[20px] font-bold text-[#1d1d1f] mt-3">
                {profile.employeeName}
              </h3>
              <p className="text-[14px] text-[#86868b]">
                Lv.{profile.level} {profile.levelName}
              </p>
            </div>

            {/* Level progress */}
            <div className="mb-6">
              <div className="flex justify-between text-[11px] text-[#86868b] mb-1.5">
                <span>{profile.totalPoints.toLocaleString()} แต้ม</span>
                {nextLevel && <span>{nextLevel.minPoints.toLocaleString()} แต้ม</span>}
              </div>
              <div className="h-2.5 bg-[#f5f5f7] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0071e3] to-[#34c759] rounded-full transition-all"
                  style={{ width: `${profile.progressToNextLevel}%` }}
                />
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-[#f5f5f7] rounded-2xl p-3 text-center">
                <Trophy className="w-4 h-4 text-[#ffd700] mx-auto mb-1" />
                <p className="text-[16px] font-bold text-[#1d1d1f]">#{profile.rank}</p>
                <p className="text-[10px] text-[#86868b]">อันดับ</p>
              </div>
              <div className="bg-[#f5f5f7] rounded-2xl p-3 text-center">
                <TrendingUp className="w-4 h-4 text-[#0071e3] mx-auto mb-1" />
                <p className="text-[16px] font-bold text-[#1d1d1f]">{profile.monthlyPoints}</p>
                <p className="text-[10px] text-[#86868b]">เดือนนี้</p>
              </div>
              <div className="bg-[#f5f5f7] rounded-2xl p-3 text-center">
                <Flame className="w-4 h-4 text-[#ff9500] mx-auto mb-1" />
                <p className="text-[16px] font-bold text-[#1d1d1f]">{profile.currentStreak}</p>
                <p className="text-[10px] text-[#86868b]">Streak</p>
              </div>
              <div className="bg-[#f5f5f7] rounded-2xl p-3 text-center">
                <Flame className="w-4 h-4 text-[#ff3b30] mx-auto mb-1" />
                <p className="text-[16px] font-bold text-[#1d1d1f]">{profile.longestStreak}</p>
                <p className="text-[10px] text-[#86868b]">สูงสุด</p>
              </div>
            </div>

            {/* Earned badges */}
            {profile.badges && profile.badges.length > 0 && (
              <div>
                <h4 className="text-[14px] font-semibold text-[#1d1d1f] mb-3">
                  เหรียญที่ได้รับ ({profile.badges.length})
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {profile.badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-[#f5f5f7] rounded-xl p-2.5 text-center"
                    >
                      <span className="text-[24px] block mb-1">{badge.icon}</span>
                      <p className="text-[10px] font-medium text-[#1d1d1f] leading-tight truncate">
                        {badge.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.badges && profile.badges.length === 0 && (
              <div className="text-center py-4">
                <Star className="w-8 h-8 text-[#d2d2d7] mx-auto mb-2" />
                <p className="text-[13px] text-[#86868b]">ยังไม่มีเหรียญ</p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full mt-6 py-3 bg-[#f5f5f7] rounded-xl text-[14px] font-medium text-[#86868b] active:bg-[#e8e8ed] transition-colors"
            >
              ปิด
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Podium Card
// ============================================

function PodiumCard({
  entry,
  position,
  period,
  currentUserId,
  onTap,
}: {
  entry: any;
  position: number;
  period: "monthly" | "alltime";
  currentUserId?: string;
  onTap: (employeeId: string) => void;
}) {
  const isMe = entry.employeeId === currentUserId;
  const height = position === 1 ? "h-28" : position === 2 ? "h-20" : "h-16";
  const iconSize = position === 1 ? "w-6 h-6" : "w-5 h-5";
  const points = period === "monthly" ? entry.monthlyPoints : entry.totalPoints;

  return (
    <div
      className={`flex-1 flex flex-col items-center cursor-pointer ${position === 1 ? "order-2" : position === 2 ? "order-1" : "order-3"}`}
      onClick={() => onTap(entry.employeeId)}
    >
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
      <p className="text-[11px] text-[#86868b] mb-1">{points.toLocaleString()} pts</p>
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

// ============================================
// Leaderboard Row
// ============================================

function LeaderboardRow({
  entry,
  period,
  isCurrentUser,
  onTap,
}: {
  entry: any;
  period: "monthly" | "alltime";
  isCurrentUser: boolean;
  onTap: (employeeId: string) => void;
}) {
  const points = period === "monthly" ? entry.monthlyPoints : entry.totalPoints;

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
