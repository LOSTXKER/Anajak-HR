export const APP_VERSION = "1.1.0";

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  type: "major" | "minor" | "patch";
  changes: {
    category: "feat" | "fix" | "improve" | "remove";
    description: string;
  }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.1.0",
    date: "2026-03-18",
    title: "Push Notification สำหรับประกาศ",
    type: "minor",
    changes: [
      {
        category: "feat",
        description: "ส่ง Push Notification ไปหาพนักงานทุกคนเมื่อมีประกาศใหม่",
      },
      {
        category: "feat",
        description: "รองรับส่ง Push เฉพาะสาขาตาม target ที่เลือก",
      },
      {
        category: "fix",
        description: "แก้ไขปุ่มเผยแพร่ประกาศไม่ส่งแจ้งเตือนไปหาพนักงาน",
      },
      {
        category: "feat",
        description: "เพิ่มหน้าแสดงเวอร์ชันและ Patch Notes",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-15",
    title: "เวอร์ชันแรก",
    type: "major",
    changes: [
      {
        category: "feat",
        description: "ระบบเช็คอิน/เช็คเอาท์พร้อม GPS",
      },
      {
        category: "feat",
        description: "ระบบจัดการ OT และคำนวณค่าล่วงเวลา",
      },
      {
        category: "feat",
        description: "ระบบลางาน ขอทำงานนอกสถานที่ และขอมาสาย",
      },
      {
        category: "feat",
        description: "ระบบประกาศและแจ้งเตือนผ่าน LINE",
      },
      {
        category: "feat",
        description: "PWA รองรับติดตั้งบนมือถือ",
      },
      {
        category: "feat",
        description: "ระบบ KPI และ Gamification",
      },
    ],
  },
];
