"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SettingsLayout } from "@/components/admin/SettingsLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  Trophy,
  Save,
  Zap,
  RotateCcw,
  Loader2,
  Star,
  Flame,
  TrendingUp,
  Megaphone,
  Calendar,
} from "lucide-react";

const ToggleSwitch = ({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
      enabled ? "bg-[#34c759]" : "bg-[#d2d2d7]"
    }`}
  >
    <span
      className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
        enabled ? "right-1" : "left-1"
      }`}
    />
  </button>
);

interface PointSetting {
  key: string;
  label: string;
  description: string;
  icon: any;
  color: string;
}

const POINT_SETTINGS: PointSetting[] = [
  { key: "gamify_points_on_time", label: "เช็กอินตรงเวลา", description: "แต้มที่ได้เมื่อเช็กอินไม่สาย", icon: Zap, color: "#34c759" },
  { key: "gamify_points_early", label: "เข้างานก่อนเวลา", description: "แต้มโบนัสเมื่อเข้าก่อนเวลา", icon: Star, color: "#ffd700" },
  { key: "gamify_points_full_day", label: "เข้า-ออกครบวัน", description: "แต้มเมื่อเช็กอินและเช็กเอาท์ครบ", icon: TrendingUp, color: "#0071e3" },
  { key: "gamify_points_ot", label: "ทำ OT สำเร็จ", description: "แต้มเมื่อทำ OT สำเร็จ", icon: Flame, color: "#ff9500" },
  { key: "gamify_points_no_leave_week", label: "ไม่ลาตลอดสัปดาห์", description: "แต้มโบนัสเมื่อไม่ลาครบสัปดาห์", icon: Trophy, color: "#af52de" },
  { key: "gamify_points_streak_bonus", label: "โบนัส Streak (ทุก 5 วัน)", description: "แต้มโบนัสเมื่อมาต่อเนื่องครบ 5 วัน", icon: Flame, color: "#ff3b30" },
  { key: "gamify_points_late_penalty", label: "หักแต้มมาสาย", description: "แต้มที่หักเมื่อมาสาย (ค่าติดลบ)", icon: Zap, color: "#ff3b30" },
  { key: "gamify_early_minutes", label: "เกณฑ์ Early Bird (นาที)", description: "ต้องมาก่อนเวลากี่นาทีถึงจะได้โบนัส", icon: Star, color: "#5ac8fa" },
];

