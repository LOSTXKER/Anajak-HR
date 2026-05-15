# 📐 แผนการ Refactor Admin Pages

> **Last Updated:** 2025-12-10  
> **Phase:** 1 of 2

---

## 📚 Related Documents

| Document | Description | Status |
|----------|-------------|--------|
| [refactor-plan.md](./refactor-plan.md) | แผน Refactor Admin Pages | 📋 Current |
| [multi-tenancy-plan.md](./multi-tenancy-plan.md) | แผน Multi-tenancy SaaS | 📋 Phase 2 |

---

## 🎯 เป้าหมาย

รวมแนวทาง A + B เพื่อ:
- ลดจำนวนหน้าที่ซ้ำซ้อน
- ทำให้ Employee-Centric (เน้นข้อมูลพนักงานรายคน)
- ปรับปรุง UX/UI ให้ใช้งานง่ายขึ้น

---

## 📋 สรุปหน้า Admin ทั้งหมด

| หน้า | ชื่อ | Action | หมายเหตุ |
|------|------|--------|----------|
| `/admin` | Dashboard | ✅ คงไว้ | สรุปภาพรวม |
| `/admin/approvals` | อนุมัติ | ✅ คงไว้ | ตรวจสอบ Tab ครบ |
| `/admin/attendance` | การเข้างาน | 🔄 Refactor | คลิกพนักงานไป Profile |
| `/admin/attendance/edit/[id]` | แก้ไขการเข้างาน | ✅ คงไว้ | ใช้งานได้ |
| `/admin/employees` | พนักงาน | 🔄 Refactor | เป็นศูนย์กลาง |
| `/admin/employees/[id]` | Profile พนักงาน | 🆕 สร้างใหม่ | Timeline + แก้ไข |
| `/admin/monitor` | Monitor | ✅ คงไว้ | Real-time monitoring |
| `/admin/anomalies` | ความผิดปกติ | ✅ คงไว้ | ลืมเช็คเอาท์, GPS ผิด |
| `/admin/branches` | สาขา | ✅ คงไว้ | จัดการสาขา |
| `/admin/holidays` | วันหยุด | ✅ คงไว้ | จัดการวันหยุดนักขัตฤกษ์ |
| `/admin/payroll` | เงินเดือน | ✅ คงไว้ | คำนวณเงินเดือน |
| `/admin/reports` | รายงาน | ✅ คงไว้ | รายงานสถิติ |
| `/admin/settings/*` | ตั้งค่า | ✅ คงไว้ | ตั้งค่าระบบ |
| `/admin/ot` | จัดการ OT | ❌ ลบ | ย้ายไป Approvals + Profile |
| `/admin/leave` | จัดการลา | ❌ ลบ | ย้ายไป Approvals + Profile |
| `/admin/wfh` | จัดการ WFH | ❌ ลบ | ย้ายไป Approvals + Profile |
| `/admin/late-requests` | คำขอสาย | ❌ ลบ | ย้ายไป Approvals + Profile |

---

## 📊 เปรียบเทียบโครงสร้าง

### ❌ โครงสร้างเดิม (ปัญหา: ซ้ำซ้อน)

```
📁 Admin Menu
├── 🏠 Dashboard
├── ✅ อนุมัติ
├── 📊 การเข้างาน ← แสดง OT/Leave/WFH ซ้ำ
├── 🕐 จัดการ OT ← ซ้ำกับ การเข้างาน + อนุมัติ
├── 📅 จัดการลา ← ซ้ำกับ การเข้างาน + อนุมัติ
├── 🏠 จัดการ WFH ← ซ้ำกับ การเข้างาน + อนุมัติ
├── ⏰ ประวัติมาสาย ← ซ้ำกับ การเข้างาน + อนุมัติ
├── 💰 เงินเดือน
├── 📈 รายงาน
├── 👥 พนักงาน
└── ⚙️ ตั้งค่า
```

### ✅ โครงสร้างใหม่ (A + B Combined)

```
📁 Admin Menu
├── 🏠 Dashboard (สรุปภาพรวม)
├── ✅ อนุมัติ (รวมทุกอย่าง)
│   └── Tab: OT | ลา | WFH | สาย | พนักงานใหม่
├── 📊 การเข้างาน (ปรับใหม่)
│   ├── 📅 Daily View - สรุปพนักงานทุกคนในวันนั้น
│   └── 📆 History View - ประวัติทั้งเดือน (คลิกไปหน้าพนักงาน)
├── 👥 พนักงาน (ศูนย์กลาง) ⭐ NEW
│   ├── รายชื่อพนักงาน + ค้นหา/กรอง
│   └── คลิกพนักงาน → หน้า Profile + Timeline
│       ├── ข้อมูลส่วนตัว + แก้ไข
│       ├── Attendance History
│       ├── OT History + แก้ไข
│       ├── Leave History + Quota + แก้ไข
│       ├── WFH History + แก้ไข
│       └── Late Request History
├── 💰 เงินเดือน
├── 📈 รายงาน
└── ⚙️ ตั้งค่า
```

