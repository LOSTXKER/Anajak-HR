/**
 * Settings Service
 * =============================================
 * Central service for managing system settings
 */

import { supabase } from "@/lib/supabase/client";
import type { AllSettings, WorkSettings, OTSettings, SystemSetting } from "@/lib/types";

// Default settings values
const DEFAULT_SETTINGS: AllSettings = {
    // Work settings
    workStartTime: "08:30",
    workEndTime: "17:30",
    hoursPerDay: 8,
    checkinTimeStart: "06:00",
    checkinTimeEnd: "12:00",
    checkoutTimeStart: "12:00",
    checkoutTimeEnd: "23:59",
    lateThreshold: 15,
    workingDays: [1, 2, 3, 4, 5], // Monday to Friday
    // OT settings
    otRateWorkday: 1.5,
    otRateWeekend: 1.5,
    otRateHoliday: 2.0,
    requireCheckinWorkday: true,
    requireCheckinWeekend: false,
    requireCheckinHoliday: false,
    // Other settings
    requirePhoto: true,
    requireGPS: true,
    requireAccountApproval: true,
    enableNotifications: true,
    latePenaltyPerMinute: 1,
    daysPerMonth: 26,
};

// Cache for settings
let settingsCache: AllSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all system settings
 */
export async function getSystemSettings(): Promise<AllSettings> {
    // Check cache
    const now = Date.now();
    if (settingsCache && now - cacheTimestamp < CACHE_DURATION) {
        return settingsCache;
    }

    try {
        const { data, error } = await supabase
            .from("system_settings")
            .select("setting_key, setting_value");

        if (error) throw error;

        const settings = { ...DEFAULT_SETTINGS };

        // Map database settings to our settings object
        data?.forEach((item: SystemSetting) => {
            switch (item.setting_key) {
                case "work_start_time":
                    settings.workStartTime = item.setting_value;
                    break;
                case "work_end_time":
                    settings.workEndTime = item.setting_value;
                    break;
                case "hours_per_day":
                    settings.hoursPerDay = parseFloat(item.setting_value) || DEFAULT_SETTINGS.hoursPerDay;
                    break;
                case "checkin_time_start":
                    settings.checkinTimeStart = item.setting_value;
                    break;
                case "checkin_time_end":
                    settings.checkinTimeEnd = item.setting_value;
                    break;
                case "checkout_time_start":
                    settings.checkoutTimeStart = item.setting_value;
                    break;
                case "checkout_time_end":
                    settings.checkoutTimeEnd = item.setting_value;
                    break;
                case "late_threshold":
                case "late_threshold_minutes":
                    settings.lateThreshold = parseInt(item.setting_value) || DEFAULT_SETTINGS.lateThreshold;
                    break;
                case "working_days":
                    settings.workingDays = item.setting_value.split(",").map(Number).filter(Boolean);
                    break;
                case "ot_rate_workday":
                    settings.otRateWorkday = parseFloat(item.setting_value) || DEFAULT_SETTINGS.otRateWorkday;
                    break;
                case "ot_rate_weekend":
                    settings.otRateWeekend = parseFloat(item.setting_value) || DEFAULT_SETTINGS.otRateWeekend;
                    break;
                case "ot_rate_holiday":
                    settings.otRateHoliday = parseFloat(item.setting_value) || DEFAULT_SETTINGS.otRateHoliday;
                    break;
                case "ot_require_checkin_workday":
                    settings.requireCheckinWorkday = item.setting_value !== "false";
                    break;
                case "ot_require_checkin_weekend":
                    settings.requireCheckinWeekend = item.setting_value === "true";
                    break;
                case "ot_require_checkin_holiday":
                    settings.requireCheckinHoliday = item.setting_value === "true";
                    break;
                case "require_photo":
                    settings.requirePhoto = item.setting_value !== "false";
                    break;
                case "require_gps":
                    settings.requireGPS = item.setting_value !== "false";
                    break;
                case "require_account_approval":
                    settings.requireAccountApproval = item.setting_value !== "false";
                    break;
                case "enable_notifications":
                    settings.enableNotifications = item.setting_value !== "false";
                    break;
                case "late_deduction_per_minute":
                    settings.latePenaltyPerMinute = parseFloat(item.setting_value) || DEFAULT_SETTINGS.latePenaltyPerMinute;
                    break;
                case "days_per_month":
                    settings.daysPerMonth = parseInt(item.setting_value) || DEFAULT_SETTINGS.daysPerMonth;
                    break;
            }
        });

        // Update cache
        settingsCache = settings;
        cacheTimestamp = now;

        return settings;
    } catch (error) {
        console.error("Error fetching settings:", error);
        return DEFAULT_SETTINGS;
    }
}

