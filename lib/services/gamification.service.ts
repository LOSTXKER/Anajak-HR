/**
 * Gamification Service
 * =============================================
 * Core engine for points, badges, streaks, and levels
 */

import { supabase } from "@/lib/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, getDay } from "date-fns";
import { getTodayTH } from "@/lib/utils/date";
import { sendBadgeNotification } from "./notification.service";

const TH_TIMEZONE = "Asia/Bangkok";

function getThaiMinutesOfDay(timestamp: string | Date): number {
  const d = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const thaiStr = d.toLocaleString("en-US", {
    timeZone: TH_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const [h, m] = thaiStr.split(":").map(Number);
  return h * 60 + m;
}

interface BadgeDefinitionRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  tier: string;
  condition_type: string;
  condition_value: number;
  points_reward: number;
  is_active: boolean;
}

interface EmployeeBadgeRow {
  id: string;
  badge_id: string;
  earned_at: string;
  month_context: string | null;
  badge_definitions: BadgeDefinitionRow;
}

interface EmployeePointsRow {
  id: string;
  employee_id: string;
  total_points: number;
  quarterly_points: number;
  current_quarter: string;
  level: number;
  level_name: string;
  rank_tier: string;
  current_streak: number;
  longest_streak: number;
  last_streak_date: string | null;
}

interface SystemSettingRow {
  setting_key: string;
  setting_value: string;
}

interface EmployeeBadgePartialRow {
  badge_id: string;
  month_context: string | null;
}

interface EmployeeBadgeEarnedAtRow {
  badge_id: string;
  earned_at: string;
  month_context: string | null;
}

interface AttendanceLogRow {
  work_date: string;
  is_late: boolean;
}

interface AttendanceLogLateOnlyRow {
  is_late: boolean;
}

interface LeaderboardEntryRow {
  employee_id: string;
  total_points: number;
  quarterly_points: number;
  level: number;
  level_name: string;
  rank_tier: string;
  current_streak: number;
  employees: {
    id: string;
    name: string;
    branch_id: string;
    account_status: string;
    deleted_at: string | null;
    is_system_account: boolean;
  };
}

interface EmployeeBadgeCountRow {
  employee_id: string;
}

interface AttendanceLogFullRow {
  id: string;
  work_date: string;
  is_late: boolean;
  clock_in_time: string | null;
  clock_out_time: string | null;
}

interface OTRequestRow {
  id: string;
  request_date: string;
}

// Level definitions (rebalanced: harder progression, ~8 pts/day for perfect employee)
export const LEVELS = [
  { level: 1, name: "Rookie", minPoints: 0 },
  { level: 2, name: "Regular", minPoints: 200 },
  { level: 3, name: "Reliable", minPoints: 600 },
  { level: 4, name: "Star", minPoints: 1500 },
  { level: 5, name: "Super Star", minPoints: 3000 },
  { level: 6, name: "MVP", minPoints: 6000 },
  { level: 7, name: "Legend", minPoints: 10000 },
  { level: 8, name: "Immortal", minPoints: 15000 },
] as const;

// Quarterly rank tiers (resets every quarter)
export const RANK_TIERS = [
  { tier: "Unranked", minPoints: 0, icon: "🔘" },
  { tier: "Bronze", minPoints: 50, icon: "🥉" },
  { tier: "Silver", minPoints: 150, icon: "🥈" },
  { tier: "Gold", minPoints: 300, icon: "🥇" },
  { tier: "Platinum", minPoints: 500, icon: "💎" },
  { tier: "Diamond", minPoints: 700, icon: "👑" },
] as const;

export function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

export function calculateRankTier(quarterlyPoints: number): { tier: string; icon: string } {
  let result = { tier: RANK_TIERS[0].tier as string, icon: RANK_TIERS[0].icon as string };
  for (const r of RANK_TIERS) {
    if (quarterlyPoints >= r.minPoints) {
      result = { tier: r.tier, icon: r.icon };
    }
  }
  return result;
}

export function getRankProgress(quarterlyPoints: number): { nextTierPoints: number; progress: number } {
  const currentTier = calculateRankTier(quarterlyPoints);
  const currentIdx = RANK_TIERS.findIndex((r) => r.tier === currentTier.tier);
  const nextTier = RANK_TIERS[currentIdx + 1];

  if (!nextTier) return { nextTierPoints: 0, progress: 100 };

  const currentMin = RANK_TIERS[currentIdx].minPoints;
  const range = nextTier.minPoints - currentMin;
  const progress = Math.min(100, Math.round(((quarterlyPoints - currentMin) / range) * 100));
  return { nextTierPoints: nextTier.minPoints, progress };
}

export type ActionType =
  | "on_time_checkin"
  | "early_checkin"
  | "full_attendance_day"
  | "ot_completed"
  | "no_leave_week"
  | "streak_bonus"
  | "late_penalty";

export interface GameProfile {
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
  recentBadges: EarnedBadge[];
  rank?: number;
}

export interface EarnedBadge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: string;
  earnedAt: string;
  pointsReward: number;
}

