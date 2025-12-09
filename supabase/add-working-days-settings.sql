-- Add working days and OT rate settings
-- Run this in Supabase SQL Editor

-- Working days configuration (1=Monday, 2=Tuesday, ..., 7=Sunday)
-- Default: Monday-Friday (1,2,3,4,5)
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('working_days', '1,2,3,4,5', 'วันทำงาน (1=จันทร์, 2=อังคาร, 3=พุธ, 4=พฤหัส, 5=ศุกร์, 6=เสาร์, 7=อาทิตย์) คั่นด้วย comma')
ON CONFLICT (setting_key) DO NOTHING;

-- OT Rate for normal working day (after hours)
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('ot_rate_workday', '1.5', 'OT Rate วันทำงานปกติ (หลังเลิกงาน)')
ON CONFLICT (setting_key) DO NOTHING;

-- OT Rate for weekend
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('ot_rate_weekend', '1.5', 'OT Rate วันหยุดสุดสัปดาห์')
ON CONFLICT (setting_key) DO NOTHING;

-- OT Rate for public holiday
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('ot_rate_holiday', '2.0', 'OT Rate วันหยุดนักขัตฤกษ์')
ON CONFLICT (setting_key) DO NOTHING;

-- Require check-in for workday OT
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('ot_require_checkin_workday', 'true', 'ต้องเช็คอินก่อนทำ OT วันทำงานปกติ')
ON CONFLICT (setting_key) DO NOTHING;

-- Require check-in for weekend OT
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('ot_require_checkin_weekend', 'false', 'ต้องเช็คอินก่อนทำ OT วันหยุดสุดสัปดาห์')
ON CONFLICT (setting_key) DO NOTHING;

-- Require check-in for holiday OT
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('ot_require_checkin_holiday', 'false', 'ต้องเช็คอินก่อนทำ OT วันหยุดนักขัตฤกษ์')
ON CONFLICT (setting_key) DO NOTHING;

-- Verify settings
SELECT setting_key, setting_value, description 
FROM system_settings 
WHERE setting_key LIKE 'working_days%' 
   OR setting_key LIKE 'ot_rate_%' 
   OR setting_key LIKE 'ot_require_%'
ORDER BY setting_key;

