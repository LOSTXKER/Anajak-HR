# 🔧 แก้ไข Supabase Auth Error - Next.js 15

## ปัญหา
```
AuthApiError: Invalid Refresh Token: Refresh Token Not Found
```

## สาเหตุ
- Next.js 15 + Supabase Auth Helpers เวอร์ชันเก่าไม่เข้ากัน
- Refresh token ไม่ถูกจัดการอย่างถูกต้อง

---

## ✅ วิธีแก้ที่ 1: Quick Fix (ทำแล้ว)

ผมได้แก้ไขโค้ดให้แล้วใน:
- `lib/supabase/client.ts` - เพิ่ม auth config
- `lib/auth/auth-context.tsx` - เพิ่ม error handling

**ขั้นตอนถัดไป:**

### 1. ล้าง Browser Cache
```javascript
// เปิด Browser Console (F12) แล้วรัน:
localStorage.clear()
sessionStorage.clear()
// Reload หน้าเว็บ (Cmd+R หรือ Ctrl+R)
```

### 2. Restart Dev Server
```bash
# กด Ctrl+C แล้วรันใหม่
npm run dev
```

### 3. Login ใหม่
- ไปที่ `/login`
- Login ใหม่อีกครั้ง
- Error ควรหายไป

---

## 🚀 วิธีแก้ที่ 2: อัพเกรดเป็น @supabase/ssr (ถาวร)

ถ้า Quick Fix ยังไม่หาย ให้อัพเกรด:

### 1. ติดตั้ง Package ใหม่
```bash
npm install @supabase/ssr
npm uninstall @supabase/auth-helpers-nextjs
```

### 2. สร้าง middleware.ts

สร้างไฟล์ `middleware.ts` ใน root:

\`\`\`typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
\`\`\`

### 3. อัพเดท lib/supabase/client.ts

\`\`\`typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  : null as any

export function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured')
  }
  return supabase
}
\`\`\`

### 4. อัพเดท lib/supabase/server.ts

\`\`\`typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabaseServer = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export const supabaseAdmin = supabaseServer
\`\`\`

### 5. Restart และ Test
```bash
npm run dev
```

---

## 🐛 Troubleshooting

### Error ยังไม่หาย?

1. **ลบ .next folder**
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **เช็ค Environment Variables**
   ```bash
   # ใน .env.local ต้องมี:
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ```

3. **ลอง Incognito/Private Mode**
   - เปิด browser ใหม่ใน incognito mode
   - ทดสอบ login

4. **เช็ค Supabase Dashboard**
   - ไปที่ Supabase Dashboard
   - Settings > API > Reset anon key (ถ้าจำเป็น)

### Error อื่นๆ

- **"Failed to fetch"**: เช็ค network/internet connection
- **"Invalid API key"**: เช็ค .env.local
- **"Session expired"**: ปกติ ให้ login ใหม่

---

## 📚 Resources

- [Supabase Auth with Next.js 13+](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Next.js 15 Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [@supabase/ssr Documentation](https://github.com/supabase/ssr)

---

## ✅ สรุป

1. ✅ Quick fix: แก้โค้ด + ล้าง cache
2. 🔄 ถ้ายังไม่หาย: อัพเกรดเป็น @supabase/ssr
3. 🛠️ สร้าง middleware.ts
4. 🧪 Test และ deploy

**ปัญหาควรหายแล้วหลังจากล้าง cache และ restart!**