export interface BadgeWithProgress {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: string;
  conditionType: string;
  conditionValue: number;
  pointsReward: number;
  earned: boolean;
  earnedAt?: string;
  progress?: number;
}

export interface LeaderboardEntry {
  rank: number;
  employeeId: string;
  employeeName: string;
  totalPoints: number;
  quarterlyPoints: number;
  level: number;
  levelName: string;
  rankTier: string;
  currentStreak: number;
  badgeCount: number;
}

/**
 * Calculate level from total points
 */
export function calculateLevel(totalPoints: number): { level: number; name: string } {
  let level = LEVELS[0].level as number;
  let name = LEVELS[0].name as string;
  for (const l of LEVELS) {
    if (totalPoints >= l.minPoints) {
      level = l.level;
      name = l.name;
    }
  }
  return { level, name };
}

/**
 * Get points needed for next level and progress percentage
 */
export function getLevelProgress(totalPoints: number): { nextLevelPoints: number; progress: number } {
  const currentLevel = calculateLevel(totalPoints);
  const nextLevel = LEVELS.find((l) => l.level === currentLevel.level + 1);

  if (!nextLevel) {
    return { nextLevelPoints: 0, progress: 100 };
  }

  const currentLevelMin = LEVELS.find((l) => l.level === currentLevel.level)!.minPoints;
  const range = nextLevel.minPoints - currentLevelMin;
  const progress = Math.min(100, Math.round(((totalPoints - currentLevelMin) / range) * 100));

  return { nextLevelPoints: nextLevel.minPoints, progress };
}

/**
 * Get gamification settings from system_settings
 */
export async function getGamificationSettings(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .like("setting_key", "gamify_%");

    const settings: Record<string, string> = {};
    (data as SystemSettingRow[] | null)?.forEach((s: SystemSettingRow) => {
      settings[s.setting_key] = s.setting_value;
    });
    return settings;
  } catch (err) {
    console.error("Error fetching gamification settings:", err);
    return {};
  }
}

/**
 * Ensure employee_points row exists, return it
 */
export async function ensureEmployeePoints(employeeId: string) {
  const currentQ = getCurrentQuarter();

  const { data: existing } = await supabase
    .from("employee_points")
    .select("*")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (existing) {
    if (existing.current_quarter !== currentQ) {
      const { data: updated } = await supabase
        .from("employee_points")
        .update({ quarterly_points: 0, current_quarter: currentQ, rank_tier: "Unranked" })
        .eq("id", existing.id)
        .select()
        .single();
      return updated || existing;
    }
    return existing;
  }

  const { data: created } = await supabase
    .from("employee_points")
    .insert({
      employee_id: employeeId,
      total_points: 0,
      quarterly_points: 0,
      current_quarter: currentQ,
      level: 1,
      level_name: "Rookie",
      rank_tier: "Unranked",
      current_streak: 0,
      longest_streak: 0,
    })
    .select()
    .single();

  return created;
}

/**
 * Award points to an employee
 */
