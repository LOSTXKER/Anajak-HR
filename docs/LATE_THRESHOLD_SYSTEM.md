# 🕐 Late Threshold System Documentation

ระบบเกณฑ์มาสาย (Late Threshold) - คำนวณนาทีที่สายโดยหัก Grace Period ออก

---

## 📋 Overview

ระบบนี้ช่วยให้องค์กรสามารถกำหนด **Grace Period (เวลาผ่อนผัน)** ให้พนักงานได้ โดยจะไม่นับเป็นการมาสายหากเข้างานภายในเวลาที่กำหนด

---

## 🧮 การคำนวณ

### **สูตร:**

```
มาหลังเวลาเข้างาน = เวลาเช็คอิน - เวลาเข้างาน
is_late = มาหลังเวลาเข้างาน > เกณฑ์มาสาย
late_minutes = is_late ? (มาหลังเวลาเข้างาน - เกณฑ์มาสาย) : 0
```

### **ตัวอย่าง:**

| เวลาเข้างาน | เกณฑ์มาสาย | เช็คอิน | มาหลัง | is_late | late_minutes | ผลลัพธ์ |
|------------|------------|---------|--------|---------|--------------|---------|
| 09:00 | 15 นาที | 08:50 | -10 นาที | ❌ false | 0 | ไม่สาย ✅ |
| 09:00 | 15 นาที | 09:00 | 0 นาที | ❌ false | 0 | ไม่สาย ✅ |
| 09:00 | 15 นาที | 09:10 | 10 นาที | ❌ false | 0 | ไม่สาย ✅ |
| 09:00 | 15 นาที | 09:15 | 15 นาที | ❌ false | 0 | ไม่สาย ✅ |
| 09:00 | 15 นาที | 09:16 | 16 นาที | ✅ true | 1 | **สาย 1 นาที** ⚠️ |
| 09:00 | 15 นาที | 09:20 | 20 นาที | ✅ true | 5 | **สาย 5 นาที** ⚠️ |
| 09:00 | 15 นาที | 09:30 | 30 นาที | ✅ true | 15 | **สาย 15 นาที** ⚠️ |
| 10:00 | 30 นาที | 10:36 | 36 นาที | ✅ true | 6 | **สาย 6 นาที** ⚠️ |

---

## ⚙️ การตั้งค่า (Admin)

### **1. หน้า Admin Settings** (`/admin/settings`)

```
⏰ เวลาทำงาน
├─ เวลาเข้างาน: 10:00
└─ เกณฑ์มาสาย (นาที): 30

💡 ความหมาย:
- เช็คอินก่อน 10:30 = ไม่สาย ✅
- เช็คอินหลัง 10:30 = สาย (คิดจากนาทีที่เกิน 10:30) ⚠️
```

### **2. ระดับความเข้มงวด**

| ระดับ | เกณฑ์มาสาย | เหมาะกับ |
|-------|------------|---------|
| **เข้มงวดมาก** | 0-5 นาที | องค์กรที่ต้องการตรงเวลาสูง |
| **เข้มงวดปานกลาง** | 10-15 นาที | องค์กรทั่วไป (แนะนำ) |
| **ยืดหยุ่น** | 20-30 นาที | องค์กรที่มี Flexible Hours |
| **ยืดหยุ่นมาก** | 45-60 นาที | Startup / Creative teams |

---

## 💻 Implementation

### **1. Check-in Page** (`app/checkin/page.tsx`)

```typescript
// ดึงการตั้งค่า
const workStartTime = settingsMap.work_start_time || "09:00";
const lateThresholdMinutes = parseInt(settingsMap.late_threshold_minutes || "0");
const [workStartHour, workStartMinute] = workStartTime.split(":").map(Number);

// คำนวณสาย
const now = new Date();
const currentMinutes = now.getHours() * 60 + now.getMinutes();
const workStartMinutes = workStartHour * 60 + workStartMinute;

// สายต่อเมื่อเกิน threshold ที่กำหนด
const minutesLate = currentMinutes - workStartMinutes;
const isLate = minutesLate > lateThresholdMinutes;
// บันทึกเฉพาะนาทีที่สายเกิน threshold (หัก threshold ออก)
const lateMinutes = isLate ? Math.max(0, minutesLate - lateThresholdMinutes) : 0;
```

### **2. Attendance Service** (`lib/services/attendance.service.ts`)

```typescript
// Check if late
const settings = await getSystemSettings();
const workStartTime = settings.workStartTime;
const lateThreshold = settings.lateThreshold;

const workStart = new Date(`${today}T${workStartTime}:00`);
const now = new Date();
const lateMinutes = Math.max(0, differenceInMinutes(now, workStart) - lateThreshold);
const isLate = lateMinutes > 0;
```

### **3. Admin Edit Attendance** (`app/admin/attendance/edit/[id]/page.tsx`)

```typescript
// คำนวณ is_late และ late_minutes ตามเวลาเริ่มงานจาก settings
const [workStartHour, workStartMinute] = workStartTime.split(":").map(Number);
const clockInTotalMinutes = inHours * 60 + inMinutes;
const workStartTotalMinutes = workStartHour * 60 + workStartMinute;

const minutesAfterStart = clockInTotalMinutes - workStartTotalMinutes;
const isLate = minutesAfterStart > lateThreshold;
// บันทึกเฉพาะนาทีที่สายเกิน threshold (หัก threshold ออก)
const lateMinutes = isLate ? Math.max(0, minutesAfterStart - lateThreshold) : 0;
```

