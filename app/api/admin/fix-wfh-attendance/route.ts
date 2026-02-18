import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin, handleAuthError } from "@/lib/auth/api-middleware";

/**
 * POST /api/admin/fix-wfh-attendance
 * Backfill attendance_logs สำหรับ approved WFH requests ที่ยังไม่มีเวลาทำงาน
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบ admin role
    await requireAdmin(request);
  } catch (authError) {
    return handleAuthError(authError);
  }

  try {
    // ใช้ auth token ของ user (admin) เพื่อ bypass RLS ผ่าน user session
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      token ? {
        global: { headers: { Authorization: `Bearer ${token}` } },
      } : {}
    );

    // ดึงค่า work_start_time / work_end_time จาก system_settings
    const { data: settings } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["work_start_time", "work_end_time"]);

    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: any) => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    const workStart = settingsMap["work_start_time"] || "09:00";
    const workEnd = settingsMap["work_end_time"] || "18:00";

    const [startH, startM] = workStart.split(":").map(Number);
    const [endH, endM] = workEnd.split(":").map(Number);
    const totalHours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;

    // ดึง approved WFH requests เฉพาะวันที่ผ่านไปแล้ว (ไม่รวมวันนี้/อนาคต)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const { data: wfhList, error: wfhErr } = await supabase
      .from("wfh_requests")
      .select("id, employee_id, date")
      .eq("status", "approved")
      .lt("date", todayStr)
      .order("date", { ascending: true });

    if (wfhErr) throw wfhErr;
    if (!wfhList || wfhList.length === 0) {
      return NextResponse.json({ success: true, inserted: 0, message: "ไม่มี WFH ที่ approved" });
    }

    // ดึง attendance_logs ที่มีอยู่
    const { data: existingLogs } = await supabase
      .from("attendance_logs")
      .select("employee_id, work_date");

    const existingSet = new Set(
      (existingLogs || []).map((l: any) => `${l.employee_id}_${l.work_date}`)
    );

    // หารายการที่ขาด
    const missing = wfhList.filter(
      (w: any) => !existingSet.has(`${w.employee_id}_${w.date}`)
    );

    if (missing.length === 0) {
      return NextResponse.json({ success: true, inserted: 0, message: "ข้อมูลครบแล้ว ไม่มีอะไรต้องเพิ่ม" });
    }

    // Insert attendance logs
    let inserted = 0;
    const errors: string[] = [];

    for (const wfh of missing) {
      const dateStr: string = wfh.date;
      const clockIn = new Date(`${dateStr}T${workStart}:00+07:00`).toISOString();
      const clockOut = new Date(`${dateStr}T${workEnd}:00+07:00`).toISOString();

      const { error: insertErr } = await supabase
        .from("attendance_logs")
        .insert({
          employee_id: wfh.employee_id,
          work_date: dateStr,
          clock_in_time: clockIn,
          clock_out_time: clockOut,
          total_hours: totalHours,
          is_late: false,
          late_minutes: 0,
          work_mode: "wfh",
          status: "present",
          note: "บันทึกย้อนหลัง WFH (auto-backfill)",
        });

      if (insertErr) {
        if (insertErr.code === "23505") {
          // already exists - skip
        } else {
          errors.push(`${dateStr} [${wfh.employee_id}]: ${insertErr.message}`);
        }
      } else {
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      total_wfh: wfhList.length,
      missing: missing.length,
      errors,
      workHours: `${workStart} - ${workEnd} (${totalHours} ชม.)`,
    });
  } catch (err: any) {
    console.error("[fix-wfh-attendance]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