export async function awardPoints(
  employeeId: string,
  actionType: ActionType,
  points: number,
  description: string,
  referenceId?: string,
  referenceType?: string
): Promise<boolean> {
  try {
    const settings = await getGamificationSettings();
    if (settings.gamify_enabled === "false") return false;

    await supabase.from("point_transactions").insert({
      employee_id: employeeId,
      points,
      action_type: actionType,
      description,
      reference_id: referenceId || null,
      reference_type: referenceType || null,
    });

    await ensureEmployeePoints(employeeId);

    // Atomic increment to avoid race conditions
    const { data: updated } = await supabase.rpc("increment_employee_points", {
      p_employee_id: employeeId,
      p_points: points,
    });

    // If RPC doesn't exist yet, fall back to read-then-write
    if (!updated) {
      const ep = await ensureEmployeePoints(employeeId);
      if (!ep) return false;
      const newTotal = Math.max(0, ep.total_points + points);
      const newQuarterly = Math.max(0, ep.quarterly_points + points);
      const { level, name } = calculateLevel(newTotal);
      const { tier } = calculateRankTier(newQuarterly);
      await supabase
        .from("employee_points")
        .update({ total_points: newTotal, quarterly_points: newQuarterly, level, level_name: name, rank_tier: tier })
        .eq("id", ep.id);
    }

    return true;
  } catch (err) {
    console.error("Error awarding points:", err);
    return false;
  }
}

/**
 * Update attendance streak for an employee
 */
export async function updateStreak(employeeId: string, date: string): Promise<number> {
  try {
    const ep = await ensureEmployeePoints(employeeId);
    if (!ep) return 0;

    const today = new Date(date);
    const lastStreakDate = ep.last_streak_date ? new Date(ep.last_streak_date) : null;
    const workingDays = await getWorkingDays();

    let newStreak = 1;

    if (lastStreakDate) {
      let expectedPrev = subDays(today, 1);
      while (isOffDay(expectedPrev, workingDays)) {
        expectedPrev = subDays(expectedPrev, 1);
      }

      const lastDateStr = format(lastStreakDate, "yyyy-MM-dd");
      const expectedStr = format(expectedPrev, "yyyy-MM-dd");

      if (lastDateStr === expectedStr) {
        newStreak = ep.current_streak + 1;
      } else if (lastDateStr === format(today, "yyyy-MM-dd")) {
        return ep.current_streak;
      }
    }

    const longestStreak = Math.max(ep.longest_streak, newStreak);

    await supabase
      .from("employee_points")
      .update({
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_streak_date: date,
      })
      .eq("id", ep.id);

    // Streak bonus every 5 days
    if (newStreak > 0 && newStreak % 5 === 0) {
      const settings = await getGamificationSettings();
      const bonusPoints = parseInt(settings.gamify_points_streak_bonus || "25");
      await awardPoints(
        employeeId,
        "streak_bonus",
        bonusPoints,
        `โบนัส Streak ${newStreak} วันติดต่อกัน`
      );
    }

    return newStreak;
  } catch (err) {
    console.error("Error updating streak:", err);
    return 0;
  }
}

/**
 * Process check-in gamification (called after successful check-in)
 */
export async function processCheckinGamification(
  employeeId: string,
  isLate: boolean,
  clockInTime: Date,
  attendanceId?: string
): Promise<{ pointsEarned: number; newBadges: string[] }> {
  const settings = await getGamificationSettings();
  if (settings.gamify_enabled === "false") return { pointsEarned: 0, newBadges: [] };

  let totalPointsEarned = 0;
  const newBadges: string[] = [];
  const today = getTodayTH();

  // On-time check-in
  if (!isLate) {
    const pts = parseInt(settings.gamify_points_on_time || "10");
    await awardPoints(employeeId, "on_time_checkin", pts, "เช็กอินตรงเวลา", attendanceId, "attendance");
    totalPointsEarned += pts;
  } else {
    const penalty = parseInt(settings.gamify_points_late_penalty || "-5");
    await awardPoints(employeeId, "late_penalty", penalty, "มาสาย", attendanceId, "attendance");
    totalPointsEarned += penalty;
  }

  if (!isLate) {
    const earlyMinutes = parseInt(settings.gamify_early_minutes || "15");
    const workStartSetting = await getWorkStartTime();
    if (workStartSetting) {
      const [h, m] = workStartSetting.split(":").map(Number);
      const workStartMinutes = h * 60 + m;
      const checkinMinutes = getThaiMinutesOfDay(clockInTime);
      if (workStartMinutes - checkinMinutes >= earlyMinutes) {
        const pts = parseInt(settings.gamify_points_early || "5");
        await awardPoints(employeeId, "early_checkin", pts, `เข้างานก่อนเวลา ${earlyMinutes} นาที`, attendanceId, "attendance");
        totalPointsEarned += pts;
      }
    }

    // Update streak (only on on-time days)
    await updateStreak(employeeId, today);
  } else {
    // Late arrival resets streak
    await resetStreak(employeeId);
  }

  // Check badges
  const earned = await checkAndAwardBadges(employeeId);
  newBadges.push(...earned);

  return { pointsEarned: totalPointsEarned, newBadges };
}

