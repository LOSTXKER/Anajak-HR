import { describe, expect, it } from "vitest";
import {
  calculateEmploymentProrationRatio,
  type EmploymentHistoryRecord,
} from "@/lib/utils/employment";

const EMP_ID = "emp-payroll";
const MONTH_START = "2026-08-01";
const MONTH_END = "2026-08-31";
const DAYS_PER_MONTH = 30;

describe("calculateEmploymentProrationRatio", () => {
  it("จ่ายเงินเดือนเต็มเมื่อเป็นพนักงานตลอดเดือน แม้เดือนนั้นมีวันจันทร์-ศุกร์เพียง 21 วัน", () => {
    const ratio = calculateEmploymentProrationRatio(
      EMP_ID,
      MONTH_START,
      MONTH_END,
      [],
      DAYS_PER_MONTH
    );

    expect(ratio).toBe(1);
    expect(Math.round(13_000 * ratio)).toBe(13_000);
  });

  it("จ่ายเงินเดือนเต็มในเดือนกุมภาพันธ์แม้มีเพียง 28 วัน", () => {
    const history: EmploymentHistoryRecord[] = [
      {
        employee_id: EMP_ID,
        action: "hired",
        effective_date: "2026-01-01",
      },
    ];

    expect(
      calculateEmploymentProrationRatio(
        EMP_ID,
        "2026-02-01",
        "2026-02-28",
        history,
        DAYS_PER_MONTH
      )
    ).toBe(1);
  });

  it("เฉลี่ยเฉพาะจำนวนวันตามปฏิทินหลังเริ่มงานกลางเดือน", () => {
    const history: EmploymentHistoryRecord[] = [
      {
        employee_id: EMP_ID,
        action: "hired",
        effective_date: "2026-08-17",
      },
    ];

    const ratio = calculateEmploymentProrationRatio(
      EMP_ID,
      MONTH_START,
      MONTH_END,
      history,
      DAYS_PER_MONTH
    );

    expect(ratio).toBe(15 / 30);
    expect(Math.round(30_000 * ratio)).toBe(15_000);
  });

  it("เฉลี่ยเฉพาะช่วงก่อนวันลาออก โดยวันลาออกเป็นวันแรกที่พ้นสภาพ", () => {
    const history: EmploymentHistoryRecord[] = [
      {
        employee_id: EMP_ID,
        action: "hired",
        effective_date: "2026-01-01",
      },
      {
        employee_id: EMP_ID,
        action: "resigned",
        effective_date: "2026-08-17",
      },
    ];

    const ratio = calculateEmploymentProrationRatio(
      EMP_ID,
      MONTH_START,
      MONTH_END,
      history,
      DAYS_PER_MONTH
    );

    expect(ratio).toBe(16 / 30);
    expect(Math.round(30_000 * ratio)).toBe(16_000);
  });

  it("จ่ายหนึ่งวันเมื่อเริ่มงานวันสุดท้ายของเดือน", () => {
    const history: EmploymentHistoryRecord[] = [
      {
        employee_id: EMP_ID,
        action: "hired",
        effective_date: "2026-08-31",
      },
    ];

    const ratio = calculateEmploymentProrationRatio(
      EMP_ID,
      MONTH_START,
      MONTH_END,
      history,
      DAYS_PER_MONTH
    );

    expect(ratio).toBe(1 / 30);
    expect(Math.round(30_000 * ratio)).toBe(1_000);
  });

  it("ไม่ทำวันสิ้นเดือนหายเมื่อวันลาออกมีผลวันแรกของเดือนถัดไป", () => {
    const history: EmploymentHistoryRecord[] = [
      {
        employee_id: EMP_ID,
        action: "hired",
        effective_date: "2026-01-01",
      },
      {
        employee_id: EMP_ID,
        action: "resigned",
        effective_date: "2026-09-01",
      },
    ];

    const ratio = calculateEmploymentProrationRatio(
      EMP_ID,
      MONTH_START,
      MONTH_END,
      history,
      DAYS_PER_MONTH
    );

    expect(ratio).toBe(1);
    expect(Math.round(30_000 * ratio)).toBe(30_000);
  });
});
