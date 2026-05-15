/**
 * Tests for Attendance Service — pure functions
 * lib/services/attendance.service.ts
 *
 * Focus: calculateWorkHours, calculateWorkProgress, formatWorkDuration
 * (DB-dependent functions: checkIn, checkOut, getTodayAttendance → ไม่ test ที่นี่)
 */

import { describe, it, expect } from "vitest";
import {
  calculateWorkHours,
  calculateWorkProgress,
  formatWorkDuration,
} from "@/lib/services/attendance.service";
import type { AttendanceLog } from "@/lib/types";

// ─── Helper ───────────────────────────────────────────────

function makeLog(clockIn: string, clockOut?: string): AttendanceLog {
  return {
    id: "test-id",
    employee_id: "emp-1",
    work_date: "2026-05-16",
    clock_in_time: clockIn,
    clock_out_time: clockOut ?? null,
    is_late: false,
    late_minutes: 0,
    status: "present",
    created_at: clockIn,
    updated_at: clockIn,
  } as unknown as AttendanceLog;
}

// ─── calculateWorkHours ───────────────────────────────────

describe("calculateWorkHours", () => {
  it("คำนวณชั่วโมงทำงาน 8 ชม. ถูกต้อง", () => {
    const log = makeLog(
      "2026-05-16T09:00:00.000Z",
      "2026-05-16T17:00:00.000Z"
    );
    expect(calculateWorkHours(log)).toBeCloseTo(8, 1);
  });

  it("คำนวณ 30 นาที ถูกต้อง", () => {
    const log = makeLog(
      "2026-05-16T09:00:00.000Z",
      "2026-05-16T09:30:00.000Z"
    );
    expect(calculateWorkHours(log)).toBeCloseTo(0.5, 2);
  });

  it("คืน 0 เมื่อไม่มี clock_in_time", () => {
    const log = makeLog("", undefined);
    log.clock_in_time = null as unknown as string;
    expect(calculateWorkHours(log)).toBe(0);
  });

  it("คำนวณ OT ข้ามวัน (10 ชม.) ได้", () => {
    const log = makeLog(
      "2026-05-16T22:00:00.000Z",
      "2026-05-17T08:00:00.000Z"
    );
    expect(calculateWorkHours(log)).toBeCloseTo(10, 1);
  });

  it("ถ้าไม่มี clock_out_time ต้องคืนค่า > 0 (ใช้เวลาปัจจุบัน)", () => {
    // เช็คอินเมื่อ 1 ชม. ที่ผ่านมา
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const log = makeLog(oneHourAgo, undefined);
    const hours = calculateWorkHours(log);
    // ต้องอยู่ระหว่าง 0.9-1.1 ชม.
    expect(hours).toBeGreaterThan(0.9);
    expect(hours).toBeLessThan(1.1);
  });
});

// ─── calculateWorkProgress ────────────────────────────────

describe("calculateWorkProgress", () => {
  it("8 ชม. / 8 ชม. = 100%", () => {
    const log = makeLog(
      "2026-05-16T09:00:00.000Z",
      "2026-05-16T17:00:00.000Z"
    );
    expect(calculateWorkProgress(log, 8)).toBe(100);
  });

  it("4 ชม. / 8 ชม. = 50%", () => {
    const log = makeLog(
      "2026-05-16T09:00:00.000Z",
      "2026-05-16T13:00:00.000Z"
    );
    expect(calculateWorkProgress(log, 8)).toBeCloseTo(50, 0);
  });

  it("ทำงานเกิน 8 ชม. ต้อง cap ที่ 100 (ไม่เกิน)", () => {
    const log = makeLog(
      "2026-05-16T09:00:00.000Z",
      "2026-05-16T22:00:00.000Z"
    );
    expect(calculateWorkProgress(log, 8)).toBe(100);
  });
});

// ─── formatWorkDuration ───────────────────────────────────

describe("formatWorkDuration", () => {
  it("format 8 ชม. เป็น 08:00:00", () => {
    const log = makeLog(
      "2026-05-16T09:00:00.000Z",
      "2026-05-16T17:00:00.000Z"
    );
    expect(formatWorkDuration(log)).toBe("08:00:00");
  });

  it("format 1 ชม. 30 นาที 45 วินาที", () => {
    const start = new Date("2026-05-16T09:00:00.000Z");
    const end = new Date(start.getTime() + (1 * 3600 + 30 * 60 + 45) * 1000);
    const log = makeLog(start.toISOString(), end.toISOString());
    expect(formatWorkDuration(log)).toBe("01:30:45");
  });

  it("คืน 00:00:00 เมื่อไม่มี clock_in_time", () => {
    const log = makeLog("", undefined);
    log.clock_in_time = null as unknown as string;
    expect(formatWorkDuration(log)).toBe("00:00:00");
  });
});