/**
 * Process check-out gamification
 */
export async function processCheckoutGamification(
  employeeId: string,
  attendanceId?: string
): Promise<{ pointsEarned: number; newBadges: string[] }> {
  const settings = await getGamificationSettings();
  if (settings.gamify_enabled === "false") return { pointsEarned: 0, newBadges: [] };

  const pts = parseInt(settings.gamify_points_full_day || "5");
  await awardPoints(employeeId, "full_attendance_day", pts, "เข้า-ออกงานครบวัน", attendanceId, "attendance");

  const earned = await checkAndAwardBadges(employeeId);

  return { pointsEarned: pts, newBadges: earned };
}

/**
 * Process OT completion gamification
 */
export async function processOTGamification(
  employeeId: string,
  otRequestId: string
): Promise<{ pointsEarned: number; newBadges: string[] }> {
  const settings = await getGamificationSettings();
  if (settings.gamify_enabled === "false") return { pointsEarned: 0, newBadges: [] };

  const pts = parseInt(settings.gamify_points_ot || "15");
  await awardPoints(employeeId, "ot_completed", pts, "ทำ OT สำเร็จ", otRequestId, "ot");

  const earned = await checkAndAwardBadges(employeeId);

  return { pointsEarned: pts, newBadges: earned };
}

/**
 * Check and award all eligible badges for an employee
 */
export async function checkAndAwardBadges(employeeId: string): Promise<string[]> {
  try {
    const { data: badges } = await supabase
      .from("badge_definitions")
      .select("*")
      .eq("is_active", true);

    if (!badges) return [];

    const { data: earnedBadges } = await supabase
      .from("employee_badges")
      .select("badge_id, month_context")
      .eq("employee_id", employeeId);

    const earnedSet = new Set(
      (earnedBadges || []).map((b: EmployeeBadgePartialRow) => `${b.badge_id}:${b.month_context || "all"}`)
    );

    const currentMonth = format(new Date(), "yyyy-MM");
    const newlyEarned: string[] = [];

    for (const badge of badges as BadgeDefinitionRow[]) {
      const monthContext = isMonthlyBadge(badge.condition_type) ? currentMonth : null;
      const key = `${badge.id}:${monthContext || "all"}`;

      if (earnedSet.has(key)) continue;

      const eligible = await checkBadgeCondition(employeeId, badge);
      if (!eligible) continue;

      const { error } = await supabase.from("employee_badges").insert({
        employee_id: employeeId,
        badge_id: badge.id,
        month_context: monthContext,
      });

      if (!error) {
        newlyEarned.push(badge.name);
        sendBadgeNotification({
          employeeId,
          badgeName: badge.name,
          badgeIcon: badge.icon,
          pointsReward: 0,
        }).catch(() => {});
      }
    }

    return newlyEarned;
  } catch (err) {
    console.error("Error checking badges:", err);
    return [];
  }
}

function isMonthlyBadge(conditionType: string): boolean {
  return ["on_time_month", "no_leave_month"].includes(conditionType);
}

