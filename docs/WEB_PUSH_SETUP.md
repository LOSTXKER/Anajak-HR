# 🔔 Web Push Notifications Setup Guide

อัปเกรด PWA Notifications ให้มีประสิทธิภาพเหมือน LINE โดยใช้ **Web Push API**

---

## ✨ ความสามารถใหม่

✅ **ทำงานได้แม้ปิด browser** (Android/Desktop)  
✅ **Persistent** - ไม่หายเมื่อรีโหลด  
✅ **Server-sent** - ส่งจาก backend เหมือน LINE  
✅ **Scheduled** - ตั้งเวลาส่งได้  
⚠️ **iOS** - ยังมีข้อจำกัด (ต้องเปิดแอป PWA)

---

## 📋 ขั้นตอนการติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
npm install web-push
```

### 2. สร้าง VAPID Keys

```bash
npx web-push generate-vapid-keys
```

คุณจะได้ output แบบนี้:

```
=======================================

Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U

Private Key:
UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKbqXo

=======================================
```

### 3. เพิ่ม Environment Variables

สร้าง/แก้ไขไฟล์ `.env.local`:

```env
# VAPID Keys for Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKbqXo
VAPID_SUBJECT=mailto:admin@anajak-hr.com
```

**⚠️ สำคัญ:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = เปิดเผยได้ (ใช้ใน client)
- `VAPID_PRIVATE_KEY` = **ห้ามเปิดเผย** (ใช้ใน server เท่านั้น)
- `VAPID_SUBJECT` = อีเมลหรือ URL ของคุณ

### 4. สร้างตาราง Database

รัน migration:

```bash
supabase migration up
# หรือ
psql -h <your-db-host> -U postgres -d postgres -f supabase/migrations/create_push_subscriptions.sql
```

### 5. อัปเดท Service Worker

ดูไฟล์ `public/sw.js` - เพิ่ม event handler สำหรับ push notifications

---

## 🚀 วิธีใช้งาน (สำหรับพนักงาน)

### หน้าพนักงาน: `/notifications`

1. เปิดหน้า Notifications
2. กด "เปิดการแจ้งเตือน"
3. อนุญาต Notification Permission
4. ระบบจะ subscribe อัตโนมัติ
5. ✅ พร้อมรับ push notifications!

---

## 📤 วิธีส่ง Push Notifications

### แบบที่ 1: ผ่าน API (แนะนำ)

```typescript
// ส่งไปยังพนักงานคนเดียว
await fetch('/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    employeeId: 'emp-123',
    title: '⏰ ถึงเวลาเช็คอิน',
    body: 'อย่าลืมเช็คอินเวลาเข้างานนะครับ',
    data: {
      url: '/checkin',
      action: 'checkin-reminder'
    }
  })
});

// ส่งไปยังหลายคน (broadcast)
await fetch('/api/push/send-bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    employeeIds: ['emp-1', 'emp-2', 'emp-3'],
    title: '🏖️ วันหยุดพรุ่งนี้',
    body: 'พรุ่งนี้เป็นวันหยุดราชการ',
  })
});
```

### แบบที่ 2: ผ่าน Cron Job (Scheduled)

สร้างไฟล์ `app/api/push/scheduled-reminders/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendPushNotification } from "@/lib/push/send";

export async function POST(request: NextRequest) {
  try {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // "08:30"
    
    // Get system settings
    const { data: settings } = await supabaseServer
      .from("system_settings")
      .select("*")
      .in("setting_key", ["work_start_time", "work_end_time"]);
    
    const map: any = {};
    settings?.forEach(s => { map[s.setting_key] = s.setting_value; });
    
    // Check if it's time to send check-in reminder
    if (currentTime === map.work_start_time) {
      await sendCheckinReminders();
    }
    
    // Check if it's time to send check-out reminder
    if (currentTime === map.work_end_time) {
      await sendCheckoutReminders();
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error("Scheduled reminders error:", error);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
```

เพิ่มใน `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/push/scheduled-reminders",
      "schedule": "* * * * *"
    }
  ]
}
```

---

## 🎯 กรณีการใช้งาน (Use Cases)

### 1. เตือนเช็คอิน (08:30)
```typescript
await sendPushToAllEmployees({
  title: '⏰ ถึงเวลาเช็คอิน',
  body: 'อย่าลืมเช็คอินเวลาเข้างานนะครับ',
  url: '/checkin'
});
```

### 2. เตือนเช็คเอาท์ (17:30)
```typescript
await sendPushToAllEmployees({
  title: '🏠 ถึงเวลาเช็คเอาท์',
  body: 'อย่าลืมเช็คเอาท์ก่อนกลับบ้านนะครับ',
  url: '/checkout'
});
```

### 3. OT อนุมัติ
```typescript
await sendPushToEmployee(employeeId, {
  title: '✅ OT อนุมัติแล้ว',
  body: 'คำขอ OT ของคุณได้รับการอนุมัติแล้ว',
  url: '/ot'
});
```

### 4. แจ้งเตือนวันหยุด
```typescript
await sendPushToAllEmployees({
  title: '🏖️ วันหยุดพรุ่งนี้',
  body: 'พรุ่งนี้เป็นวันหยุดราชการ - วันจักรี',
  url: '/holidays'
});
```

---

## 🔧 การทดสอบ

### ทดสอบจากหน้า Admin

1. ไปที่ `/admin/settings/push-test`
2. เลือกพนักงานที่ต้องการทดสอบ
3. กรอกข้อความ
4. กด "ส่งทดสอบ"
5. ✅ ตรวจสอบว่าได้รับ notification หรือไม่

### ทดสอบผ่าน API

```bash
curl -X POST http://localhost:3000/api/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "emp-123",
    "title": "Test Notification",
    "body": "This is a test message"
  }'
