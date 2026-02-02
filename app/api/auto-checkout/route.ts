import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendLineMessage } from "@/lib/line/messaging";
import { format } from "date-fns";
import { th } from "date-fns/locale";

// Auto checkout จะทำงานทุกวัน เวลา 15:00 UTC (22:00 เวลาไทย) ตาม vercel.json cron
// หมายเหตุ: Cron schedule "0 15 * * *" = 15:00 UTC = 22:00 Bangkok Time
export async function GET(request: NextRequest) {
  console.log("[Auto Checkout] Starting auto checkout process...");

  try {
    // ดึงการตั้งค่าเวลาเลิกงานและ auto checkout
    const { data: settings } = await supabaseServer
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "work_end_time",
        "auto_checkout_enabled",
        "auto_checkout_time",
        "auto_checkout_skip_if_ot", // เพิ่ม setting สำหรับข้าม OT
        "notify_admin_on_auto_checkout", // แจ้งเตือน Admin เมื่อ auto checkout
      ]);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { setting_key: string; setting_value: string }) => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    // ถ้า auto checkout ไม่เปิดใช้งาน
    if (settingsMap.auto_checkout_enabled !== "true") {
      console.log("[Auto Checkout] Auto checkout is disabled");
      return NextResponse.json({
        success: true,
        message: "Auto checkout is disabled",
        processed: 0,
      });
    }

    // ใช้เวลาจาก setting (default: 22:00 = 10 PM)
    let autoCheckoutTimeStr = settingsMap.auto_checkout_time || "22:00";
    const skipIfOT = settingsMap.auto_checkout_skip_if_ot !== "false"; // default true
    const notifyAdminOnAutoCheckout = settingsMap.notify_admin_on_auto_checkout !== "false"; // default true
    
    // ตรวจสอบรูปแบบเวลา - ถ้าไม่ใช่ 24-hour format ให้แปลง
    // HTML time input ควรให้ค่าเป็น HH:mm (24-hour) อยู่แล้ว
    // แต่เพื่อความปลอดภัยเราตรวจสอบเพิ่ม
    const timeMatch = autoCheckoutTimeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
      console.error(`[Auto Checkout] Invalid time format: ${autoCheckoutTimeStr}, using default 22:00`);
      autoCheckoutTimeStr = "22:00";
    }
    
    // คำนวณวันที่ในเขตเวลาไทย (UTC+7)
    const now = new Date();
    const bangkokOffset = 7 * 60; // UTC+7 in minutes
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const bangkokTime = new Date(utcTime + bangkokOffset * 60000);
    const today = format(bangkokTime, "yyyy-MM-dd");
    const currentBangkokHour = bangkokTime.getHours();
    const currentBangkokMinute = bangkokTime.getMinutes();

    console.log(`[Auto Checkout] Current Bangkok time: ${format(bangkokTime, "yyyy-MM-dd HH:mm:ss")}`);
    console.log(`[Auto Checkout] Processing for date: ${today}, auto_checkout_time: ${autoCheckoutTimeStr}, skip_if_ot: ${skipIfOT}`);

    // ค้นหาพนักงานที่เช็คอินวันนี้แต่ยังไม่เช็คเอาท์
    const { data: uncheckedOut, error: fetchError } = await supabaseServer
      .from("attendance_logs")
      .select(
        `
        id,
        employee_id,
        clock_in_time,
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

    let processed = 0;
    let skippedOT = 0;
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

        const clockInTime = new Date(attendance.clock_in_time);
        
        // ใช้เวลา checkout จาก setting แทนเวลาปัจจุบัน
        // สร้าง Date object สำหรับเวลา checkout ในวันเดียวกับ clock_in
        const autoCheckoutTime = new Date(`${today}T${autoCheckoutTimeStr}:00+07:00`);

        // คำนวณ total hours จาก clock_in ถึง auto_checkout_time
        const diffMs = autoCheckoutTime.getTime() - clockInTime.getTime();
        const totalHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);

        // อัปเดต attendance log
        const { error: updateError } = await supabaseServer
          .from("attendance_logs")
          .update({
            clock_out_time: autoCheckoutTime.toISOString(),
            total_hours: totalHours,
            auto_checkout: true,
            auto_checkout_reason: `เช็คเอาท์อัตโนมัติ เนื่องจากไม่มีการเช็คเอาท์ก่อนเวลา ${autoCheckoutTimeStr} น.`,
          })
          .eq("id", attendance.id);

        if (updateError) {
          console.error(
            `[Auto Checkout] Error updating attendance ${attendance.id}:`,
            updateError
          );
          errors.push(`${attendance.id}: ${updateError.message}`);
          continue;
        }

        // สร้าง anomaly record
        await supabaseServer.from("attendance_anomalies").insert({
          attendance_id: attendance.id,
          employee_id: attendance.employee_id,
          date: today,
          anomaly_type: "auto_checkout",
          description: `เช็คเอาท์อัตโนมัติเวลา ${autoCheckoutTimeStr} น. (ไม่มีการเช็คเอาท์ก่อนกำหนด)`,
          status: "pending",
        });

        // ส่ง LINE notification (ถ้ามี line_user_id)
        if (employee?.line_user_id) {
          try {
            const message = `⚠️ เช็คเอาท์อัตโนมัติ

คุณ ${employee.name} ถูกเช็คเอาท์อัตโนมัติ
เนื่องจากไม่มีการเช็คเอาท์ก่อนเวลา ${autoCheckoutTimeStr} น.

เวลาเข้างาน: ${format(clockInTime, "HH:mm", { locale: th })} น.
เวลาออก (อัตโนมัติ): ${autoCheckoutTimeStr} น.
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
          `[Auto Checkout] Processed ${employee?.name || attendance.employee_id} - checkout at ${autoCheckoutTimeStr}, ${totalHours.toFixed(2)} hours`
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
      `[Auto Checkout] Completed. Processed: ${processed}, Skipped (OT): ${skippedOT}, Errors: ${errors.length}`
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