async function checkBadgeCondition(employeeId: string, badge: BadgeDefinitionRow): Promise<boolean> {
  switch (badge.condition_type) {
    case "first_checkin":
      return checkFirstCheckin(employeeId);
    case "on_time_streak":
      return checkOnTimeStreak(employeeId, badge.condition_value);
    case "on_time_month":
      return checkOnTimeMonth(employeeId);
    case "early_count":
      return checkEarlyCount(employeeId, badge.condition_value);
    case "ot_count":
      return checkOTCount(employeeId, badge.condition_value);
    case "streak_days":
      return checkStreakDays(employeeId, badge.condition_value);
    case "no_leave_month":
      return checkNoLeaveMonth(employeeId);
    case "attendance_count":
      return checkAttendanceCount(employeeId, badge.condition_value);
    default:
      return false;
  }
}

async function checkFirstCheckin(employeeId: string): Promise<boolean> {
  const { count } = await supabase
    .from("attendance_logs")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId);
  return (count || 0) >= 1;
}

async function checkOnTimeStreak(employeeId: string, days: number): Promise<boolean> {
  const { data } = await supabase
    .from("attendance_logs")
    .select("work_date, is_late")
    .eq("employee_id", employeeId)
    .order("work_date", { ascending: false })
    .limit(days);

  if (!data || data.length < days) return false;

  // All of the last N records must be on-time
  return data.every((log: AttendanceLogRow) => !log.is_late);
}

async function checkOnTimeMonth(employeeId: string): Promise<boolean> {
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  const { data: logs } = await supabase
    .from("attendance_logs")
    .select("is_late")
    .eq("employee_id", employeeId)
    .gte("work_date", monthStart)
    .lte("work_date", monthEnd);

  if (!logs || logs.length < 15) return false;
  return logs.every((l: AttendanceLogLateOnlyRow) => !l.is_late);
}

async function checkEarlyCount(employeeId: string, count: number): Promise<boolean> {
  const { count: txnCount } = await supabase
    .from("point_transactions")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .eq("action_type", "early_checkin");
  return (txnCount || 0) >= count;
}

async function checkOTCount(employeeId: string, count: number): Promise<boolean> {
  const { count: otCount } = await supabase
    .from("ot_requests")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .eq("status", "completed");
  return (otCount || 0) >= count;
}

async function checkStreakDays(employeeId: string, days: number): Promise<boolean> {
  const ep = await ensureEmployeePoints(employeeId);
  return (ep?.current_streak || 0) >= days || (ep?.longest_streak || 0) >= days;
}

async function checkNoLeaveMonth(employeeId: string): Promise<boolean> {
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  const { count } = await supabase
    .from("leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .eq("status", "approved")
    .gte("start_date", monthStart)
    .lte("start_date", monthEnd);

  if ((count || 0) > 0) return false;

  const { count: attCount } = await supabase
    .from("attendance_logs")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .gte("work_date", monthStart)
    .lte("work_date", monthEnd);

  return (attCount || 0) >= 15;
}

async function checkAttendanceCount(employeeId: string, count: number): Promise<boolean> {
  const { count: attCount } = await supabase
    .from("attendance_logs")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId);
  return (attCount || 0) >= count;
}

async function getWorkStartTime(): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "work_start_time")
      .maybeSingle();
    return data?.setting_value || "09:00";
  } catch (err) {
    console.error("Error fetching work start time:", err);
    return "09:00";
  }
}

async function getWorkingDays(): Promise<number[]> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "working_days")
      .maybeSingle();
    if (data?.setting_value) {
      return data.setting_value.split(",").map(Number);
    }
    return [1, 2, 3, 4, 5];
  } catch (err) {
    console.error("Error fetching working days:", err);
    return [1, 2, 3, 4, 5];
  }
}

function isOffDay(date: Date, workingDays: number[]): boolean {
  return !workingDays.includes(getDay(date));
}

async function resetStreak(employeeId: string): Promise<void> {
  try {
    const ep = await ensureEmployeePoints(employeeId);
    if (!ep || ep.current_streak === 0) return;

    await supabase
      .from("employee_points")
      .update({ current_streak: 0 })
      .eq("id", ep.id);
  } catch (err) {
    console.error("Error resetting streak:", err);
  }
}

/**
 * Get full game profile for an employee
 */
