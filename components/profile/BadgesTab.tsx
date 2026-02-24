"use client";

import { useState } from "react";
import { useBadges, useGameProfile } from "@/lib/hooks/use-gamification";
import { LEVELS } from "@/lib/services/gamification.service";
import { Trophy, Flame, TrendingUp, Star, X } from "lucide-react";
import type { BadgeWithProgress } from "@/lib/services/gamification.service";

const TIER_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  bronze: { bg: "bg-[#cd7f32]/10", border: "border-[#cd7f32]/30", text: "text-[#cd7f32]" },
  silver: { bg: "bg-[#c0c0c0]/10", border: "border-[#c0c0c0]/30", text: "text-[#808080]" },
  gold: { bg: "bg-[#ffd700]/10", border: "border-[#ffd700]/30", text: "text-[#b8860b]" },
  platinum: { bg: "bg-[#af52de]/10", border: "border-[#af52de]/30", text: "text-[#af52de]" },
};

const CATEGORY_LABELS: Record<string, string> = {
  attendance: "การเข้างาน",
  punctuality: "ตรงเวลา",
  ot: "OT",
  streak: "Streak",
  special: "พิเศษ",
};

export function BadgesTab() {
  const { badges, isLoading } = useBadges();
  const { profile } = useGameProfile();
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithProgress | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-[#e8e8ed] animate-pulse">
              <div className="w-10 h-10 bg-[#f5f5f7] rounded-full mx-auto mb-2" />
              <div className="h-3 bg-[#f5f5f7] rounded w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const categories = ["all", ...new Set(badges.map((b) => b.category))];
  const filteredBadges = activeCategory === "all" ? badges : badges.filter((b) => b.category === activeCategory);
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {profile && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-3 border border-[#e8e8ed] text-center">
            <Trophy className="w-5 h-5 text-[#ffd700] mx-auto mb-1" />
            <p className="text-[18px] font-bold text-[#1d1d1f]">Lv.{profile.level}</p>
            <p className="text-[11px] text-[#86868b]">{profile.levelName}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-[#e8e8ed] text-center">
            <TrendingUp className="w-5 h-5 text-[#0071e3] mx-auto mb-1" />
            <p className="text-[18px] font-bold text-[#1d1d1f]">{profile.totalPoints.toLocaleString()}</p>
            <p className="text-[11px] text-[#86868b]">แต้มรวม</p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-[#e8e8ed] text-center">
            <Flame className="w-5 h-5 text-[#ff9500] mx-auto mb-1" />
            <p className="text-[18px] font-bold text-[#1d1d1f]">{profile.currentStreak}</p>
            <p className="text-[11px] text-[#86868b]">Streak</p>
          </div>
        </div>
      )}

      {/* Badge count */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
          เหรียญทั้งหมด
        </h3>
        <span className="text-[13px] text-[#86868b]">
          {earnedCount}/{badges.length} เหรียญ
        </span>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-lg whitespace-nowrap transition-all ${
              activeCategory === cat
                ? "bg-[#0071e3] text-white"
                : "bg-[#f5f5f7] text-[#86868b]"
            }`}
          >
            {cat === "all" ? "ทั้งหมด" : CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-3 gap-3">
        {filteredBadges.map((badge) => (
          <button
            key={badge.id}
            onClick={() => setSelectedBadge(badge)}
            className={`relative rounded-2xl p-4 border text-center transition-all active:scale-95 ${
              badge.earned
                ? `${TIER_STYLES[badge.tier]?.bg || "bg-white"} ${TIER_STYLES[badge.tier]?.border || "border-[#e8e8ed]"}`
                : "bg-[#f5f5f7]/50 border-[#e8e8ed] opacity-50"
            }`}
          >
            <span className={`text-[28px] block mb-1.5 ${!badge.earned ? "grayscale" : ""}`}>
              {badge.icon}
            </span>
            <p className={`text-[11px] font-medium leading-tight ${
              badge.earned ? "text-[#1d1d1f]" : "text-[#86868b]"
            }`}>
              {badge.name}
            </p>
            {/* Tier indicator */}
            <div className={`mt-1.5 text-[9px] font-semibold uppercase ${TIER_STYLES[badge.tier]?.text || "text-[#86868b]"}`}>
              {badge.tier}
            </div>
            {/* Progress bar for unearned */}
            {!badge.earned && badge.progress !== undefined && (
              <div className="mt-2">
                <div className="h-1 bg-[#e8e8ed] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0071e3] rounded-full"
                    style={{ width: `${Math.min(100, (badge.progress / badge.conditionValue) * 100)}%` }}
                  />
                </div>
                <p className="text-[9px] text-[#86868b] mt-0.5">
                  {badge.progress}/{badge.conditionValue}
                </p>
              </div>
            )}
            {badge.earned && (
              <div className="absolute top-2 right-2 w-4 h-4 bg-[#34c759] rounded-full flex items-center justify-center">
                <Star className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {filteredBadges.length === 0 && (
        <div className="text-center py-8">
          <Star className="w-12 h-12 text-[#d2d2d7] mx-auto mb-3" />
          <p className="text-[15px] text-[#86868b]">ไม่มีเหรียญในหมวดนี้</p>
        </div>
      )}

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setSelectedBadge(null)}
                className="w-8 h-8 bg-[#f5f5f7] rounded-full flex items-center justify-center hover:bg-[#e8e8ed]"
              >
                <X className="w-4 h-4 text-[#86868b]" />
              </button>
            </div>

            <div className="text-center">
              <span className={`text-[56px] block mb-3 ${!selectedBadge.earned ? "grayscale opacity-50" : ""}`}>
                {selectedBadge.icon}
              </span>
              <h3 className="text-[20px] font-semibold text-[#1d1d1f] mb-1">
                {selectedBadge.name}
              </h3>
              <div className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase mb-3 ${
                TIER_STYLES[selectedBadge.tier]?.bg || "bg-[#f5f5f7]"
              } ${TIER_STYLES[selectedBadge.tier]?.text || "text-[#86868b]"}`}>
                {selectedBadge.tier}
              </div>
              <p className="text-[15px] text-[#86868b] mb-4">
                {selectedBadge.description}
              </p>

              {selectedBadge.earned ? (
                <div className="bg-[#34c759]/10 rounded-xl p-3">
                  <p className="text-[13px] text-[#34c759] font-medium">
                    ได้รับเมื่อ {new Date(selectedBadge.earnedAt!).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-[12px] text-[#34c759]/70 mt-0.5">
                    +{selectedBadge.pointsReward} แต้ม
                  </p>
                </div>
              ) : (
                <div className="bg-[#f5f5f7] rounded-xl p-3">
                  <p className="text-[13px] text-[#86868b]">ยังไม่ได้รับ</p>
                  {selectedBadge.progress !== undefined && (
                    <div className="mt-2">
                      <div className="h-2 bg-[#e8e8ed] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0071e3] rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (selectedBadge.progress / selectedBadge.conditionValue) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-[12px] text-[#86868b] mt-1">
                        {selectedBadge.progress}/{selectedBadge.conditionValue}
                      </p>
                    </div>
                  )}
                  <p className="text-[12px] text-[#0071e3] mt-1">
                    +{selectedBadge.pointsReward} แต้มเมื่อได้รับ
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
