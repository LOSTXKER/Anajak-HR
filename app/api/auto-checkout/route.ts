import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendLineMessage } from "@/lib/line/messaging";
import { format } from "date-fns";
import { th } from "date-fns/locale";

// Auto checkout จะทำงานทุกวัน เวลา 22:00 (ตาม vercel.json cron)
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

    const workEndTime = settingsMap.work_end_time || "18:00";
    const today = format(new Date(), "yyyy-MM-dd");

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
      .gte("clock_in_time", `${today}T00:00:00`)
      .lt("clock_in_time", `${today}T23:59:59`)
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
      `[Auto Checkout] Found ${uncheckedOut.length} employees to auto checkout`
    );

    let processed = 0;
    const errors: string[] = [];

    for (const attendance of uncheckedOut) {
      try {
        const clockInTime = new Date(attendance.clock_in_time);
        const autoCheckoutTime = new Date();

        // คำนวณ total hours
        const diffMs = autoCheckoutTime.getTime() - clockInTime.getTime();
        const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

        // อัปเดต attendance log
        const { error: updateError } = await supabaseServer
          .from("attendance_logs")
          .update({
            clock_out_time: autoCheckoutTime.toISOString(),
            total_hours: totalHours,
            auto_checkout: true,
            auto_checkout_reason: `เช็คเอาท์อัตโนมัติ เนื่องจากไม่มีการเช็คเอาท์ก่อนเวลา ${settingsMap.auto_checkout_time || "22:00"}`,
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
          description: `เช็คเอาท์อัตโนมัติเวลา ${format(autoCheckoutTime, "HH:mm")} น. (ไม่มีการเช็คเอาท์ก่อนเวลา ${settingsMap.auto_checkout_time || "22:00"})`,
          status: "pending",
        });

        // ส่ง LINE notification (ถ้ามี line_user_id)
        const employee = attendance.employees as unknown as {
          id: string;
          name: string;
          email: string;
          line_user_id?: string;
        };

        if (employee?.line_user_id) {
          try {
            const message = `⚠️ เช็คเอาท์อัตโนมัติ

คุณ ${employee.name} ถูกเช็คเอาท์อัตโนมัติ
เนื่องจากไม่มีการเช็คเอาท์ก่อนเวลา ${settingsMap.auto_checkout_time || "22:00"} น.

เวลาเข้างาน: ${format(clockInTime, "HH:mm", { locale: th })} น.
เวลาออก (อัตโนมัติ): ${format(autoCheckoutTime, "HH:mm", { locale: th })} น.
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
          `[Auto Checkout] Processed ${employee?.name || attendance.employee_id}`
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
      `[Auto Checkout] Completed. Processed: ${processed}, Errors: ${errors.length}`
    );

    return NextResponse.json({
      success: true,
      message: `Auto checkout completed`,
      processed,
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