export async function getEmployeeGameProfile(employeeId: string): Promise<GameProfile> {
  const ep = await ensureEmployeePoints(employeeId);
  const { nextLevelPoints, progress } = getLevelProgress(ep?.total_points || 0);

  const { data: recentBadgeData } = await supabase
    .from("employee_badges")
    .select("*, badge_definitions(*)")
    .eq("employee_id", employeeId)
    .order("earned_at", { ascending: false })
    .limit(5);

  const recentBadges: EarnedBadge[] = (recentBadgeData || []).map((b: EmployeeBadgeRow) => ({
    id: b.id,
    code: b.badge_definitions.code,
    name: b.badge_definitions.name,
    description: b.badge_definitions.description,
    icon: b.badge_definitions.icon,
    category: b.badge_definitions.category,
    tier: b.badge_definitions.tier,
    earnedAt: b.earned_at,
    pointsReward: b.badge_definitions.points_reward,
  }));

  // Get rank
  const { count: higherCount } = await supabase
    .from("employee_points")
    .select("id", { count: "exact", head: true })
    .gt("total_points", ep?.total_points || 0);

  const qPts = ep?.quarterly_points || 0;
  const { tier: rankTier, icon: rankIcon } = calculateRankTier(qPts);
  const { nextTierPoints: nextRankPoints, progress: rankProgress } = getRankProgress(qPts);

  return {
    totalPoints: ep?.total_points || 0,
    quarterlyPoints: qPts,
    level: ep?.level || 1,
    levelName: ep?.level_name || "Rookie",
    rankTier,
    rankIcon,
    currentStreak: ep?.current_streak || 0,
    longestStreak: ep?.longest_streak || 0,
    nextLevelPoints,
    progressToNextLevel: progress,
    nextRankPoints,
    progressToNextRank: rankProgress,
    recentBadges,
    rank: (higherCount || 0) + 1,
  };
}

/**
 * Get all badges with progress for an employee
 */
export async function getBadgesWithProgress(employeeId: string): Promise<BadgeWithProgress[]> {
  const { data: allBadges } = await supabase
    .from("badge_definitions")
    .select("*")
    .eq("is_active", true)
    .order("tier", { ascending: true });

  const { data: earnedBadges } = await supabase
    .from("employee_badges")
    .select("badge_id, earned_at, month_context")
    .eq("employee_id", employeeId);

  const earnedMap = new Map<string, string>();
  (earnedBadges || []).forEach((b: EmployeeBadgeEarnedAtRow) => {
    earnedMap.set(b.badge_id, b.earned_at);
  });

  const progress = await getBadgeProgress(employeeId);

  return (allBadges || []).map((badge: BadgeDefinitionRow) => ({
    id: badge.id,
    code: badge.code,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    category: badge.category,
    tier: badge.tier,
    conditionType: badge.condition_type,
    conditionValue: badge.condition_value,
    pointsReward: badge.points_reward,
    earned: earnedMap.has(badge.id),
    earnedAt: earnedMap.get(badge.id),
    progress: progress[badge.condition_type]?.[badge.condition_value] ?? undefined,
  }));
}