---

## 🗑️ หน้าที่จะลบ

| หน้า | เหตุผล |
|------|--------|
| `/admin/ot` | ย้ายไป Approvals (อนุมัติ) + Employee Profile (ประวัติ) |
| `/admin/leave` | ย้ายไป Approvals (อนุมัติ) + Employee Profile (ประวัติ) |
| `/admin/wfh` | ย้ายไป Approvals (อนุมัติ) + Employee Profile (ประวัติ) |
| `/admin/late-requests` | ย้ายไป Approvals (อนุมัติ) + Employee Profile (ประวัติ) |

---

## 📝 แผนงานละเอียด

### Phase 1: สร้างหน้า Employee Profile ⭐

**ไฟล์:** `app/admin/employees/[id]/page.tsx`

**Features:**
- [ ] Header: รูป + ชื่อ + ตำแหน่ง + สาขา + สถานะ
- [ ] Quick Stats Cards: วันทำงาน, วันสาย, ชม.OT, วันลา, วันWFH
- [ ] Tab Navigation:
  - [ ] **ข้อมูล**: ข้อมูลส่วนตัว + แก้ไขได้
  - [ ] **Attendance**: ประวัติเข้างาน + แก้ไขได้
  - [ ] **OT**: ประวัติ OT + แก้ไข/ลบได้
  - [ ] **ลา**: ประวัติลา + Leave Quota + แก้ไขได้
  - [ ] **WFH**: ประวัติ WFH + แก้ไขได้
  - [ ] **สาย**: ประวัติคำขอสาย

