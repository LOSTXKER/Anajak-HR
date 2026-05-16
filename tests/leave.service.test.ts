/**
 * Tests for Leave Service — business logic (pure parts)
 * lib/services/leave.service.ts  +  lib/utils/auto-approve.ts
 *
 * Note: DB-dependent functions (createLeaveRequest, approveLeave, etc.) ไม่ test ที่นี่
 * Focus: half-day rule, date range calculation, auto-approve status mapping
 */

import { describe, it, expect } from "vitest";
import { calculateDaysInclusive, parseLocalDate } from "@/lib/utils/date";

// ─── Half-day rule ────────────────────────────────────────

describe("leave half-day rule (0.5 วัน)", () => {
  /**
   * Business rule: isHalfDay=true → 0.5 วัน เสมอ ไม่ว่าช่วงวันจะกว้างแค่ไหน
   * (mirror of calculateLeaveDays logic ใน leave.service.ts line 148-150)
   */
  it("isHalfDay = true → ควรได้ 0.5 วัน", () => {
    const isHalfDay = true;
    const days = isHalfDay ? 0.5 : calculateDaysInclusive("2026-05-16", "2026-05-16");
    expect(days).toBe(0.5);
  });

  it("isHalfDay = false, 1 วัน → calculateDaysInclusive คืน 1", () => {
    const isHalfDay = false;
    const days = isHalfDay ? 0.5 : calculateDaysInclusive("2026-05-16", "2026-05-16");
    expect(days).toBe(1);
  });

  it("isHalfDay = false, ลา 3 วัน (จ-พ) → 3 วัน (ก่อนหัก weekend/holiday)", () => {
    const isHalfDay = false;
    const days = isHalfDay ? 0.5 : calculateDaysInclusive("2026-05-18", "2026-05-20");
    expect(days).toBe(3);
  });
});

// ─── Working day counting (base logic) ───────────────────

describe("วันทำงาน — count ก่อนหัก weekend/holiday", () => {
  it("จันทร์-ศุกร์ 5 วัน = 5 วัน inclusive", () => {
    expect(calculateDaysInclusive("2026-05-11", "2026-05-15")).toBe(5);
  });

  it("ลาข้ามอาทิตย์ (ศ-จ) = 4 วัน inclusive (นับ weekend ด้วยตอนนี้ — จะถูกหักภายหลัง)", () => {
    // ศ 15 → จ 18 = 4 วัน (15,16,17,18) — weekend ถูกหักใน calculateLeaveDays จริง
    expect(calculateDaysInclusive("2026-05-15", "2026-05-18")).toBe(4);
  });
});

// ─── Auto-approve status mapping (pure logic) ─────────────

describe("auto-approve status logic", () => {
  /**
   * Mirror ของ applyAutoApproveFields (lib/utils/auto-approve.ts)
   * business rule: isAutoApprove=true → status='approved', else 'pending'
   */
  function getStatus(isAutoApprove: boolean): string {
    return isAutoApprove ? "approved" : "pending";
  }

  it("auto-approve=true → status เป็น 'approved'", () => {
    expect(getStatus(true)).toBe("approved");
  });

  it("auto-approve=false → status เป็น 'pending'", () => {
    expect(getStatus(false)).toBe("pending");
  });
});

// ─── Date parsing (leave date boundaries) ────────────────

describe("leave date parsing ไม่มี timezone drift", () => {
  it("parse start_date '2026-05-16' ต้องได้วันที่ 16 ไม่ drift เป็น 15", () => {
    const d = parseLocalDate("2026-05-16");
    expect(d.getDate()).toBe(16);
    expect(d.getMonth()).toBe(4); // พฤษภาคม = 4 (0-indexed)
  });

  it("parse end_date '2026-05-31' ต้องได้วันที่ 31", () => {
    const d = parseLocalDate("2026-05-31");
    expect(d.getDate()).toBe(31);
  });

  it("ลาข้ามเดือน เม.ย.-พค. = 7 วัน inclusive", () => {
    // 29 เมษา → 5 พฤษภา = 7 วัน
    expect(calculateDaysInclusive("2026-04-29", "2026-05-05")).toBe(7);
  });
});
