# Changelog

All notable changes to Anajak HR System will be documented in this file.

## [1.0.0] - 2024-12-08

### Added - MVP Release 🎉

#### Core Features
- ✅ **Authentication System**
  - Login with Supabase Auth
  - Role-based access (Staff, Supervisor, Admin)
  - Protected routes
  - Session management

- ✅ **Check-in/Check-out System**
  - GPS location tracking
  - Face photo capture (selfie)
  - GPS validation (within radius)
  - Photo upload to Supabase Storage
  - Auto-calculate work hours
  - Late detection
  - Notes/remarks support

- ✅ **OT (Overtime) Management**
  - Request OT with reason
  - Upload before/after photos
  - Supervisor approval workflow
  - OT status tracking (pending/approved/rejected/completed)
  - Calculate actual OT hours
  - OT types (normal/holiday/pre-shift)

- ✅ **Admin Dashboard**
  - Today's attendance overview
  - Present/Absent/Late statistics
  - Pending OT requests list
  - Quick approve/reject OT
  - Employee statistics

- ✅ **History & Reports**
  - Personal attendance history
  - Personal OT history
  - Monthly summary with stats
  - Photo viewer for check-in/out
  - Work hours & OT hours tracking

- ✅ **Reports & Export**
  - Monthly attendance reports
  - Employee-wise breakdown
  - Work hours, OT hours, late days
  - Export to CSV (Excel-compatible)
  - Summary statistics

#### Database
- ✅ PostgreSQL via Supabase
- ✅ Row Level Security (RLS)
- ✅ Tables: employees, branches, attendance_logs, ot_requests, holidays
- ✅ Auto-updated timestamps
- ✅ Proper indexes for performance

#### UI/UX
- ✅ Modern, responsive design with Tailwind CSS
- ✅ Thai language interface
- ✅ Mobile-friendly
- ✅ Loading states
- ✅ Error handling
- ✅ Success/Error alerts

#### Developer Experience
- ✅ TypeScript for type safety
- ✅ ESLint configuration
- ✅ Detailed documentation (README, SETUP, FEATURES)
- ✅ SQL schema + seed data
- ✅ Environment variables example

### Technical Stack
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Supabase (Auth, Database, Storage)
- date-fns (Date utilities)
- Lucide React (Icons)

---

## [Upcoming] - Phase 2

### Planned Features
- [ ] Leave management system
- [ ] Work From Home (WFH) requests
- [ ] Holiday calendar management
- [ ] Shift scheduling
- [ ] LINE notifications
- [ ] Face recognition API integration

---

## [Future] - Phase 3+

### Planned Features
- [ ] Payroll calculation
- [ ] Payslip generation
- [ ] Employee KPI tracking
- [ ] Document management
- [ ] Multi-branch support
- [ ] LINE LIFF integration
- [ ] Mobile app (React Native)

---

**Version Format:** [Major.Minor.Patch]
- **Major:** Breaking changes
- **Minor:** New features (backward compatible)
- **Patch:** Bug fixes

**Last Updated:** December 8, 2024

