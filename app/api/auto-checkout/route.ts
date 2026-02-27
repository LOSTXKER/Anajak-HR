import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendLineMessage } from "@/lib/line/messaging";
import { getTodayTH, getNowTH } from "@/lib/utils/date";
import { format } from "date-fns";
import { th } from "date-fns/locale";

// Auto checkout จะทำงานทุกวัน เวลา 15:00 UTC (22:00 เวลาไทย) ตาม vercel.json cron
// หมายเหตุ: Cron schedule "0 15 * * *" = 15:00 UTC = 22:00 Bangkok Time
export async function GET(request: NextRequest) {
  // ตรวจสอบ CRON_SECRET เพื่อป้องกันการเรียกจากภายนอก
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Auto Checkout] Starting auto checkout process...");

  try {
    // ดึงการตั้งค่าเวลาเลิกงานและ auto checkout
    const { data: settings, error: settingsError } = await supabaseServer
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "work_end_time",
        "auto_checkout_enabled",
        "auto_checkout_time",
        "auto_checkout_skip_if_ot",
        "notify_admin_on_auto_checkout",
      ]);

    if (settingsError) {
      console.error("[Auto Checkout] Error fetching settings:", settingsError);
      throw settingsError;
    }

    if (!settings || settings.length === 0) {
      console.error("[Auto Checkout] No settings found in system_settings table — auto checkout cannot determine configuration");
      return NextResponse.json(
        { success: false, error: "No system settings found. Please check the system_settings table." },
        { status: 500 }
      );
    }

    const settingsMap: Record<string, string> = {};
    settings.forEach((s: { setting_key: string; setting_value: string }) => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    console.log("[Auto Checkout] Settings loaded:", JSON.stringify(settingsMap));

    // ถ้า auto checkout ไม่เปิดใช้งาน
    if (settingsMap.auto_checkout_enabled !== "true") {
      console.log("[Auto Checkout] Auto checkout is disabled");
      return NextResponse.json({
        success: true,
        message: "Auto checkout is disabled",
        processed: 0,
      });
    }

    const autoCheckoutTimeStr = settingsMap.auto_checkout_time || "22:00";
    let workEndTimeStr = settingsMap.work_end_time || "18:00";
    const skipIfOT = settingsMap.auto_checkout_skip_if_ot !== "false";
    const notifyAdminOnAutoCheckout = settingsMap.notify_admin_on_auto_checkout !== "false";
    
    const workEndMatch = workEndTimeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!workEndMatch) {
      console.error(`[Auto Checkout] Invalid work_end_time format: ${workEndTimeStr}, using default 18:00`);
      workEndTimeStr = "18:00";
    }
    
    const today = getTodayTH();
    const bangkokTime = getNowTH();

    console.log(`[Auto Checkout] Current Bangkok time: ${format(bangkokTime, "yyyy-MM-dd HH:mm:ss")}`);
    console.log(`[Auto Checkout] Processing for date: ${today}, work_end_time: ${workEndTimeStr}, auto_checkout_time: ${autoCheckoutTimeStr}, skip_if_ot: ${skipIfOT}`);

    // ค้นหาพนักงานที่เช็คอินวันนี้แต่ยังไม่เช็คเอาท์
    const { data: uncheckedOut, error: fetchError } = await supabaseServer
      .from("attendance_logs")
      .select(
        `
        id,
        employee_id,
        clock_in_time,
        work_mode,
        employees!employee_id (
          id,
          name,
          email,
          line_user_id
        )
      `
      )
      .eq("work_date", today)
      .is("clock_out_time", null);

    if (fetchError) {
      console.error("[Auto Checkout] Error fetching unchecked out:", fetchError);
      throw fetchError;
    }

    if (!uncheckedOut || uncheckedOut.length === 0) {
      console.log("[Auto Checkout] No unchecked out employees found");
      return NextResponse.json({
        success: true,
        message: "No unchecked out employees",
        processed: 0,
      });
    }

    console.log(
      `[Auto Checkout] Found ${uncheckedOut.length} employees to process`
    );

    // ดึง OT ที่ approved/started สำหรับวันนี้ (ถ้าเปิด skip_if_ot)
    let employeesWithOT = new Set<string>();
    if (skipIfOT) {
      const { data: activeOTs } = await supabaseServer
        .from("ot_requests")
        .select("employee_id")
        .eq("request_date", today)
        .in("status", ["approved", "started"]);

      employeesWithOT = new Set(activeOTs?.map((ot: { employee_id: string }) => ot.employee_id) || []);
      console.log(`[Auto Checkout] Found ${employeesWithOT.size} employees with active OT`);
    }

    // ดึง WFH ที่ approved สำหรับวันนี้ (ข้าม auto-checkout เพราะ WFH ทำงานที่บ้าน)
    const { data: activeWFHs } = await supabaseServer
      .from("wfh_requests")
      .select("employee_id")
      .eq("date", today)
      .eq("status", "approved");

    const employeesWithWFH = new Set<string>(
      activeWFHs?.map((w: { employee_id: string }) => w.employee_id) || []
    );
    console.log(`[Auto Checkout] Found ${employeesWithWFH.size} employees with approved WFH`);

    let processed = 0;
    let skippedOT = 0;
    let skippedWFH = 0;
    const errors: string[] = [];

    for (const attendance of uncheckedOut) {
      try {
        const employee = attendance.employees as unknown as {
          id: string;
          name: string;
          email: string;
          line_user_id?: string;
        };

        // ข้ามพนักงานที่มี OT approved/started
        if (skipIfOT && employeesWithOT.has(attendance.employee_id)) {
          console.log(`[Auto Checkout] Skipping ${employee?.name || attendance.employee_id} - has approved/started OT`);
          skippedOT++;
          continue;
        }

        // ข้ามพนักงานที่มี WFH approved หรือ work_mode='wfh'
        const attRecord = attendance as any;
        if (employeesWithWFH.has(attendance.employee_id) || attRecord.work_mode === "wfh") {
          console.log(`[Auto Checkout] Skipping ${employee?.name || attendance.employee_id} - WFH day`);
          skippedWFH++;
          continue;
        }

        if (!attendance.clock_in_time) {
          console.warn(`[Auto Checkout] Skipping ${attendance.id} — no clock_in_time`);
          continue;
        }

        const clockInTime = new Date(attendance.clock_in_time);
        const checkoutTime = new Date(`${today}T${workEndTimeStr}:00+07:00`);

        // คำนวณ total hours จาก clock_in ถึง work_end_time
        const diffMs = checkoutTime.getTime() - clockInTime.getTime();
        const totalHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);

        // อัปเดต attendance log (guard: clock_out_time IS NULL เพื่อป้องกัน overwrite ถ้า manual checkout เกิดขึ้นระหว่าง query กับ update)
        const { data: updateData, error: updateError } = await supabaseServer
          .from("attendance_logs")
          .update({
            clock_out_time: checkoutTime.toISOString(),
            total_hours: totalHours,
            auto_checkout: true,
            auto_checkout_reason: `เช็คเอาท์อัตโนมัติเวลา ${workEndTimeStr} น. (เวลาเลิกงาน) เนื่องจากไม่มีการเช็คเอาท์ก่อนเวลา ${autoCheckoutTimeStr} น.`,
          })
          .eq("id", attendance.id)
          .is("clock_out_time", null)
          .select("id");

        if (updateError) {
          console.error(
            `[Auto Checkout] Error updating attendance ${attendance.id}:`,
            updateError
          );
          errors.push(`${attendance.id}: ${updateError.message}`);
          continue;
        }

        if (!updateData || updateData.length === 0) {
          console.log(`[Auto Checkout] Skipping ${employee?.name || attendance.employee_id} — already checked out manually`);
          continue;
        }

        // สร้าง anomaly record
        await supabaseServer.from("attendance_anomalies").insert({
          attendance_id: attendance.id,
          employee_id: attendance.employee_id,
          date: today,
          anomaly_type: "auto_checkout",
          description: `เช็คเอาท์อัตโนมัติเวลา ${workEndTimeStr} น. (เวลาเลิกงาน) เนื่องจากไม่มีการเช็คเอาท์ก่อน ${autoCheckoutTimeStr} น.`,
          status: "pending",
        });

        // ส่ง LINE notification (ถ้ามี line_user_id)
        if (employee?.line_user_id) {
          try {
            const message = `⚠️ เช็คเอาท์อัตโนมัติ

คุณ ${employee.name} ถูกเช็คเอาท์อัตโนมัติ
เนื่องจากไม่มีการเช็คเอาท์ก่อนเวลา ${autoCheckoutTimeStr} น.

เวลาเข้างาน: ${format(new Date(clockInTime.getTime() + 7 * 60 * 60 * 1000), "HH:mm", { locale: th })} น.
เวลาออก (ตามเวลาเลิกงาน): ${workEndTimeStr} น.
ชั่วโมงทำงาน: ${totalHours.toFixed(2)} ชม.

หากข้อมูลไม่ถูกต้อง กรุณาติดต่อ HR เพื่อแก้ไข`;

            await sendLineMessage(message, employee.line_user_id);
          } catch (lineError) {
            console.error(
              `[Auto Checkout] Error sending LINE notification:`,
              lineError
            );
          }
        }

        processed++;
        console.log(
          `[Auto Checkout] Processed ${employee?.name || attendance.employee_id} - checkout at ${workEndTimeStr} (work_end_time), ${totalHours.toFixed(2)} hours`
        );
      } catch (err) {
        console.error(
          `[Auto Checkout] Error processing attendance ${attendance.id}:`,
          err
        );
        errors.push(`${attendance.id}: Unknown error`);
      }
    }

    console.log(
      `[Auto Checkout] Completed. Processed: ${processed}, Skipped (OT): ${skippedOT}, Skipped (WFH): ${skippedWFH}, Errors: ${errors.length}`
    );

    // Send anomaly notification to admin if there were auto checkouts (check setting first)
    if (processed > 0 && notifyAdminOnAutoCheckout) {
      try {
        const message = `⚠️ แจ้งเตือน Attendance ผิดปกติ

📅 วันที่: ${format(bangkokTime, "d MMMM yyyy", { locale: th })}
👥 พนักงานถูก Auto-Checkout: ${processed} คน
${skippedOT > 0 ? `⏭️ ข้าม (มี OT): ${skippedOT} คน\n` : ""}
⚠️ ประเภท: ลืมเช็คเอาท์ (Auto checkout)

กรุณาตรวจสอบในระบบ`;
        await sendLineMessage(message);
      } catch (notifError) {
        console.error("[Auto Checkout] Error sending admin notification:", notifError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto checkout completed`,
      processed,
      skippedOT,
      skippedWFH,
      total: uncheckedOut.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    console.error("[Auto Checkout] Fatal error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// POST สำหรับ manual trigger
export async function POST(request: NextRequest) {
  // ใช้ GET handler เดิม
  return GET(request);
}
