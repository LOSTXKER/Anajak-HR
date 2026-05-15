# 🏢 Anajak HR - ระบบบันทึกเข้างาน + OT

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ระบบบันทึกเวลาเข้างาน-เลิกงาน และจัดการ OT ผ่านมือถือ พัฒนาด้วย **Next.js 15** + **Supabase**

![Dashboard Preview](https://via.placeholder.com/800x400?text=Anajak+HR+Dashboard)

## ✨ คุณสมบัติหลัก

### 📱 MVP (Phase 1) - ✅ เสร็จแล้ว
- ✅ ระบบเช็คอิน/เช็คเอาท์พร้อมถ่ายรูปและตรวจสอบ GPS
- ✅ ระบบขอ OT และอนุมัติ OT
- ✅ Dashboard สำหรับหัวหน้าและแอดมิน
- ✅ ประวัติการเข้างานและ OT
- ✅ Export รายงานเป็น Excel/CSV

### 🚀 Phase 2 - ✅ เสร็จแล้ว
- ✅ ระบบลางาน (Leave Management)
- ✅ ระบบ WFH (Work From Home)
- ✅ การจัดการวันหยุด + OT Rate วันหยุด
- ✅ การจัดการสาขา + GPS Radius
- ✅ LINE Messaging API Integration
- ✅ ตั้งค่าข้อความ LINE แบบ Custom
- ✅ Auto Check-out System
- ✅ Reminder System (เตือนเช็คเอาท์)
- ✅ Anomaly Detection (ตรวจสอบความผิดปกติ)
- ✅ Attendance Edit (แก้ไขเวลาเข้า-ออก)

---

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/LOSTXKER/Anajak-HR.git
cd Anajak-HR

# Install dependencies
npm install

# Setup environment
cp env.local.example .env.local
# แก้ไขไฟล์ .env.local ใส่ Supabase credentials

# Run development server
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

> 📚 ดูรายละเอียดการติดตั้งเพิ่มเติมได้ที่ [docs/QUICK_START.md](docs/QUICK_START.md)

### Apply Phase B Migration (Multi-tenant)

ถ้า clone ใหม่และต้องการ apply Phase B migration กับ Supabase ใหม่:

```bash
# สร้าง .env.migration (Session Pooler — port 5432)
# ดูรายละเอียดที่ docs/migration-runbook.md section 1

# Apply migrations
npx dotenv -e .env.migration -- npx prisma migrate deploy
```

หรือ apply ด้วย Supabase SQL Editor โดยตรง — ดู [docs/migration-runbook.md](docs/migration-runbook.md) สำหรับ step-by-step

> ถ้าใช้ Transaction Pooler (port 6543 ใน `.env.local`) อย่าใช้รัน migrate — จะ error เสมอ ใช้ Session Pooler (port 5432) แทน

---

## 🛠️ Tech Stack

| ส่วน | เทคโนโลยี | หมายเหตุ |
|------|-----------|---------|
| Frontend | **Next.js 15** (App Router) | React 19, Server Components |
| Language | **TypeScript 5** | strict mode |
| Database | **Supabase** (PostgreSQL 15) | Row Level Security enabled |
| ORM / Schema | **Prisma 7** | DDL management เท่านั้น — runtime ใช้ Supabase client |
| Auth | **Supabase Auth** | JWT, role-based |
| Testing | **Vitest** | 75/75 tests pass |
| Deploy | **Vercel** | Edge runtime |

---

## 📋 ข้อกำหนดเบื้องต้น

- **Node.js** 18+
- **npm** หรือ **yarn**
- **บัญชี Supabase** (ฟรี)

---

## 📁 โครงสร้างโปรเจค

```
anajak-hr/
├── app/                      # Next.js App Router
│   ├── admin/               # Admin Dashboard
│   │   ├── anomalies/      # ตรวจสอบความผิดปกติ
│   │   ├── attendance/     # จัดการการเข้างาน
│   │   ├── branches/       # จัดการสาขา
│   │   ├── employees/      # จัดการพนักงาน
│   │   ├── holidays/       # จัดการวันหยุด
│   │   ├── leave/          # อนุมัติลา
│   │   ├── ot/             # อนุมัติ OT
│   │   ├── reports/        # รายงาน
│   │   ├── settings/       # ตั้งค่าระบบ
│   │   └── wfh/            # อนุมัติ WFH
│   ├── api/                 # API Routes
│   ├── checkin/             # หน้าเช็คอิน
│   ├── checkout/            # หน้าเช็คเอาท์
│   ├── history/             # ประวัติการเข้างาน
│   ├── leave/               # ขอลา
│   ├── ot/                  # ขอ OT
│   └── wfh/                 # ขอ WFH
├── components/              # UI Components
│   ├── admin/              # Admin Components
│   └── ui/                 # Reusable UI
├── docs/                    # 📚 Documentation
├── lib/                     # Utilities
│   ├── auth/               # Authentication
│   ├── line/               # LINE Integration
│   ├── supabase/           # Supabase Clients
│   └── utils/              # Helper Functions
├── public/                  # Static Assets
├── supabase/                # Database Schema
└── types/                   # TypeScript Types
```

---

## 🏢 Multi-tenant Architecture

ระบบออกแบบให้รองรับหลายองค์กรในโค้ดชุดเดียว (1 codebase = หลาย orgs)

### ภาพรวม

| สิ่งที่ทำงานร่วมกัน | รายละเอียด |
|---|---|
| Database | 1 Supabase project, แยก data ด้วย `organization_id` ทุก table |
| Codebase | 1 Next.js app deploy เดียว |
| Auth | Supabase Auth, user ผูกกับ org ผ่าน `employees.organization_id` |

### Organizations ที่กำหนดไว้

| Slug | UUID | ชื่อ |
|------|------|------|
| `anajak` | `00000000-0000-0000-0000-000000000001` | Anajak (primary) |
| `ibear` | `00000000-0000-0000-0000-000000000002` | iBear |
| `meecard` | `00000000-0000-0000-0000-000000000003` | Meecard |
| `meelike` | `00000000-0000-0000-0000-000000000004` | Meelike |
| `channel` | `00000000-0000-0000-0000-000000000005` | Best Channel |

**Anajak** คือ primary org — เป็น DEFAULT สำหรับทุก INSERT ที่ไม่ระบุ `organization_id`

### การแยกข้อมูล (Row Level Security)

ทุก query ถูกกรองผ่าน `current_user_org()` helper ใน Supabase RLS:
- พนักงานเห็นเฉพาะข้อมูลขององค์กรตัวเอง
- Admin เห็นทุก record ภายใน org เดียวกัน
- Cross-org access = ไม่มี (RLS block โดยอัตโนมัติ)

### Org Switcher (Admin Navbar)

Admin ที่มีสิทธิ์หลาย org จะเห็น dropdown `OrgSwitcher` ใน navbar  
Switch org → session context เปลี่ยน → `current_user_org()` คืนค่า UUID ใหม่ → data filter เปลี่ยนทันที

---

## 🗃️ Database Schema

| Table | Description |
|-------|-------------|
| `employees` | ข้อมูลพนักงาน |
| `branches` | ข้อมูลสาขา + GPS |
| `attendance_logs` | บันทึกการเข้า-ออกงาน |
| `ot_requests` | คำขอ OT |
| `leave_requests` | คำขอลา |
| `wfh_requests` | คำขอ WFH |
| `holidays` | วันหยุด |
| `system_settings` | ตั้งค่าระบบ |
| `attendance_anomalies` | ความผิดปกติ |

---

## 🔐 Authentication & Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `employee` | พนักงานทั่วไป | เช็คอิน/เอาท์, ขอ OT/ลา/WFH |
| `supervisor` | หัวหน้างาน | อนุมัติ OT/ลา/WFH, ดูรายงานทีม |
| `admin` | ผู้ดูแลระบบ | เข้าถึงทุกอย่าง |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [QUICK_START.md](docs/QUICK_START.md) | คู่มือเริ่มต้นใช้งาน |
| [SETUP.md](docs/SETUP.md) | การติดตั้งแบบละเอียด |
| [FEATURES.md](docs/FEATURES.md) | รายละเอียดฟีเจอร์ |
| [ENV_SETUP.md](docs/ENV_SETUP.md) | การตั้งค่า Environment |
| [LINE_MESSAGING_SETUP.md](docs/LINE_MESSAGING_SETUP.md) | การตั้งค่า LINE API |
| [SYSTEM_PLAN.md](docs/SYSTEM_PLAN.md) | แผนพัฒนาระบบ (ภาษาไทย) |
| [CHANGELOG.md](docs/CHANGELOG.md) | ประวัติการเปลี่ยนแปลง |
| [migration-runbook.md](docs/migration-runbook.md) | คู่มือ apply Phase B migration + rollback |
| [phase-b-tenant-scope.md](docs/phase-b-tenant-scope.md) | รายละเอียด multi-tenant implementation |

---

## 🗺️ Roadmap

### ✅ Phase 1 - MVP (เสร็จแล้ว)
- เช็คอิน/เช็คเอาท์ + GPS + Camera
- ระบบ OT พื้นฐาน
- Dashboard หัวหน้า
- Export Excel

### ✅ Phase 2 - Enhanced (เสร็จแล้ว)
- ระบบลางาน + WFH
- การจัดการวันหยุด/สาขา
- LINE Messaging API
- Auto Check-out
- Anomaly Detection

### ⏳ Phase 3 - Payroll (กำลังพัฒนา)
- คำนวณเงินเดือน
- ใบสลิปเงินเดือน (PDF)
- รายงานประกันสังคม

### 🔮 Phase 4 - Advanced
- Face Recognition API
- LINE Rich Menu + LIFF
- Mobile App (React Native)
- PWA Support

---

## 🛡️ Security Features

- 🔒 Row Level Security (RLS) ใน Supabase
- 📍 GPS Fence (ตรวจสอบตำแหน่ง)
- 📸 Face Selfie (ยืนยันตัวตน)
- 🔑 Service Role Key (Server-side only)

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Support

สำหรับคำถามและการสนับสนุน กรุณาสร้าง [Issue](https://github.com/LOSTXKER/Anajak-HR/issues) ใหม่

---

<p align="center">
  Made with ❤️ by <strong>Anajak HR Team</strong>
</p>