/**
 * Get work-related settings only
 */
export async function getWorkSettings(): Promise<WorkSettings> {
    const all = await getSystemSettings();
    return {
        workStartTime: all.workStartTime,
        workEndTime: all.workEndTime,
        hoursPerDay: all.hoursPerDay,
        checkinTimeStart: all.checkinTimeStart,
        checkinTimeEnd: all.checkinTimeEnd,
        checkoutTimeStart: all.checkoutTimeStart,
        checkoutTimeEnd: all.checkoutTimeEnd,
        lateThreshold: all.lateThreshold,
        workingDays: all.workingDays,
    };
}

/**
 * Get OT-related settings only
 */
export async function getOTSettings(): Promise<OTSettings> {
    const all = await getSystemSettings();
    return {
        otRateWorkday: all.otRateWorkday,
        otRateWeekend: all.otRateWeekend,
        otRateHoliday: all.otRateHoliday,
        requireCheckinWorkday: all.requireCheckinWorkday,
        requireCheckinWeekend: all.requireCheckinWeekend,
        requireCheckinHoliday: all.requireCheckinHoliday,
    };
}

/**
 * Update a single setting
 */
export async function updateSetting(key: string, value: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from("system_settings")
            .upsert(
                { setting_key: key, setting_value: value },
                { onConflict: "setting_key" }
            );

        if (error) throw error;

        // Invalidate cache
        settingsCache = null;
        cacheTimestamp = 0;

        return true;
    } catch (error) {
        console.error("Error updating setting:", error);
        return false;
    }
}

/**
 * Update multiple settings at once
 */
export async function updateSettings(settings: Record<string, string>): Promise<boolean> {
    try {
        const updates = Object.entries(settings).map(([key, value]) => ({
            setting_key: key,
            setting_value: value,
        }));

        const { error } = await supabase
            .from("system_settings")
            .upsert(updates, { onConflict: "setting_key" });

        if (error) throw error;

        // Invalidate cache
        settingsCache = null;
        cacheTimestamp = 0;

        return true;
    } catch (error) {
        console.error("Error updating settings:", error);
        return false;
    }
}

/**
 * Clear settings cache (call after external updates)
 */
export function invalidateSettingsCache(): void {
    settingsCache = null;
    cacheTimestamp = 0;
}

/**
 * Get a single setting value with fallback
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
        const { data, error } = await supabase
            .from("system_settings")
            .select("setting_value")
            .eq("setting_key", key)
            .maybeSingle();

        if (error) throw error;

        if (data?.setting_value) {
            // Try to parse as the same type as defaultValue
            if (typeof defaultValue === "number") {
                const parsed = parseFloat(data.setting_value);
                return (isNaN(parsed) ? defaultValue : parsed) as T;
            }
            if (typeof defaultValue === "boolean") {
                return (data.setting_value === "true") as unknown as T;
            }
            return data.setting_value as unknown as T;
        }

        return defaultValue;
    } catch (error) {
        console.error(`Error getting setting ${key}:`, error);
        return defaultValue;
    }
}
