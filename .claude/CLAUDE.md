# Anajak HR — Employee Management

## Project
ระบบ check-in/check-out พนักงาน พร้อม GPS + facial verification, OT request, leave management, LINE notifications

## Business
**Anajak** — HR system สำหรับพนักงาน 5 คน

## Stack
- Framework: Next.js 15, React 19, TypeScript
- Database: PostgreSQL (Supabase) + Prisma 7
- Notifications: LINE Messaging API
- Charts: Recharts
- PWA: web-push
- Validation: Zod

## How to Run
```bash
npm install
# set .env.local (Supabase creds + LINE channel)
npm run dev    # localhost:3000
```

## Key Files
- `supabase/schema.sql` — Employees, attendance_logs, ot_requests, leave_requests, branches
- `src/app/checkin` — Mobile check-in page
- `src/app/admin` — Dashboard (attendance, OT approval, reports)
- `src/lib/line` — LINE API integration

## Current Status
- ✅ Phase 1-2 done (check-in, OT, leave)
- 🚧 Phase 3 (payroll) pending
