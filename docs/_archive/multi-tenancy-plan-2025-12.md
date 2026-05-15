# 🏢 Multi-tenancy Plan (SaaS)

> **Status:** 📋 Planned (ทำหลัง Refactor Admin Pages เสร็จ)  
> **Priority:** Phase 2  
> **Est. Time:** 3-4 สัปดาห์

---

## 🎯 เป้าหมาย

ทำระบบ Anajak HR เป็น **SaaS Platform** ที่:
- หลายองค์กรใช้งานร่วมกันได้
- แต่ละองค์กรมี Branding ของตัวเอง
- มีระบบ Subscription Plan
- ข้อมูลแยกขาดกันอย่างปลอดภัย

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Anajak HR SaaS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Acme Co   │  │  XYZ Corp   │  │  ABC Ltd    │             │
│  │  (org_001)  │  │  (org_002)  │  │  (org_003)  │             │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤             │
│  │ - Employees │  │ - Employees │  │ - Employees │             │
│  │ - Branches  │  │ - Branches  │  │ - Branches  │             │
│  │ - Settings  │  │ - Settings  │  │ - Settings  │             │
│  │ - Theme     │  │ - Theme     │  │ - Theme     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    Shared Infrastructure                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Database │  │ Storage  │  │  Auth    │  │ Billing  │        │
│  │(Supabase)│  │(Supabase)│  │(Supabase)│  │ (Stripe) │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Changes

### New Tables

```sql
-- Organizations (หลัก)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- URL: acme.anajak-hr.com
  logo_url TEXT,
  favicon_url TEXT,
  
  -- Branding
  primary_color TEXT DEFAULT '#0071e3',
  secondary_color TEXT DEFAULT '#34c759',
  theme TEXT DEFAULT 'light',  -- light, dark, auto
  
  -- Settings
  settings JSONB DEFAULT '{}',
  timezone TEXT DEFAULT 'Asia/Bangkok',
  language TEXT DEFAULT 'th',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  
  -- Subscription
  plan TEXT DEFAULT 'free',  -- free, starter, professional, enterprise
  plan_expires_at TIMESTAMPTZ,
  max_employees INT DEFAULT 10,
  
  -- Status
  status TEXT DEFAULT 'active',  -- active, suspended, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Members (User-Org relationship)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',  -- owner, admin, member
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',  -- pending, active, removed
  UNIQUE(organization_id, user_id)
);

-- Subscription Plans
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,  -- 'free', 'starter', 'professional', 'enterprise'
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  max_employees INT,
  max_branches INT,
  max_storage_gb INT,
  features JSONB,  -- ['gps_tracking', 'line_integration', 'custom_reports', etc.]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES subscription_plans(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'THB',
  status TEXT DEFAULT 'pending',  -- pending, paid, failed, refunded
  billing_period_start DATE,
  billing_period_end DATE,
  paid_at TIMESTAMPTZ,
  stripe_invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Invitations
CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Modify Existing Tables

```sql
-- Add organization_id to ALL existing tables
ALTER TABLE employees ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE branches ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE attendance_logs ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE ot_requests ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE leave_requests ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE wfh_requests ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE late_requests ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE holidays ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE system_settings ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE checkout_reminders ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE attendance_anomalies ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE leave_balances ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Create indexes for performance
CREATE INDEX idx_employees_org ON employees(organization_id);
CREATE INDEX idx_branches_org ON branches(organization_id);
CREATE INDEX idx_attendance_logs_org ON attendance_logs(organization_id);
CREATE INDEX idx_ot_requests_org ON ot_requests(organization_id);
CREATE INDEX idx_leave_requests_org ON leave_requests(organization_id);
-- ... etc.
```

---

## 🔐 Row Level Security (RLS)

```sql
-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id 
  FROM organization_members 
  WHERE user_id = auth.uid() 
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is org admin
CREATE OR REPLACE FUNCTION is_organization_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid() 
      AND organization_id = get_user_organization_id()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Example RLS policy for employees
CREATE POLICY "Users can only see their organization employees"
ON employees FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Only org admins can insert employees"
ON employees FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id() 
  AND is_organization_admin()
);

-- Repeat for all tables...
```

---

## 💳 Subscription Plans

### Plan Structure

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| **Price/mo** | ฿0 | ฿499 | ฿1,499 | Custom |
| **Employees** | 10 | 50 | 200 | Unlimited |
| **Branches** | 1 | 3 | 10 | Unlimited |
| **Storage** | 1 GB | 10 GB | 50 GB | Unlimited |
| **GPS Tracking** | ❌ | ✅ | ✅ | ✅ |
| **LINE Integration** | ❌ | ❌ | ✅ | ✅ |
| **Custom Reports** | ❌ | ❌ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ❌ | ✅ |
| **White Label** | ❌ | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ | ✅ |
| **SLA** | ❌ | ❌ | 99.5% | 99.9% |

### Billing Integration (Stripe)

```typescript
// lib/billing/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Create checkout session
export async function createCheckoutSession(orgId: string, planId: string) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'promptpay'],
    line_items: [{
      price: STRIPE_PRICE_IDS[planId],
      quantity: 1,
    }],
    success_url: `${BASE_URL}/admin/settings/billing?success=true`,
    cancel_url: `${BASE_URL}/admin/settings/billing?cancelled=true`,
    metadata: { organization_id: orgId },
  });
  return session;
}

// Webhook handler
export async function handleWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await activateSubscription(event.data.object);
      break;
    case 'invoice.paid':
      await recordPayment(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await cancelSubscription(event.data.object);
      break;
  }
}
```

---

## 🎨 Branding & Theming

### Organization Settings

```typescript
interface OrganizationBranding {
  // Logo
  logoUrl: string;
  faviconUrl: string;
  
