# Environment Variables Setup

## Required Variables

สำหรับให้ระบบทำงานได้ครบถ้วน กรุณาเพิ่ม environment variables ต่อไปนี้ในไฟล์ `.env.local`:

### 1. Supabase Configuration

```env
# Supabase Public URL
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url

# Supabase Anonymous Key (for client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase Service Role Key (for server-side API routes)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**วิธีหา Service Role Key:**
1. ไปที่ [Supabase Dashboard](https://supabase.com/dashboard)
2. เลือก Project ของคุณ
3. ไปที่ **Settings** > **API**
4. หา **service_role** key (อยู่ในส่วน Project API keys)
5. คลิก "Copy" หรือ "Reveal" เพื่อดู key
6. ⚠️ **คำเตือน:** Service Role Key มีสิทธิ์เต็มที่ กรุณาเก็บเป็นความลับ และไม่ใช้ในฝั่ง client-side!

### 2. LINE Messaging API (Optional)

```env
# LINE Configuration (สามารถตั้งค่าผ่านหน้าเว็บได้ที่ /admin/settings)
# ไม่จำเป็นต้องใส่ใน .env.local อีกต่อไป
```

## Example `.env.local` File

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Why Service Role Key?

Service Role Key ใช้สำหรับ:
- ✅ API routes ที่ต้องเข้าถึงข้อมูลโดยไม่ผ่าน RLS (Row Level Security)
- ✅ การส่ง LINE notifications จาก server-side
- ✅ การดึงการตั้งค่าระบบ (system_settings) ใน API routes

**หมายเหตุ:** 
- Client-side (browser) ใช้ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ปลอดภัย ผ่าน RLS)
- Server-side (API routes) ใช้ `SUPABASE_SERVICE_ROLE_KEY` (ข้ามผ่าน RLS)

## Verification

หลังจากเพิ่ม environment variables แล้ว:

1. Restart development server:
   ```bash
   npm run dev
   ```

2. ทดสอบส่งข้อความ LINE ที่หน้า `/admin/settings/messages`
3. กดปุ่ม "ทดสอบส่ง" ในข้อความแต่ละอัน
4. ควรได้รับข้อความทดสอบใน LINE

## Troubleshooting

### ❌ Error: "Missing Supabase environment variables"
- ตรวจสอบว่าได้เพิ่ม variables ครบถ้วนใน `.env.local`
- ตรวจสอบชื่อ variables ว่าถูกต้อง (case-sensitive)
- Restart server หลังแก้ไข `.env.local`

### ❌ Error: "Token และ Recipient ID จำเป็น"
- ตั้งค่า LINE API ที่หน้า `/admin/settings` ก่อน
- กรอก Channel Access Token และ Recipient ID
- คลิก "บันทึกการตั้งค่า"

### ❌ Error: "ไม่สามารถดึงการตั้งค่าได้"
- ตรวจสอบว่าได้เพิ่ม `SUPABASE_SERVICE_ROLE_KEY` แล้ว
- ตรวจสอบว่า key ถูกต้อง (copy มาครบ)
- Restart server

