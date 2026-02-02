/**
 * Attendance Service
 * =============================================
 * Service for attendance operations (check-in, check-out, etc.)
 */

import { supabase } from "@/lib/supabase/client";
import { format, differenceInMinutes, parseISO } from "date-fns";
import { getSystemSettings } from "./settings.service";
import type { AttendanceLog, Location } from "@/lib/types";

/**
 * Get today's attendance for an employee
 * @param employeeId - Employee ID
 */
export async function getTodayAttendance(employeeId: string): Promise<AttendanceLog | null> {
    const today = format(new Date(), "yyyy-MM-dd");

    try {
        const { data, error } = await supabase
            .from("attendance_logs")
            .select("*")
            .eq("employee_id", employeeId)
            .eq("work_date", today)
            .maybeSingle();

        if (error) throw error;

        return data as AttendanceLog | null;
    } catch (error) {
        console.error("Error fetching today attendance:", error);
        return null;
    }
}

/**
 * Get attendance for a specific date
 * @param employeeId - Employee ID
 * @param date - Date string in format 'YYYY-MM-DD'
 */
export async function getAttendanceForDate(
    employeeId: string,
    date: string
): Promise<AttendanceLog | null> {
    try {
        const { data, error } = await supabase
            .from("attendance_logs")
            .select("*")
            .eq("employee_id", employeeId)
            .eq("work_date", date)
            .maybeSingle();

        if (error) throw error;

        return data as AttendanceLog | null;
    } catch (error) {
        console.error("Error fetching attendance:", error);
        return null;
    }
}

/**
 * Get attendance for a date range
 * @param employeeId - Employee ID
 * @param startDate - Start date in format 'YYYY-MM-DD'
 * @param endDate - End date in format 'YYYY-MM-DD'
 */
export async function getAttendanceForRange(
    employeeId: string,
    startDate: string,
    endDate: string
): Promise<AttendanceLog[]> {
    try {
        const { data, error } = await supabase
            .from("attendance_logs")
            .select("*")
            .eq("employee_id", employeeId)
            .gte("work_date", startDate)
            .lte("work_date", endDate)
            .order("work_date", { ascending: false });

        if (error) throw error;

        return (data || []) as AttendanceLog[];
    } catch (error) {
        console.error("Error fetching attendance range:", error);
        return [];
    }
}

/**
 * Check in an employee (using atomic RPC to prevent race conditions)
 * @param employeeId - Employee ID
 * @param location - GPS location (optional)
 * @param photoUrl - Photo URL (optional)
 */
export async function checkIn(
    employeeId: string,
    location?: Location | null,
    photoUrl?: string | null
): Promise<{ success: boolean; data?: AttendanceLog; error?: string; isLate?: boolean }> {
    const today = format(new Date(), "yyyy-MM-dd");
    const nowTime = new Date().toISOString();

    try {
        // Check if late
        const settings = await getSystemSettings();
        const workStartTime = settings.workStartTime;
        const lateThreshold = settings.lateThreshold;

        const workStart = new Date(`${today}T${workStartTime}:00`);
        const now = new Date();
        const lateMinutes = Math.max(0, differenceInMinutes(now, workStart) - lateThreshold);
        const isLate = lateMinutes > 0;

        // Use atomic RPC to prevent race conditions
        const { data: result, error } = await supabase.rpc("atomic_checkin", {
            p_employee_id: employeeId,
            p_work_date: today,
            p_clock_in_time: nowTime,
            p_clock_in_location: location || null,
            p_clock_in_photo_url: photoUrl || null,
            p_is_late: isLate,
            p_late_minutes: isLate ? lateMinutes : 0,
        });

        if (error) throw error;

        // Parse the result from the RPC
        if (!result.success) {
            return { success: false, error: result.error };
        }

        return { success: true, data: result.data as AttendanceLog, isLate };
    } catch (error) {
        console.error("Error checking in:", error);
        return { success: false, error: "Failed to check in" };
    }
}