**UI Components:**
```
┌──────────────────────────────────────────────────────────────────┐
│ ◀ กลับ                                                          │
├──────────────────────────────────────────────────────────────────┤
│  ┌────┐                                                          │
│  │ 👤 │  เอกอภิศักดิ์ กุลรัตน์ชัย                                   │
│  └────┘  พนักงาน | สาขา: สำนักงานใหญ่ | ✅ Active                 │
├──────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│ │   20    │ │    2    │ │  12.5   │ │    1    │ │    2    │      │
│ │ วันทำงาน │ │  วันสาย  │ │ ชม. OT  │ │  วันลา  │ │ วัน WFH │      │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
├──────────────────────────────────────────────────────────────────┤
│  [ข้อมูล]  [Attendance]  [OT]  [ลา]  [WFH]  [สาย]                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📅 ประวัติเดือนนี้                    ◀ ธันวาคม 2025 ▶          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 10 ธ.ค. │ เข้า 09:05 │ ออก 18:30 │ 8.5 ชม. │ OT 2ชม. │ สาย │  │
│  │ 9 ธ.ค.  │ เข้า 08:55 │ ออก 18:00 │ 8.0 ชม. │ -       │ ปกติ │  │
│  │ 8 ธ.ค.  │ ลาป่วย (เต็มวัน)                              │  │
│  │ 7 ธ.ค.  │ WFH (เต็มวัน)                                 │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### Phase 2: Refactor หน้าพนักงาน (List)

**ไฟล์:** `app/admin/employees/page.tsx`

**Features:**
- [ ] ตารางรายชื่อพนักงาน
- [ ] Search + Filter (ชื่อ, สาขา, ตำแหน่ง, สถานะ)
- [ ] Quick Stats ในแต่ละแถว (วันทำงาน, สาย, OT เดือนนี้)
- [ ] คลิกแถว → ไปหน้า Profile `/admin/employees/[id]`
- [ ] ปุ่มเพิ่มพนักงานใหม่

---

### Phase 3: Refactor หน้าการเข้างาน

**ไฟล์:** `app/admin/attendance/page.tsx`

**Changes:**
- [ ] **Daily View** - คงไว้ + ปรับปรุง
  - คลิกชื่อพนักงาน → ไปหน้า `/admin/employees/[id]`
  - ลบ Modal รายละเอียด OT/Leave/WFH (ดูในหน้า Profile แทน)
- [ ] **History View** - ปรับเป็น Overview
  - แสดง Timeline ทุกคนรวมกัน
  - คลิกแถว → ไปหน้า Profile พนักงาน
  - หรือลบ History View ทิ้ง (ดูใน Profile แทน)

---

### Phase 4: ตรวจสอบหน้า Approvals

**ไฟล์:** `app/admin/approvals/page.tsx`

**Checklist:**
- [ ] Tab OT - อนุมัติ/ปฏิเสธ OT
- [ ] Tab ลา - อนุมัติ/ปฏิเสธ Leave
- [ ] Tab WFH - อนุมัติ/ปฏิเสธ WFH
- [ ] Tab สาย - อนุมัติ/ปฏิเสธ Late Request
- [ ] Tab พนักงานใหม่ - อนุมัติ/ปฏิเสธ Employee Registration
- [ ] Badge แสดงจำนวนรอดำเนินการในแต่ละ Tab
- [ ] Real-time update หลังอนุมัติ

---

### Phase 5: ลบหน้าที่ไม่ใช้

**Files to Delete:**
- [ ] `app/admin/ot/page.tsx`
- [ ] `app/admin/leave/page.tsx`
- [ ] `app/admin/wfh/page.tsx`
- [ ] `app/admin/late-requests/page.tsx`

---

### Phase 6: อัปเดต Sidebar Menu

**ไฟล์:** `components/admin/AdminLayout.tsx`

**Changes:**
- [ ] ลบ menu items: OT, ลา, WFH, ประวัติมาสาย
- [ ] ปรับลำดับ menu:
  1. Dashboard
  2. อนุมัติ
  3. การเข้างาน
  4. พนักงาน
  5. เงินเดือน
  6. รายงาน
  7. ตั้งค่า

---

## 🎨 UI/UX Guidelines

### Employee Profile Page

**Tab: ข้อมูล**
- ข้อมูลพื้นฐาน (ชื่อ, อีเมล, เบอร์โทร, วันเกิด)
- ข้อมูลงาน (ตำแหน่ง, สาขา, วันเริ่มงาน, เงินเดือน)
- Leave Quota (โควต้าลาคงเหลือ)
- ปุ่มแก้ไขข้อมูล

**Tab: Attendance**
- ปฏิทินแสดงวันเข้างาน (สีเขียว=ปกติ, เหลือง=สาย, แดง=ขาด, น้ำเงิน=ลา)
- ตารางประวัติ (วันที่, เข้า, ออก, ชม., สถานะ)
- ปุ่มแก้ไข/เพิ่มการเข้างาน

**Tab: OT**
- สรุป OT เดือนนี้ (ชม., ฿)
- ตารางประวัติ OT (วันที่, ประเภท, เวลา, ชม., ฿, สถานะ)
- ปุ่มแก้ไข/ลบ OT

**Tab: ลา**
- Leave Quota Cards (ลาป่วย, ลากิจ, ลาพักร้อน - ใช้ไป/คงเหลือ)
- ตารางประวัติลา (วันที่, ประเภท, จำนวนวัน, เหตุผล, สถานะ)
- ปุ่มแก้ไข/ยกเลิก

**Tab: WFH**
- สรุป WFH เดือนนี้
- ตารางประวัติ WFH (วันที่, ครึ่งวัน/เต็มวัน, เหตุผล, สถานะ)

**Tab: สาย**
- สรุปครั้งที่มาสายเดือนนี้
- ตารางประวัติคำขอสาย (วันที่, เวลาเข้า, เหตุผล, สถานะ)

---

## 📅 Timeline

| วัน | งาน |
|-----|-----|
| Day 1 | Phase 1: สร้างหน้า Employee Profile (Basic) |
| Day 2 | Phase 1: เพิ่ม Tab Attendance + OT |
| Day 3 | Phase 1: เพิ่ม Tab Leave + WFH + Late |
| Day 4 | Phase 2: Refactor หน้ารายชื่อพนักงาน |
| Day 5 | Phase 3: Refactor หน้าการเข้างาน |
| Day 6 | Phase 4: ตรวจสอบ/ปรับปรุงหน้า Approvals |
| Day 7 | Phase 5 + 6: ลบหน้าที่ไม่ใช้ + อัปเดต Sidebar |
| Day 8 | Testing + Bug Fixes |

---

## ✅ Definition of Done

- [ ] หน้า Employee Profile ทำงานครบทุก Tab
- [ ] หน้าการเข้างาน ลิงก์ไปหน้า Profile ได้
- [ ] หน้า Approvals ทำงานครบทุก Tab
- [ ] ลบหน้าที่ไม่ใช้แล้ว
- [ ] Sidebar แสดง menu ที่ถูกต้อง
- [ ] ไม่มี Linter Errors
- [ ] ทดสอบ Flow หลักๆ ผ่าน

---

## 🏗️ หน้าที่คงไว้ (ไม่ต้อง Refactor มาก)

### Dashboard (`/admin`)
- สรุปภาพรวมระบบ
- Quick Stats: พนักงาน, เข้างานวันนี้, รอOT, รอลา, รอWFH
- Quick Links ไปหน้าสำคัญ

### Monitor (`/admin/monitor`)
- **Real-time** monitoring (ต่างจาก Dashboard ที่เป็นสรุป)
- OT ที่กำลังทำอยู่ (Active OT)
- สถิติวันนี้แบบ Live
- แจ้งเตือนความผิดปกติ

### Anomalies (`/admin/anomalies`)
- จัดการความผิดปกติ:
  - ลืมเช็คเอาท์
  - GPS ผิดปกติ
  - เข้างานผิดเวลา
- Resolve + หมายเหตุ

### Branches (`/admin/branches`)
- CRUD สาขา
- ตั้งค่า GPS ของสาขา
- ตั้งค่าเวลาทำงานของสาขา

### Holidays (`/admin/holidays`)
- CRUD วันหยุดนักขัตฤกษ์
- Import จาก Template

### Payroll (`/admin/payroll`)
- คำนวณเงินเดือน
- แสดง OT, หักสาย, ค่าคอมมิชชัน
- Export รายงาน

### Reports (`/admin/reports`)
- รายงานสถิติต่างๆ
- Filter ตามช่วงเวลา/พนักงาน/สาขา
- Export Excel/PDF

### Settings (`/admin/settings/*`)
- ตั้งค่าทั่วไป
- ตั้งค่า OT & Payroll
- ตั้งค่า LINE
- ตั้งค่า Notifications
- ตั้งค่า Leave Quota เริ่มต้น

---

## 🔗 Sidebar Menu ใหม่

```tsx
const menuItems = [
  { name: "Dashboard", href: "/admin", icon: Home },
  { name: "อนุมัติ", href: "/admin/approvals", icon: CheckCircle, badge: pendingCount },
  { name: "การเข้างาน", href: "/admin/attendance", icon: Clock },
  { name: "พนักงาน", href: "/admin/employees", icon: Users },
  { name: "Monitor", href: "/admin/monitor", icon: Activity },
  { name: "ความผิดปกติ", href: "/admin/anomalies", icon: AlertTriangle, badge: anomalyCount },
  { divider: true },
  { name: "เงินเดือน", href: "/admin/payroll", icon: DollarSign },
  { name: "รายงาน", href: "/admin/reports", icon: BarChart },
  { divider: true },
  { name: "สาขา", href: "/admin/branches", icon: Building },
  { name: "วันหยุด", href: "/admin/holidays", icon: Calendar },
  { name: "ตั้งค่า", href: "/admin/settings", icon: Settings },
];
```

---

## 🧪 Test Cases

### Employee Profile Page
- [ ] เข้าหน้า Profile ได้
- [ ] แสดงข้อมูลพนักงานถูกต้อง
- [ ] Tab Attendance ทำงาน
- [ ] Tab OT ทำงาน + แก้ไข/ลบได้
- [ ] Tab Leave ทำงาน + แสดง Quota
- [ ] Tab WFH ทำงาน
- [ ] Tab Late Request ทำงาน
- [ ] แก้ไขข้อมูลพนักงานได้

### Attendance Page
- [ ] Daily View แสดงถูกต้อง
- [ ] คลิกพนักงานไปหน้า Profile ได้
- [ ] เพิ่มการเข้างาน Manual ได้
- [ ] History View ทำงาน (ถ้ายังคงไว้)

### Approvals Page
- [ ] Tab OT แสดงรายการรออนุมัติ
- [ ] Tab Leave แสดงรายการรออนุมัติ
- [ ] Tab WFH แสดงรายการรออนุมัติ
- [ ] Tab Late Request แสดงรายการรออนุมัติ
- [ ] Tab พนักงานใหม่ แสดงรายการรออนุมัติ
- [ ] อนุมัติ/ปฏิเสธ ทำงานถูกต้อง

### Deleted Pages
- [ ] `/admin/ot` redirect ไป `/admin/approvals?tab=ot`
- [ ] `/admin/leave` redirect ไป `/admin/approvals?tab=leave`
- [ ] `/admin/wfh` redirect ไป `/admin/approvals?tab=wfh`
- [ ] `/admin/late-requests` redirect ไป `/admin/approvals?tab=late`

---

## 📝 Notes

- **Mobile Responsive**: ทุกหน้าต้องรองรับมือถือ
- **Loading States**: แสดง skeleton/spinner ขณะโหลด
- **Error Handling**: แสดง error message ที่เข้าใจง่าย
- **Confirmation Dialogs**: ยืนยันก่อนลบ/ยกเลิก
- **Toast Notifications**: แจ้งเตือนหลังทำ action สำเร็จ/ล้มเหลว
- **Breadcrumbs**: แสดง path navigation ในหน้า Profile

---

## 🚀 เริ่มต้น

พร้อมเริ่มทำตามแผนนี้ไหมครับ? แนะนำให้เริ่มจาก:

1. **Phase 1**: สร้างหน้า Employee Profile (สำคัญที่สุด)
2. **Phase 2**: Refactor หน้า Employees List
3. **Phase 3**: Refactor หน้า Attendance
4. **Phase 4**: ลบหน้าที่ไม่ใช้ + อัปเดต Sidebar