---

## 🗄️ Database Schema

```sql
-- attendance_logs table
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL,
  work_date DATE NOT NULL,
  clock_in_time TIMESTAMPTZ,
  clock_out_time TIMESTAMPTZ,
  is_late BOOLEAN DEFAULT false,
  late_minutes INTEGER DEFAULT 0,  -- นาทีที่สาย (หลังหัก threshold แล้ว)
  ...
);

-- system_settings table
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('work_start_time', '09:00', 'เวลาเข้างาน'),
  ('late_threshold_minutes', '15', 'เกณฑ์มาสาย (นาที)');
```

---

## 🔧 Migration - แก้ไขข้อมูลเก่า

หากมีข้อมูลเก่าที่บันทึกไว้ก่อนแก้ bug สามารถรัน migration เพื่อแก้ไขได้:

```bash
# ใน Supabase SQL Editor
# รัน: supabase/migrations/fix-late-minutes-calculation.sql
```

Migration นี้จะ:
1. ดึงการตั้งค่า `work_start_time` และ `late_threshold_minutes`
2. วนลูปผ่าน attendance_logs ที่ `is_late = true`
3. คำนวณใหม่: `late_minutes = (clock_in - work_start) - threshold`
4. อัปเดตเฉพาะ record ที่ค่าเปลี่ยน
5. แสดงผลลัพธ์การแก้ไข

---

## 📊 การคำนวณเงินเดือน

ส่วนคำนวณเงินเดือน (`app/admin/payroll/page.tsx`) จะใช้ `late_minutes` ที่บันทึกไว้:

```typescript
attendance?.forEach((a: any) => {
  // ถ้าวันนี้มี approved late request ไม่นับเป็นสาย
  if (approvedLateDates.has(a.work_date)) {
    return;
  }

  if (a.is_late && a.clock_in_time) {
    // ถ้ามี late_minutes ในฐานข้อมูลให้ใช้เลย
    if (a.late_minutes && a.late_minutes > 0) {
      lateMinutes += Math.min(a.late_minutes, MAX_LATE_MINUTES);
    }
  }
});

// หักเงินตามนาทีที่สาย
const lateDeduction = lateMinutes * latePenaltyPerMinute;
```

---

## 🔍 Troubleshooting

### **ปัญหา: บันทึกนาทีที่สายไม่ถูกต้อง**

**สาเหตุ:** ข้อมูลเก่าบันทึกก่อนแก้ bug

**วิธีแก้:**
1. รัน migration: `fix-late-minutes-calculation.sql`
2. ตรวจสอบผลลัพธ์
3. ดู verification query ท้าย migration

### **ปัญหา: ระบบนับสายแม้เข้างานก่อนเวลา**

**สาเหตุ:** `late_threshold_minutes` ตั้งเป็น 0 หรือไม่มีในฐานข้อมูล

**วิธีแก้:**
```sql
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES ('late_threshold_minutes', '15', 'เกณฑ์มาสาย (นาที)')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = '15';
```

### **ปัญหา: Admin แก้ไขเวลาแล้วนาทีที่สายไม่เปลี่ยน**

**สาเหตุ:** ไม่ได้ดึง `late_threshold_minutes` มาคำนวณ (แก้แล้วใน commit นี้)

**การตรวจสอบ:**
```typescript
// ต้องมี state นี้
const [lateThreshold, setLateThreshold] = useState(15);

// และดึงค่ามา
const { data } = await supabase
  .from("system_settings")
  .select("setting_key, setting_value")
  .in("setting_key", ["work_start_time", "late_threshold_minutes"]);
```

---

## ✅ Summary

| Feature | Status | Note |
|---------|--------|------|
| Check-in calculation | ✅ Fixed | หัก threshold แล้ว |
| Service layer | ✅ Fixed | ถูกต้องตั้งแต่แรก |
| Admin edit | ✅ Fixed | เพิ่มการหัก threshold |
| Payroll | ✅ OK | ใช้ `late_minutes` จาก DB |
| Migration | ✅ Created | แก้ไขข้อมูลเก่าได้ |

---

## 🎯 Best Practices

1. **ตั้งค่า threshold ให้เหมาะสม** - แนะนำ 10-15 นาทีสำหรับองค์กรทั่วไป
2. **สื่อสารกับพนักงาน** - แจ้งให้ทราบว่าระบบมี Grace Period
3. **ตรวจสอบรายงาน** - ดูรายงานการมาสายเป็นประจำ
4. **ใช้ Late Request** - พนักงานที่มีเหตุจำเป็นสามารถขออนุมัติการมาสายล่วงหน้า
5. **รัน Migration** - หลังอัปเดตระบบให้รัน migration เพื่อแก้ไขข้อมูลเก่า

---

**Last Updated:** 2024-12-19  
**Version:** 1.0  
**Related Files:**
- `app/checkin/page.tsx`
- `lib/services/attendance.service.ts`
- `app/admin/attendance/edit/[id]/page.tsx`
- `app/admin/settings/page.tsx`
- `supabase/migrations/fix-late-minutes-calculation.sql`