```

---

## 📱 รองรับ Platform

| Platform | รองรับ | หมายเหตุ |
|----------|--------|---------|
| **Android (Chrome)** | ✅ | ทำงานได้เต็มรูปแบบ |
| **Android (Firefox)** | ✅ | ทำงานได้เต็มรูปแบบ |
| **Android (Samsung)** | ✅ | ทำงานได้เต็มรูปแบบ |
| **Windows (Chrome)** | ✅ | ทำงานได้เต็มรูปแบบ |
| **Windows (Edge)** | ✅ | ทำงานได้เต็มรูปแบบ |
| **macOS (Chrome)** | ✅ | ทำงานได้เต็มรูปแบบ |
| **macOS (Safari)** | ⚠️ | จำกัด - ต้องเปิดแอป |
| **iOS (Safari)** | ⚠️ | จำกัดมาก - ต้องเปิด PWA + iOS 16.4+ |
| **iOS (Chrome)** | ❌ | ไม่รองรับ (ใช้ Safari engine) |

---

## 🐛 แก้ปัญหา

### ไม่ได้รับ Push Notification

**1. ตรวจสอบ Permission:**
```javascript
console.log('Notification permission:', Notification.permission);
// ควรเป็น "granted"
```

**2. ตรวจสอบ Subscription:**
```javascript
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.getSubscription();
console.log('Subscription:', subscription);
// ควรมีค่า ไม่ใช่ null
```

**3. ตรวจสอบ VAPID Keys:**
```bash
# ตรวจสอบว่าตั้งค่าใน .env.local แล้วหรือยัง
echo $NEXT_PUBLIC_VAPID_PUBLIC_KEY
echo $VAPID_PRIVATE_KEY
```

**4. ตรวจสอบ Service Worker:**
```javascript
navigator.serviceWorker.addEventListener('message', event => {
  console.log('SW Message:', event.data);
});
```

**5. ดู Console Log:**
- เปิด Developer Tools (F12)
- ไปที่ Console
- ดู error messages

### iOS ไม่ทำงาน

iOS มีข้อจำกัดมาก:
- ต้องติดตั้งแอปผ่าน "Add to Home Screen"
- ต้องใช้ iOS 16.4 ขึ้นไป
- ต้องเปิดแอป PWA อยู่
- **แนะนำ:** ใช้ LINE Notifications สำหรับ iOS

---

## 🔐 ความปลอดภัย

1. **VAPID Private Key** - เก็บไว้ใน environment variable เท่านั้น
2. **HTTPS Required** - Web Push ทำงานบน HTTPS เท่านั้น
3. **User Permission** - ต้องขออนุญาตจากผู้ใช้ก่อน
4. **Rate Limiting** - จำกัดจำนวนการส่งเพื่อป้องกัน spam

---

## 📊 Monitoring

### ดูสถิติการใช้งาน

```sql
-- จำนวน subscriptions ทั้งหมด
SELECT COUNT(*) FROM push_subscriptions;

-- Subscriptions แยกตาม platform
SELECT user_agent, COUNT(*) 
FROM push_subscriptions 
GROUP BY user_agent;

-- Subscriptions ที่ active (updated ใน 7 วันล่าสุด)
SELECT COUNT(*) 
FROM push_subscriptions 
WHERE updated_at > NOW() - INTERVAL '7 days';
```

---

## 🎉 สรุป

Web Push Notifications ทำให้:
- ✅ PWA มีประสิทธิภาพเหมือน LINE
- ✅ ส่งการแจ้งเตือนได้แม้ปิด browser
- ✅ Scheduled notifications ทำงานได้
- ✅ Persistent และ reliable

**💡 แนะนำ:**
- **Android/Desktop:** ใช้ Web Push
- **iOS:** ใช้ LINE Notifications
- **Best of both worlds!** 🎯