  // Colors
  primaryColor: string;    // Main brand color
  secondaryColor: string;  // Accent color
  
  // Theme
  theme: 'light' | 'dark' | 'auto';
  
  // Login Page
  loginBackgroundUrl?: string;
  loginMessage?: string;
  
  // Email
  emailLogoUrl?: string;
  emailFooter?: string;
}
```

### CSS Variables Injection

```typescript
// hooks/useOrganizationTheme.ts
export function useOrganizationTheme(org: Organization) {
  useEffect(() => {
    if (org.primary_color) {
      document.documentElement.style.setProperty('--primary-color', org.primary_color);
    }
    if (org.secondary_color) {
      document.documentElement.style.setProperty('--secondary-color', org.secondary_color);
    }
    // Set favicon
    if (org.favicon_url) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) link.href = org.favicon_url;
    }
    // Set page title
    document.title = `${org.name} - HR System`;
  }, [org]);
}
```

---

## 🌐 URL Structure

### Option 1: Subdomain (Recommended)

```
acme.anajak-hr.com       → Acme Corp
xyz.anajak-hr.com        → XYZ Corporation
demo.anajak-hr.com       → Demo Account

www.anajak-hr.com        → Marketing Site
app.anajak-hr.com        → Login/Signup
```

### Option 2: Path-based

```
anajak-hr.com/org/acme   → Acme Corp
anajak-hr.com/org/xyz    → XYZ Corporation
```

### Middleware for Subdomain

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];
  
  // Skip for main domains
  if (['www', 'app', 'api'].includes(subdomain)) {
    return NextResponse.next();
  }
  
  // Rewrite to org-specific route
  const url = request.nextUrl.clone();
  url.pathname = `/org/${subdomain}${url.pathname}`;
  
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 📱 New Pages

### Super Admin (Platform Owner)

```
/super-admin/
├── dashboard         → Platform overview
├── organizations     → Manage all orgs
├── users            → All platform users
├── subscriptions    → Billing overview
├── analytics        → Platform analytics
└── settings         → Platform settings
```

### Organization Admin

```
/admin/settings/
├── organization     → Org info, logo, branding
├── billing          → Subscription, invoices
├── team             → Invite/remove members
└── ... (existing)
```

### Public Pages

```
/
├── (home)           → Landing page
├── pricing          → Pricing plans
├── features         → Feature list
├── signup           → Create organization
├── login            → Login page
└── demo             → Request demo
```

---

## 🔄 Migration Plan

### Step 1: Prepare Database
- [ ] Create organizations table
- [ ] Create subscription tables
- [ ] Add organization_id to all tables
- [ ] Create indexes

### Step 2: Create Default Organization
- [ ] Create "default" organization for existing data
- [ ] Assign all existing data to default org
- [ ] Assign all users to default org

### Step 3: Update RLS Policies
- [ ] Drop existing policies
- [ ] Create organization-aware policies
- [ ] Test data isolation

### Step 4: Update Application Code
- [ ] Add organization context
- [ ] Update all queries to use organization_id
- [ ] Add organization middleware

### Step 5: Add New Features
- [ ] Organization settings page
- [ ] Team management
- [ ] Branding settings
- [ ] Billing integration

### Step 6: Public Pages
- [ ] Landing page
- [ ] Pricing page
- [ ] Signup flow
- [ ] Login with org selection

---

## 📅 Timeline

| Week | Tasks |
|------|-------|
| **Week 1** | Database schema + migrations |
| **Week 2** | RLS policies + organization context |
| **Week 3** | Update all queries + middleware |
| **Week 4** | Organization settings UI + team management |
| **Week 5** | Branding/theming + billing (Stripe) |
| **Week 6** | Public pages + signup flow |
| **Week 7** | Testing + bug fixes |
| **Week 8** | Soft launch + monitoring |

---

## ✅ Definition of Done

### Core Multi-tenancy
- [ ] Organizations table created
- [ ] All tables have organization_id
- [ ] RLS policies isolate data by organization
- [ ] Existing data migrated to default org

### Organization Management
- [ ] Create new organization
- [ ] Edit organization info
- [ ] Upload logo/favicon
- [ ] Custom colors/theme
- [ ] Invite team members
- [ ] Remove team members
- [ ] Transfer ownership

### Subscription & Billing
- [ ] Pricing page
- [ ] Stripe checkout integration
- [ ] Subscription management
- [ ] Invoice history
- [ ] Plan limits enforcement
- [ ] Upgrade/downgrade flow

### User Experience
- [ ] Subdomain routing works
- [ ] Organization branding applied
- [ ] Login shows org logo
- [ ] Email templates use org branding

### Security
- [ ] Data isolation verified
- [ ] Cross-org access prevented
- [ ] Audit log for sensitive actions

---

## 🚨 Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data leakage between orgs | Critical | Extensive RLS testing + audit |
| Performance with many orgs | High | Proper indexing + query optimization |
| Billing integration issues | High | Sandbox testing + error handling |
| Migration of existing data | Medium | Backup + rollback plan |
| Subdomain SSL certificates | Medium | Use wildcard SSL |

---

## 📝 Notes

- **ทำหลัง Refactor Admin Pages เสร็จ** - Code จะสะอาดกว่า
- **เริ่มจาก Basic** - Organization + Data isolation ก่อน
- **Billing ทำทีหลัง** - เริ่มด้วย Free plan ทุก org
- **Subdomain ต้องมี Wildcard DNS** - *.anajak-hr.com
- **ระวัง Storage** - แยก folder ต่อ org

---

## 🔗 Resources

- [Supabase Multi-tenancy Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Stripe Subscription Docs](https://stripe.com/docs/billing/subscriptions)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Vercel Wildcard Domains](https://vercel.com/docs/concepts/projects/domains)