function GamificationSettingsContent() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [badges, setBadges] = useState<any[]>([]);
  const [rankingEnabled, setRankingEnabled] = useState(true);
  const [rankingDay, setRankingDay] = useState("0");

  useEffect(() => {
    fetchSettings();
    fetchBadges();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .or("setting_key.like.gamify_%,setting_key.in.(enable_weekly_ranking_announcement,weekly_ranking_day)");

      const map: Record<string, string> = {};
      data?.forEach((s: any) => {
        map[s.setting_key] = s.setting_value;
      });
      setSettings(map);
      setRankingEnabled(map.enable_weekly_ranking_announcement !== "false");
      setRankingDay(map.weekly_ranking_day || "0");
    } catch (error) {
      toast.error("ข้อผิดพลาด", "ไม่สามารถโหลดการตั้งค่าได้");
    } finally {
      setLoading(false);
    }
  };

  const fetchBadges = async () => {
    const { data } = await supabase
      .from("badge_definitions")
      .select("*")
      .order("category")
      .order("tier");
    setBadges(data || []);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allSettings = {
        ...settings,
        enable_weekly_ranking_announcement: rankingEnabled ? "true" : "false",
        weekly_ranking_day: rankingDay,
      };

      for (const [key, value] of Object.entries(allSettings)) {
        await supabase
          .from("system_settings")
          .upsert(
            { setting_key: key, setting_value: value },
            { onConflict: "setting_key" }
          );
      }
      toast.success("บันทึกสำเร็จ", "การตั้งค่า Gamification ถูกบันทึกแล้ว");
    } catch (error) {
      toast.error("ข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    if (!confirm("ต้องการคำนวณแต้มใหม่ทั้งหมดจริงหรือ? กระบวนการนี้อาจใช้เวลา")) return;

    setRecalculating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/gamification/recalculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({}),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success("คำนวณใหม่สำเร็จ", result.message);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error("ข้อผิดพลาด", error.message || "ไม่สามารถคำนวณใหม่ได้");
    } finally {
      setRecalculating(false);
    }
  };

  const toggleBadge = async (badgeId: string, currentActive: boolean) => {
    await supabase
      .from("badge_definitions")
      .update({ is_active: !currentActive })
      .eq("id", badgeId);
    fetchBadges();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
      </div>
    );
  }

  const isEnabled = settings.gamify_enabled !== "false";

  return (
    <div className="space-y-6">
      {/* Enable/Disable */}
      <Card elevated>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ffd700]/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#ffd700]" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">ระบบ Gamification</h3>
              <p className="text-[13px] text-[#86868b]">เปิด/ปิดระบบแต้มและเหรียญ</p>
            </div>
          </div>
          <ToggleSwitch
            enabled={isEnabled}
            onChange={() =>
              setSettings((prev) => ({
                ...prev,
                gamify_enabled: isEnabled ? "false" : "true",
              }))
            }
          />
        </div>
      </Card>

      {/* Point Settings */}
      <div>
        <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-3">ค่าแต้ม</h2>
        <div className="space-y-3">
          {POINT_SETTINGS.map((ps) => {
            const Icon = ps.icon;
            return (
              <Card key={ps.key} elevated>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${ps.color}15` }}
                    >
                      <Icon className="w-4.5 h-4.5" style={{ color: ps.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#1d1d1f]">{ps.label}</p>
                      <p className="text-[12px] text-[#86868b] truncate">{ps.description}</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={settings[ps.key] || "0"}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, [ps.key]: e.target.value }))
                    }
                    className="w-20 text-right px-3 py-2 bg-[#f5f5f7] border border-[#e8e8ed] rounded-lg text-[15px] font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Weekly Ranking Announcement */}
      <div>
        <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-3">ประกาศอันดับรายสัปดาห์</h2>
        <Card elevated>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0071e3]/10 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-[#0071e3]" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#1d1d1f]">ส่งอันดับไป LINE</p>
                  <p className="text-[12px] text-[#86868b]">ประกาศอันดับ Leaderboard ทุกสัปดาห์</p>
                </div>
              </div>
              <ToggleSwitch
                enabled={rankingEnabled}
                onChange={() => setRankingEnabled(!rankingEnabled)}
              />
            </div>

            {rankingEnabled && (
              <div className="flex items-center gap-3 pl-[52px]">
                <Calendar className="w-4 h-4 text-[#86868b] flex-shrink-0" />
                <label className="text-[13px] text-[#86868b] flex-shrink-0">ส่งทุกวัน</label>
                <select
                  value={rankingDay}
                  onChange={(e) => setRankingDay(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#f5f5f7] border border-[#e8e8ed] rounded-lg text-[14px] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                >
                  <option value="0">อาทิตย์</option>
                  <option value="1">จันทร์</option>
                  <option value="2">อังคาร</option>
                  <option value="3">พุธ</option>
                  <option value="4">พฤหัสบดี</option>
                  <option value="5">ศุกร์</option>
                  <option value="6">เสาร์</option>
                </select>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Save Button */}
      <Button fullWidth onClick={handleSave} loading={saving} size="lg">
        <Save className="w-5 h-5" />
        บันทึกการตั้งค่า
      </Button>

      {/* Badge Management */}
      <div>
        <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-3">เหรียญ (Badges)</h2>
        <div className="space-y-2">
          {badges.map((badge) => (
            <Card key={badge.id} elevated>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[24px]">{badge.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-[#1d1d1f]">{badge.name}</p>
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        badge.tier === "platinum" ? "bg-[#af52de]/10 text-[#af52de]" :
                        badge.tier === "gold" ? "bg-[#ffd700]/10 text-[#b8860b]" :
                        badge.tier === "silver" ? "bg-[#c0c0c0]/10 text-[#808080]" :
                        "bg-[#cd7f32]/10 text-[#cd7f32]"
                      }`}>
                        {badge.tier}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#86868b]">
                      {badge.description} (+{badge.points_reward} pts)
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  enabled={badge.is_active}
                  onChange={() => toggleBadge(badge.id, badge.is_active)}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recalculate */}
      <div>
        <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-3">เครื่องมือ</h2>
        <Card elevated>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#ff9500]/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-[#ff9500]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#1d1d1f]">คำนวณแต้มใหม่ทั้งหมด</p>
                <p className="text-[12px] text-[#86868b]">คำนวณแต้มจากข้อมูลย้อนหลังทั้งหมด</p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handleRecalculate}
              loading={recalculating}
              size="sm"
            >
              {recalculating ? "กำลังคำนวณ..." : "คำนวณใหม่"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function GamificationSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <SettingsLayout
        title="Gamification"
        description="ตั้งค่าระบบแต้ม เหรียญ และ Leaderboard"
      >
        <GamificationSettingsContent />
      </SettingsLayout>
    </ProtectedRoute>
  );
}
