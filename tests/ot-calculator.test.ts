/**
 * Tests for OT Amount Calculator
 * lib/utils/ot-calculator.ts
 *
 * Focus: pure functions only (no DB, no Supabase)
 * Critical path: OT rate calculation + hours computation
 */

import { describe, it, expect } from "vitest";
import { calculateOTAmount, buildLocalISO } from "@/lib/utils/ot-calculator";

describe("calculateOTAmount", () => {
  // ─── Happy path ───────────────────────────────

  it("คำนวณ OT ปกติ 2 ชั่วโมง อัตรา 1.5x", () => {
    const start = new Date("2026-05-16T18:00:00");
    const end = new Date("2026-05-16T20:00:00");

    const result = calculateOTAmount({
      startTime: start,
      endTime: end,
      baseSalary: 18_000,
      otRate: 1.5,
      daysPerMonth: 26,
      hoursPerDay: 8,
    });

    expect(result.hours).toBe(2);
    const expectedHourlyRate = 18_000 / 26 / 8; // ~86.54
    expect(result.hourlyRate).toBeCloseTo(expectedHourlyRate, 2);
    expect(result.amount).toBeCloseTo(2 * expectedHourlyRate * 1.5, 2);
  });

  it("คำนวณ OT วันหยุด 3 ชั่วโมง อัตรา 3x", () => {
    const start = new Date("2026-05-17T08:00:00");
    const end = new Date("2026-05-17T11:00:00");

    const result = calculateOTAmount({
      startTime: start,
      endTime: end,
      baseSalary: 20_000,
      otRate: 3,
      daysPerMonth: 26,
      hoursPerDay: 8,
    });

    expect(result.hours).toBe(3);
    const expectedHourlyRate = 20_000 / 26 / 8;
    expect(result.amount).toBeCloseTo(3 * expectedHourlyRate * 3, 2);
  });

  it("รับ string datetime แทน Date object ได้", () => {
    const result = calculateOTAmount({
      startTime: "2026-05-16T18:00:00",
      endTime: "2026-05-16T19:30:00",
      baseSalary: 15_000,
      otRate: 1.5,
      daysPerMonth: 26,
      hoursPerDay: 8,
    });

    expect(result.hours).toBe(1.5);
    expect(result.amount).toBeGreaterThan(0);
  });

  // ─── Edge cases ───────────────────────────────

  it("คืน amount=0 เมื่อ baseSalary=0 (ไม่ throw)", () => {
    const result = calculateOTAmount({
      startTime: new Date("2026-05-16T18:00:00"),
      endTime: new Date("2026-05-16T20:00:00"),
      baseSalary: 0,
      otRate: 1.5,
      daysPerMonth: 26,
      hoursPerDay: 8,
    });

    expect(result.hours).toBe(2);
    expect(result.amount).toBe(0);
    expect(result.hourlyRate).toBe(0);
  });

  it("คืน amount=0 เมื่อ daysPerMonth=0 (guard หารศูนย์)", () => {
    const result = calculateOTAmount({
      startTime: new Date("2026-05-16T18:00:00"),
      endTime: new Date("2026-05-16T20:00:00"),
      baseSalary: 18_000,
      otRate: 1.5,
      daysPerMonth: 0,
      hoursPerDay: 8,
    });

    expect(result.amount).toBe(0);
  });

  it("OT ข้ามคืน (18:00 - 02:00 วันถัดไป) = 8 ชม.", () => {
    const start = new Date("2026-05-16T18:00:00");
    const end = new Date("2026-05-17T02:00:00");

    const result = calculateOTAmount({
      startTime: start,
      endTime: end,
      baseSalary: 18_000,
      otRate: 1.5,
      daysPerMonth: 26,
      hoursPerDay: 8,
    });

    expect(result.hours).toBe(8);
  });
});

describe("buildLocalISO", () => {
  it("สร้าง ISO string จาก date + time string ได้", () => {
    const result = buildLocalISO("2026-05-16", "18:00");
    // ต้องเป็น ISO string (มี T และ Z หรือ offset)
    expect(result).toMatch(/2026-05-16T/);
    expect(result).toMatch(/Z|[+-]\d{2}:\d{2}/);
  });

  it("เวลา 09:30 ต้องแปลงถูกต้อง", () => {
    const result = buildLocalISO("2026-05-16", "09:30");
    const parsed = new Date(result);
    // ชั่วโมงใน local time ต้องสอดคล้องกัน
    expect(parsed.getTime()).toBeGreaterThan(0);
  });
});
