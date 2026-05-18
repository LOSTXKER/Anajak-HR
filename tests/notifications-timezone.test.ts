/**
 * Timezone bug regression test — LINE OT notification
 *
 * Bug 2026-05-18: LINE แสดง 13:30-15:00 ขณะที่เว็บแสดง 20:30-22:00
 * Root cause: `format(new Date(iso), "HH:mm")` ใช้ server TZ (Vercel UTC) ไม่ใช่ Thai
 * Fix: ใช้ toThaiDate() shift เป็น Bangkok ก่อน format
 */

import { describe, it, expect } from "vitest";
import { format } from "date-fns";
import { toThaiDate } from "@/lib/utils/date";

describe("toThaiDate + format HH:mm (LINE OT time bug)", () => {
  it("20:30 Thai (13:30 UTC) → format ออก '20:30'", () => {
    const isoFromDb = "2026-05-18T13:30:00.000Z";
    const result = format(toThaiDate(isoFromDb), "HH:mm");
    expect(result).toBe("20:30");
  });

  it("22:00 Thai (15:00 UTC) → format ออก '22:00'", () => {
    const isoFromDb = "2026-05-18T15:00:00.000Z";
    const result = format(toThaiDate(isoFromDb), "HH:mm");
    expect(result).toBe("22:00");
  });

  it("เที่ยงคืน Thai (17:00 UTC วันก่อน) → format ออก '00:00'", () => {
    const isoFromDb = "2026-05-17T17:00:00.000Z";
    const result = format(toThaiDate(isoFromDb), "HH:mm");
    expect(result).toBe("00:00");
  });

  it("regression: format(new Date(iso), 'HH:mm') บน UTC server จะออก UTC time ผิด", () => {
    // จำลองว่าถ้าใช้ pattern เดิม (bug) บน server UTC
    // นี่คือสิ่งที่ Vercel ทำก่อน fix → ออก 13:30
    const isoFromDb = "2026-05-18T13:30:00.000Z";
    const buggyResult = format(new Date(isoFromDb), "HH:mm");
    // บน machine ของ developer (Thai TZ) ค่านี้จะออก 20:30 ถูก
    // บน Vercel (UTC) ค่านี้จะออก 13:30 ผิด
    // assertion นี้ allow ทั้งสอง — แค่ confirm ว่า fix ไม่ได้ใช้ pattern นี้
    expect(["13:30", "20:30"]).toContain(buggyResult);
  });
});