async function getBadgeProgress(employeeId: string): Promise<Record<string, Record<number, number>>> {
  const result: Record<string, Record<number, number>> = {};

  const [
    { count: attCount },
    { count: earlyCount },
    { count: otCount },
  ] = await Promise.all([
    supabase.from("attendance_logs").select("id", { count: "exact", head: true }).eq("employee_id", employeeId),
    supabase.from("point_transactions").select("id", { count: "exact", head: true }).eq("employee_id", employeeId).eq("action_type", "early_checkin"),
    supabase.from("ot_requests").select("id", { count: "exact", head: true }).eq("employee_id", employeeId).eq("status", "completed"),
  ]);

  const ep = await ensureEmployeePoints(employeeId);
  const streak = ep?.current_streak || 0;

  result.early_count = { 10: Math.min(earlyCount || 0, 100), 30: Math.min(earlyCount || 0, 100), 100: earlyCount || 0 };
  result.ot_count = { 10: Math.min(otCount || 0, 50), 50: otCount || 0 };
  result.streak_days = { 7: Math.min(streak, 90), 30: Math.min(streak, 90), 90: streak };
  result.attendance_count = { 100: Math.min(attCount || 0, 365), 365: attCount || 0 };

  return result;
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(
  period: "quarterly" | "alltime" = "quarterly",
  branchId?: string
): Promise<LeaderboardEntry[]> {
  try {
    let query = supabase
      .from("employee_points")
      .select(`
        employee_id,
        total_points,
        quarterly_points,
        level,
        level_name,
        rank_tier,
        current_streak,
        employees!inner(id, name, branch_id, account_status, deleted_at, is_system_account)
      `)
      .order(period === "quarterly" ? "quarterly_points" : "total_points", { ascending: false })
      .limit(50);

    const { data } = await query;

    if (!data) return [];

    let entries = (data as LeaderboardEntryRow[]).filter((d: LeaderboardEntryRow) => {
      const emp = d.employees;
      return emp.account_status === "approved" && !emp.deleted_at && !emp.is_system_account;
    });

    if (branchId) {
      entries = entries.filter((d: LeaderboardEntryRow) => d.employees.branch_id === branchId);
    }

    const badgeCounts = await getBadgeCounts(entries.map((e: LeaderboardEntryRow) => e.employee_id));

    return entries.map((entry: LeaderboardEntryRow, index: number) => ({
      rank: index + 1,
      employeeId: entry.employee_id,
      employeeName: entry.employees.name,
      totalPoints: entry.total_points,
      quarterlyPoints: entry.quarterly_points,
      level: entry.level,
      levelName: entry.level_name,
      rankTier: entry.rank_tier,
      currentStreak: entry.current_streak,
      badgeCount: badgeCounts[entry.employee_id] || 0,
    }));
  } catch (err) {
    console.error("Error getting leaderboard:", err);
    return [];
  }
}

async function getBadgeCounts(employeeIds: string[]): Promise<Record<string, number>> {
  if (employeeIds.length === 0) return {};

  const { data } = await supabase
    .from("employee_badges")
    .select("employee_id")
    .in("employee_id", employeeIds);

  const counts: Record<string, number> = {};
  (data || []).forEach((b: EmployeeBadgeCountRow) => {
    counts[b.employee_id] = (counts[b.employee_id] || 0) + 1;
  });
  return counts;
}

/**
 * Recalculate all points from historical data for one employee.
 *
 * Key design: we bypass the awardPoints→RPC path entirely so that
 * quarterly_points only reflects the CURRENT quarter, not all-time history.
 * Streak logic is calculated inline to avoid the same problem.
 * Badges are awarded at the end; their small bonus goes to both totals.
 */
export async function recalculateEmployeePoints(employeeId: string): Promise<void> {
  await supabase.from("point_transactions").delete().eq("employee_id", employeeId);
  await supabase.from("employee_badges").delete().eq("employee_id", employeeId);
  await supabase.from("employee_points").delete().eq("employee_id", employeeId);

  await ensureEmployeePoints(employeeId);

  const settings = await getGamificationSettings();
  if (settings.gamify_enabled === "false") return;

  const { data: attendanceLogs } = await supabase
    .from("attendance_logs")
    .select("id, work_date, is_late, clock_in_time, clock_out_time")
    .eq("employee_id", employeeId)
    .order("work_date", { ascending: true });

  const { data: otRequests } = await supabase
    .from("ot_requests")
    .select("id, request_date")
    .eq("employee_id", employeeId)
    .eq("status", "completed");

  const workStartSetting = await getWorkStartTime();
  const earlyMinutes = parseInt(settings.gamify_early_minutes || "15");
  const workingDays = await getWorkingDays();

  // Quarter boundaries
  const currentQ = getCurrentQuarter();
  const [yr, qs] = currentQ.split("-Q");
  const qNum = parseInt(qs);
  const qStart = format(new Date(parseInt(yr), (qNum - 1) * 3, 1), "yyyy-MM-dd");
  const qEnd = format(new Date(parseInt(yr), qNum * 3, 0), "yyyy-MM-dd");
  const isInQ = (d: string) => d >= qStart && d <= qEnd;

  let totalPts = 0;
  let quarterlyPts = 0;

  const txns: Array<{
    employee_id: string;
    points: number;
    action_type: string;
    description: string;
    reference_id: string | null;
    reference_type: string | null;
  }> = [];

  const addPts = (
    pts: number,
    eventDate: string,
    actionType: string,
    desc: string,
    refId?: string,
    refType?: string
  ) => {
    totalPts += pts;
    if (isInQ(eventDate)) quarterlyPts += pts;
    txns.push({
      employee_id: employeeId,
      points: pts,
      action_type: actionType,
      description: desc,
      reference_id: refId || null,
      reference_type: refType || null,
    });
  };

  // Inline streak tracking (avoids calling updateStreak which calls awardPoints)
  let currentStreak = 0;
  let longestStreak = 0;
  let lastStreakDate: string | null = null;

  let wsMinutes = 0;
  if (workStartSetting) {
    const [wh, wm] = workStartSetting.split(":").map(Number);
    wsMinutes = wh * 60 + wm;
  }

  for (const log of (attendanceLogs || []) as AttendanceLogFullRow[]) {
    if (!log.is_late) {
      const pts = parseInt(settings.gamify_points_on_time || "10");
      addPts(pts, log.work_date, "on_time_checkin", "เช็กอินตรงเวลา", log.id, "attendance");

      if (workStartSetting && log.clock_in_time) {
        const ciMins = getThaiMinutesOfDay(log.clock_in_time);
        if (wsMinutes - ciMins >= earlyMinutes) {
          const earlyPts = parseInt(settings.gamify_points_early || "5");
          addPts(earlyPts, log.work_date, "early_checkin", `เข้างานก่อนเวลา ${earlyMinutes} นาที`, log.id, "attendance");
        }
      }

      // Inline streak calculation
      const today = new Date(log.work_date + "T00:00:00");
      if (lastStreakDate) {
        let expectedPrev = subDays(today, 1);
        while (isOffDay(expectedPrev, workingDays)) {
          expectedPrev = subDays(expectedPrev, 1);
        }
        const expectedStr = format(expectedPrev, "yyyy-MM-dd");
        if (lastStreakDate === expectedStr) {
          currentStreak += 1;
        } else if (lastStreakDate === log.work_date) {
          // same day duplicate, skip
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      lastStreakDate = log.work_date;
      longestStreak = Math.max(longestStreak, currentStreak);

      if (currentStreak > 0 && currentStreak % 5 === 0) {
        const bonusPts = parseInt(settings.gamify_points_streak_bonus || "25");
        addPts(bonusPts, log.work_date, "streak_bonus", `โบนัส Streak ${currentStreak} วันติดต่อกัน`);
      }
    } else {
      const penalty = parseInt(settings.gamify_points_late_penalty || "-5");
      addPts(penalty, log.work_date, "late_penalty", "มาสาย", log.id, "attendance");
      currentStreak = 0;
    }

    if (log.clock_out_time) {
      const pts = parseInt(settings.gamify_points_full_day || "5");
      addPts(pts, log.work_date, "full_attendance_day", "เข้า-ออกงานครบวัน", log.id, "attendance");
    }
  }

  for (const ot of (otRequests || []) as OTRequestRow[]) {
    const pts = parseInt(settings.gamify_points_ot || "15");
    addPts(pts, ot.request_date, "ot_completed", "ทำ OT สำเร็จ", ot.id, "ot");
  }

  // Batch insert point_transactions
  for (let i = 0; i < txns.length; i += 100) {
    await supabase.from("point_transactions").insert(txns.slice(i, i + 100));
  }

  // Set correct totals directly (bypass RPC to avoid the quarterly inflation bug)
  totalPts = Math.max(0, totalPts);
  quarterlyPts = Math.max(0, quarterlyPts);
  const { level, name: levelName } = calculateLevel(totalPts);
  const { tier: rankTier } = calculateRankTier(quarterlyPts);

  await supabase
    .from("employee_points")
    .update({
      total_points: totalPts,
      quarterly_points: quarterlyPts,
      level,
      level_name: levelName,
      rank_tier: rankTier,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_streak_date: lastStreakDate,
    })
    .eq("employee_id", employeeId);

  // Award badges last (honorary only — no points awarded for badges)
  await checkAndAwardBadges(employeeId);
}
