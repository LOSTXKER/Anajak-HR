-- Migration: Add Payroll Settings
-- Run this SQL in your Supabase SQL Editor

-- Add payroll-related settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('work_hours_per_day', '8', 'ชั่วโมงทำงานต่อวัน'),
  ('days_per_month', '26', 'วันทำงานต่อเดือน (ใช้คำนวณอัตรารายวัน)'),
  ('late_penalty_per_minute', '0', 'อัตราหักเงินต่อนาทีที่มาสาย (บาท)'),
  ('default_ot_rate_1x', '1.0', 'อัตรา OT 1x (ก่อนเวลาเข้างาน)'),
  ('default_ot_rate_1_5x', '1.5', 'อัตรา OT 1.5x (วันทำงานปกติ)'),
  ('default_ot_rate_2x', '2.0', 'อัตรา OT 2x (วันหยุด)')
ON CONFLICT (setting_key) DO UPDATE SET
  description = EXCLUDED.description;

-- Add columns for payroll summary (optional - for future use)
-- CREATE TABLE IF NOT EXISTS payroll_summaries (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
--   period_start DATE NOT NULL,
--   period_end DATE NOT NULL,
--   total_work_days INTEGER DEFAULT 0,
--   total_work_hours DECIMAL(10,2) DEFAULT 0,
--   total_late_minutes INTEGER DEFAULT 0,
--   total_ot_hours DECIMAL(10,2) DEFAULT 0,
--   base_pay DECIMAL(12,2) DEFAULT 0,
--   ot_pay DECIMAL(12,2) DEFAULT 0,
--   late_penalty DECIMAL(12,2) DEFAULT 0,
--   bonus DECIMAL(12,2) DEFAULT 0,
--   deductions DECIMAL(12,2) DEFAULT 0,
--   total_pay DECIMAL(12,2) DEFAULT 0,
--   status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
--   approved_by UUID REFERENCES employees(id),
--   approved_at TIMESTAMP WITH TIME ZONE,
--   notes TEXT,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   UNIQUE(employee_id, period_start, period_end)
-- );

-- Enable RLS for payroll_summaries (if table is created)
-- ALTER TABLE payroll_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payroll_summaries
-- CREATE POLICY "Admin can manage all payroll" ON payroll_summaries
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'admin'
--     )
--   );

-- CREATE POLICY "Employee can view own payroll" ON payroll_summaries
--   FOR SELECT USING (employee_id = auth.uid());

SELECT 'Payroll settings added successfully!' as message;