/**
 * Check out an employee (using atomic RPC to prevent race conditions)
 * @param employeeId - Employee ID
 * @param location - GPS location (optional)
 * @param photoUrl - Photo URL (optional)
 */
export async function checkOut(
    employeeId: string,
    location?: Location | null,
    photoUrl?: string | null
): Promise<{ success: boolean; data?: AttendanceLog; error?: string }> {
    const today = format(new Date(), "yyyy-MM-dd");
    const nowTime = new Date().toISOString();

    try {
        // Use atomic RPC to prevent race conditions
        const { data: result, error } = await supabase.rpc("atomic_checkout", {
            p_employee_id: employeeId,
            p_work_date: today,
            p_clock_out_time: nowTime,
            p_clock_out_location: location || null,
            p_clock_out_photo_url: photoUrl || null,
        });

        if (error) throw error;

        // Parse the result from the RPC
        if (!result.success) {
            return { success: false, error: result.error };
        }

        return { success: true, data: result.data as AttendanceLog };
    } catch (error) {
        console.error("Error checking out:", error);
        return { success: false, error: "Failed to check out" };
    }
}

/**
 * Calculate work hours for an attendance record
 * @param attendance - Attendance log
 */
export function calculateWorkHours(attendance: AttendanceLog): number {
    if (!attendance.clock_in_time) return 0;

    const clockIn = new Date(attendance.clock_in_time);
    const clockOut = attendance.clock_out_time
        ? new Date(attendance.clock_out_time)
        : new Date();

    const minutes = differenceInMinutes(clockOut, clockIn);
    return Math.max(0, minutes / 60);
}

/**
 * Calculate work progress percentage
 * @param attendance - Attendance log
 * @param expectedHours - Expected work hours (default: 8)
 */
export function calculateWorkProgress(attendance: AttendanceLog, expectedHours: number = 8): number {
    const hours = calculateWorkHours(attendance);
    return Math.min(100, (hours / expectedHours) * 100);
}

/**
 * Format work duration string (HH:MM:SS)
 * @param attendance - Attendance log
 */
export function formatWorkDuration(attendance: AttendanceLog): string {
    if (!attendance.clock_in_time) return "00:00:00";

    const clockIn = new Date(attendance.clock_in_time);
    const clockOut = attendance.clock_out_time
        ? new Date(attendance.clock_out_time)
        : new Date();

    const totalSeconds = Math.floor((clockOut.getTime() - clockIn.getTime()) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Get all employees' attendance for a date
 * @param date - Date string in format 'YYYY-MM-DD'
 */
export async function getAllAttendanceForDate(date: string): Promise<AttendanceLog[]> {
    try {
        const { data, error } = await supabase
            .from("attendance_logs")
            .select("*, employee:employees(*)")
            .eq("work_date", date)
            .order("clock_in_time", { ascending: true });

        if (error) throw error;

        return (data || []) as AttendanceLog[];
    } catch (error) {
        console.error("Error fetching all attendance:", error);
        return [];
    }
}

/**
 * Create or update attendance (for OT start on holidays)
 * @param employeeId - Employee ID
 * @param date - Date string in format 'YYYY-MM-DD'
 * @param clockInTime - Clock in time
 * @param location - GPS location (optional)
 * @param photoUrl - Photo URL (optional)
 */
export async function createOrUpdateAttendance(
    employeeId: string,
    date: string,
    clockInTime: string,
    location?: Location | null,
    photoUrl?: string | null
): Promise<AttendanceLog | null> {
    try {
        // Check if already exists
        const existing = await getAttendanceForDate(employeeId, date);

        if (existing) {
            // Update if needed
            return existing;
        }

        // Create new
        const { data, error } = await supabase
            .from("attendance_logs")
            .insert({
                employee_id: employeeId,
                work_date: date,
                clock_in_time: clockInTime,
                clock_in_location: location,
                clock_in_photo_url: photoUrl,
                is_late: false,
                late_minutes: 0,
            })
            .select()
            .single();

        if (error) throw error;

        return data as AttendanceLog;
    } catch (error) {
        console.error("Error creating attendance:", error);
        return null;
    }
}
