# Anajak HR - Feature List

## ✅ Phase 1 - MVP (Completed)

### 🔐 Authentication
- [x] Login with email/password (Supabase Auth)
- [x] Role-based access control (Staff, Supervisor, Admin)
- [x] Session management
- [x] Protected routes

### 👤 Employee Management
- [x] Employee profiles with roles
- [x] Branch assignment
- [x] OT rates configuration

### ⏰ Attendance System
- [x] **Check-in** with GPS + Face photo
- [x] **Check-out** with GPS + Face photo
- [x] GPS validation (within radius)
- [x] Photo upload to Supabase Storage
- [x] Auto-calculate work hours
- [x] Late detection
- [x] Work mode tracking (onsite/wfh/field)

### 🔥 OT (Overtime) System
- [x] Request OT with reason + photo
- [x] Approve/Reject OT by supervisor
- [x] Track OT status (pending/approved/rejected/completed)
- [x] OT types (normal/holiday/pre-shift)
- [x] Calculate actual OT hours

### 📊 Dashboard
- [x] Admin/Supervisor dashboard
- [x] Today's attendance overview
- [x] Pending OT requests
- [x] Statistics cards (total employees, present, absent, OT)

### 📅 History & Reports
- [x] Personal attendance history
- [x] Personal OT history
- [x] Monthly summary with stats
- [x] Photo viewer for check-in/out photos

### 📈 Reports & Export
- [x] Monthly attendance reports
- [x] Employee-wise breakdown
- [x] Work hours, OT hours, late days summary
- [x] **Export to CSV** (Excel-compatible with UTF-8 BOM)

---

## ⏳ Phase 2 - Advanced Features (Planned)

### 📝 Leave Management
- [ ] Leave request form (sick/personal/annual)
- [ ] Attach medical certificate
- [ ] Approve/reject leave
- [ ] Leave quota tracking
- [ ] Leave balance display

### 🏠 Work From Home (WFH)
- [ ] WFH request
- [ ] WFH approval workflow
- [ ] WFH attendance tracking (without GPS validation)
- [ ] WFH vs Onsite reports

### 🎉 Holiday Management
- [x] Public holidays (already created in schema)
- [ ] Admin: Add/edit/delete holidays
- [ ] Import holiday calendar
- [ ] Branch-specific holidays
- [ ] Auto-detect holiday OT

### 🔔 Notifications
- [ ] LINE Messaging API integration
- [ ] Push notification when OT approved/rejected
- [ ] Reminder: Forgot to check-in/out
- [ ] Reminder: Late for work
- [ ] Daily summary to supervisor

### ⏱️ Shift Management
- [ ] Create shift templates (morning/evening/night)
- [ ] Assign employees to shifts
- [ ] Weekly/monthly shift schedule
- [ ] Auto-detect late based on shift time

---

## 🚀 Phase 3 - Payroll & Advanced

### 💰 Payroll System
- [ ] Monthly payroll calculation
- [ ] Base salary + OT pay
- [ ] Deductions (late, absent, tax, social security)
- [ ] Allowances (position, meal, transport)
- [ ] Generate payslip (PDF)
- [ ] Export for accounting system

### 📄 Document Management
- [ ] Upload employee documents (ID card, contract, etc.)
- [ ] Document expiry tracking
- [ ] Reminders for contract renewal

### 🎯 Performance & KPI
- [ ] Auto KPI calculation (attendance rate, late count)
- [ ] Supervisor manual ratings
- [ ] Monthly/quarterly performance reports
- [ ] Compare employee performance

### 📋 Disciplinary Actions
- [ ] Warning letters (verbal/written)
- [ ] Praise letters
- [ ] Attach to employee record
- [ ] Affect KPI score

---

## 🔮 Phase 4 - AI & Automation

### 🤖 Face Recognition
- [ ] Integrate Face Recognition API (AWS Rekognition / Azure Face API)
- [ ] Auto-verify face vs profile photo
- [ ] Prevent buddy punching

### 💬 LINE Integration
- [ ] LINE Rich Menu
- [ ] LIFF App for check-in/out
- [ ] LINE Login
- [ ] LINE Notify for alerts

### 🏢 Multi-Branch
- [x] Branch table (already created)
- [ ] Branch-wise GPS validation
- [ ] Branch admin role
- [ ] Branch-wise reports
- [ ] Transfer employee between branches

### 📱 Mobile App (Optional)
- [ ] React Native / Flutter app
- [ ] Better camera & GPS integration
- [ ] Offline mode (queue actions)
- [ ] Push notifications

### 🔗 Integrations
- [ ] Google Calendar sync
- [ ] Slack notifications
- [ ] Export to Google Sheets
- [ ] Webhook for external systems

---

## 🛠️ Technical Improvements

### Performance
- [ ] Image optimization before upload
- [ ] Lazy loading for large lists
- [ ] Pagination for reports
- [ ] Redis caching (if needed)

### Security
- [ ] Two-factor authentication (2FA)
- [ ] Device binding
- [ ] IP whitelist for admin
- [ ] Audit logs for admin actions
- [ ] Data encryption at rest

### DevOps
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated testing (Jest, Playwright)
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (Vercel Analytics)
- [ ] Database backups

### UI/UX
- [ ] Dark mode
- [ ] Multi-language (Thai/English/Burmese)
- [ ] Better mobile responsiveness
- [ ] Progressive Web App (PWA)
- [ ] Offline support

---

## 📝 Nice-to-Have Features

- [ ] Employee directory with search
- [ ] Birthday reminders
- [ ] Company announcements
- [ ] Team chat/messaging
- [ ] File sharing
- [ ] Training/course management
- [ ] Recruitment/onboarding flow
- [ ] Equipment tracking (laptop, uniform, keycard)
- [ ] Parking management
- [ ] Visitor check-in system

---

## 🎨 Current Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Deployment:** Vercel (recommended)
- **Icons:** Lucide React
- **Date:** date-fns

---

## 📊 Database Schema

### Current Tables
- ✅ `employees` - Employee profiles
- ✅ `branches` - Office/branch locations
- ✅ `attendance_logs` - Check-in/out records
- ✅ `ot_requests` - OT requests
- ✅ `holidays` - Holiday calendar
- ✅ `leave_requests` - Leave applications (schema ready)
- ✅ `wfh_requests` - WFH requests (schema ready)

### Future Tables (Phase 2+)
- ⏳ `shifts` - Shift templates
- ⏳ `employee_shift_assignments` - Employee shift schedules
- ⏳ `payroll_summaries` - Monthly payroll
- ⏳ `documents` - Employee documents
- ⏳ `performance_reviews` - KPI & reviews
- ⏳ `disciplinary_actions` - Warnings & praises
- ⏳ `announcements` - Company news

---

**Status Legend:**
- ✅ Completed
- ⏳ Planned (Schema Ready)
- [ ] To-Do

**Last Updated:** December 2024

