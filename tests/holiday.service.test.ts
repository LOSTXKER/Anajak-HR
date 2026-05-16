/**
 * Tests for Holiday Service — pure functions
 * lib/services/holiday.service.ts  +  lib/utils/holiday.ts (calculateOTAmount)
 *
 * Focus: calculateOTAmount, invalidateHolidayCache, date-pure helpers
 * (DB-dependent: isHoliday, getWorkingDays, getDayType, getOTRateForDate → ไม่ test ที่นี่)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateOTAmount,
  invalidateHolidayCache,
} from "@/lib/services/holiday.service";
import { parseLocalDate, formatLocalDate, calculateDaysInclusive } from "@/lib/utils/date";

// ─── calculateOTAmount (pure) ─────────────────────────────

describe("calculateOTAmount", () => {
  it("คำนวณ OT 2 ชม. อัตรา 1.5x hourly 100 บ. = 300 บ.", () => {
    const result = calculateOTAmount(2, 100, 1.5);
    expect(result).toBe(300);
  });

  it("คำนวณ OT วันหยุด 3 ชม. อัตรา 3x hourly 86.54 บ. ≈ 779 บ.", () => {
    // 18000 / 26 / 8 = 86.538...
    const hourlyRate = 18_000 / 26 / 8;
    const result = calculateOTAmount(3, hourlyRate, 3);
    expect(result).toBeCloseTo(3 * hourlyRate * 3, 2);
  });

  it("OT 0 ชม. = 0 บ.", () => {
    expect(calculateOTAmount(0, 100, 1.5)).toBe(0);
  });

  it("OT rate 0x = 0 บ.", () => {
    expect(calculateOTAmount(4, 100, 0)).toBe(0);
  });

  it("คำนวณค่าทศนิยมถูกต้อง: 1.5 ชม. อัตรา 1.5x hourly 80", () => {
    // 1.5 * 80 * 1.5 = 180
    expect(calculateOTAmount(1.5, 80, 1.5)).toBe(180);
  });
});

// ─── invalidateHolidayCache ───────────────────────────────

describe("invalidateHolidayCache", () => {
  it("เรียกซ้ำได้โดยไม่ throw", () => {
    expect(() => {
      invalidateHolidayCache();
      invalidateHolidayCache();
    }).not.toThrow();
  });
});

// ─── Date utils (used by holiday/leave logic) ─────────────

describe("parseLocalDate + formatLocalDate", () => {
  it("parse YYYY-MM-DD เป็น local date ถูกต้อง", () => {
    const d = parseLocalDate("2026-05-16");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4); // 0-indexed → พฤษภาคม = 4
    expect(d.getDate()).toBe(16);
  });

  it("format กลับเป็น YYYY-MM-DD ถูกต้อง", () => {
    const d = parseLocalDate("2026-05-16");
    expect(formatLocalDate(d)).toBe("2026-05-16");
  });

  it("parse datetime string (มี T) ได้โดยไม่ error", () => {
    const d = parseLocalDate("2026-05-16T08:00:00");
    expect(d.getFullYear()).toBe(2026);
  });
});

describe("calculateDaysInclusive", () => {
  it("วันเดียว = 1 วัน", () => {
    expect(calculateDaysInclusive("2026-05-16", "2026-05-16")).toBe(1);
  });

  it("2 วัน (16-17 พค.) = 2 วัน", () => {
    expect(calculateDaysInclusive("2026-05-16", "2026-05-17")).toBe(2);
  });

  it("1 อาทิตย์ (7 วัน) inclusive ถูกต้อง", () => {
    expect(calculateDaysInclusive("2026-05-11", "2026-05-17")).toBe(7);
  });
});
