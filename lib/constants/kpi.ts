/**
 * Shared KPI constants – labels and colours for period & goal statuses.
 */

export const KPI_PERIOD_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "แบบร่าง", color: "#86868b" },
  goal_setting: { label: "ตั้งเป้าหมาย", color: "#ff9f0a" },
  in_progress: { label: "กำลังดำเนินการ", color: "#007aff" },
  evaluating: { label: "ช่วงประเมิน", color: "#bf5af2" },
  closed: { label: "ปิดแล้ว", color: "#30d158" },
};

export const KPI_GOAL_STATUS_LABELS: Record<string, string> = {
  pending_approval: "รออนุมัติ",
  in_progress: "ดำเนินการ",
  completed: "สำเร็จ",
  rejected: "ไม่อนุมัติ",
};

export const KPI_CATEGORY_LABELS: Record<string, string> = {
  attendance: "การมาทำงาน",
  work_quality: "คุณภาพงาน",
  goals: "เป้าหมาย",
  competency: "สมรรถนะ",
};
