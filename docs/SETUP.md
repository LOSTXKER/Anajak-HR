# Setup Guide - Anajak HR System

## ขั้นตอนการติดตั้งแบบละเอียด

### 1. Prerequisites

ตรวจสอบว่าคุณติดตั้งโปรแกรมเหล่านี้แล้ว:

```bash
node --version  # ควรเป็น v18 ขึ้นไป
npm --version   # ควรเป็น v9 ขึ้นไป
```

### 2. Clone และติดตั้ง Dependencies

```bash
# Clone repository (ถ้ามี)
git clone <repository-url>
cd anajak-hr

# ติดตั้ง dependencies
npm install
```

### 3. Setup Supabase

#### 3.1 สร้างโปรเจค Supabase

1. ไปที่ [https://supabase.com](https://supabase.com)
2. Sign up / Sign in
3. คลิก "New Project"
4. กรอกข้อมูล:
   - **Name:** anajak-hr
   - **Database Password:** [ตั้งรหัสผ่านที่จำง่าย]
   - **Region:** Southeast Asia (Singapore)
5. คลิก "Create new project" (รอ 1-2 นาที)

#### 3.2 Copy API Keys

1. ไปที่ **Settings** → **API**
2. Copy ค่าต่อไปนี้:
   - `Project URL` → จะใช้เป็น `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → จะใช้เป็น `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → จะใช้เป็น `SUPABASE_SERVICE_ROLE_KEY` (⚠️ เก็บเป็นความลับ)

#### 3.3 สร้างฐานข้อมูล

1. ไปที่ **SQL Editor** ในเมนูด้านซ้าย
2. คลิก "+ New query"
3. Copy เนื้อหาจากไฟล์ `supabase/schema.sql` ทั้งหมด
4. Paste และคลิก "Run" (หรือกด Ctrl+Enter)
5. ถ้าสำเร็จจะขึ้น "Success. No rows returned"

#### 3.4 สร้าง Storage Buckets

1. ไปที่ **Storage** ในเมนูด้านซ้าย
2. คลิก "+ New bucket"
3. สร้าง bucket ชื่อ `attendance-photos`:
   - Bucket name: `attendance-photos`
   - Public bucket: ✅ เปิด
   - คลิก "Create bucket"
4. ทำซ้ำสำหรับ bucket ชื่อ `ot-photos`:
   - Bucket name: `ot-photos`
   - Public bucket: ✅ เปิด
   - คลิก "Create bucket"

#### 3.5 สร้างผู้ใช้ทดสอบ

1. ไปที่ **Authentication** → **Users**
2. คลิก "Add user" → "Create new user"
3. สร้างผู้ใช้ 3 คน:

**Admin User:**
- Email: `admin@anajak.com`
- Password: `password123`
- คลิก "Create user"
- Copy `User UID` ที่ได้

**Supervisor User:**
- Email: `supervisor@anajak.com`
- Password: `password123`
- Copy `User UID`

**Staff User:**
- Email: `staff@anajak.com`
- Password: `password123`
- Copy `User UID`

#### 3.6 เพิ่มข้อมูลพนักงานในฐานข้อมูล

1. ไปที่ **SQL Editor**
2. รันคำสั่งนี้ (แทนที่ `USER_UID_XXX` ด้วย UID จริงที่คุณ copy ไว้):

```sql
-- แทนที่ 'USER_UID_1' ด้วย Admin UID จริง
INSERT INTO employees (id, name, email, phone, role, base_salary_rate, ot_rate_1_5x, ot_rate_2x) VALUES
  ('USER_UID_1', 'Admin User', 'admin@anajak.com', '0812345678', 'admin', 30000, 1.5, 2.0);

-- แทนที่ 'USER_UID_2' ด้วย Supervisor UID จริง
INSERT INTO employees (id, name, email, phone, role, base_salary_rate, ot_rate_1_5x, ot_rate_2x) VALUES
  ('USER_UID_2', 'Supervisor User', 'supervisor@anajak.com', '0823456789', 'supervisor', 25000, 1.5, 2.0);

-- แทนที่ 'USER_UID_3' ด้วย Staff UID จริง
INSERT INTO employees (id, name, email, phone, role, base_salary_rate, ot_rate_1_5x, ot_rate_2x) VALUES
  ('USER_UID_3', 'Staff User', 'staff@anajak.com', '0834567890', 'staff', 20000, 1.5, 2.0);
```

### 4. ตั้งค่า Environment Variables

1. สร้างไฟล์ `.env.local` ในโฟลเดอร์หลัก:

```bash
cp .env.local.example .env.local
```

2. แก้ไขไฟล์ `.env.local` ใส่ค่าจริง:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GPS_RADIUS_METERS=100
```

### 5. รันโปรเจค

```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่: [http://localhost:3000](http://localhost:3000)

### 6. ทดสอบระบบ

#### ทดสอบ Login
1. ไปที่ [http://localhost:3000/login](http://localhost:3000/login)
2. ลองล็อกอินด้วย:
   - Email: `staff@anajak.com`
   - Password: `password123`

#### ทดสอบ Check-in (บน Desktop)
⚠️ **สำคัญ:** การเช็กอินต้องใช้ GPS และกล้อง ซึ่งต้องทดสอบบน HTTPS หรือ localhost เท่านั้น

1. เปิดเบราว์เซอร์ใน Incognito/Private mode
2. ไปที่ [http://localhost:3000/checkin](http://localhost:3000/checkin)
3. อนุญาตการใช้กล้องและ Location
4. ถ่ายรูปและกดเช็กอิน

**หมายเหตุ:** บน Desktop อาจไม่มี GPS จริง ระบบจะแสดง "นอกพื้นที่" แต่ยังสามารถเช็กอินได้

#### ทดสอบ Admin Dashboard
1. ล็อกเอาท์
2. ล็อกอินด้วย `supervisor@anajak.com` หรือ `admin@anajak.com`
3. ไปที่ [http://localhost:3000/admin](http://localhost:3000/admin)

## Troubleshooting

### ❌ ปัญหา: "Invalid JWT" หรือ "User not found"

**แก้ไข:**
1. ตรวจสอบว่า User UID ที่ใส่ใน `employees` ตรงกับ User UID ใน Supabase Auth
2. ตรวจสอบว่า `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ถูกต้อง

### ❌ ปัญหา: "Row Level Security policy violation"

**แก้ไข:**
1. ตรวจสอบว่ารัน `schema.sql` ครบถ้วนแล้ว (รวม RLS policies)
2. ลองรันคำสั่ง SQL ใหม่ทั้งหมด

### ❌ ปัญหา: กล้องไม่เปิด

**แก้ไข:**
1. ตรวจสอบว่าอนุญาตการใช้กล้องในเบราว์เซอร์แล้ว
2. ลองใช้ HTTPS หรือ localhost เท่านั้น
3. ลองเปิดใน Incognito/Private mode

### ❌ ปัญหา: GPS ไม่ทำงาน

**แก้ไข:**
1. GPS บน Desktop มักไม่แม่นยำ ใช้มือถือทดสอบจะดีกว่า
2. ตรวจสอบว่าอนุญาตการใช้ Location ในเบราว์เซอร์แล้ว
3. เปลี่ยนค่า `NEXT_PUBLIC_GPS_RADIUS_METERS` ให้ใหญ่ขึ้น (เช่น 10000)

## Deploy to Production

### Deploy to Vercel

1. Push code ขึ้น GitHub
2. ไปที่ [https://vercel.com](https://vercel.com)
3. Import โปรเจค
4. ตั้งค่า Environment Variables (จาก `.env.local`)
5. Deploy!

### อัพเดต Environment Variables หลัง Deploy

อย่าลืมเปลี่ยน:
```env
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## ขั้นตอนถัดไป

หลังจากติดตั้งสำเร็จแล้ว คุณสามารถ:
1. ✅ ปรับแต่ง GPS Location ให้ตรงกับสถานที่ทำงานจริง (แก้ใน `app/checkin/page.tsx`)
2. ✅ เพิ่มพนักงานเพิ่มเติม
3. ✅ ปรับแต่ง UI/UX ตามต้องการ
4. ✅ เพิ่มฟีเจอร์ Phase 2: ระบบลางาน, WFH, OT วันหยุด
5. ✅ ต่อ LINE Integration (Phase 3)

---

**หากมีปัญหา:**
- ดูที่ `README.md`
- เช็ค console ใน browser (F12)
- เช็ค logs ใน Supabase Dashboard

**Good luck!** 🚀

