-- Fix auto_checkout_time to be 22:00 (10 PM Bangkok time)
-- This ensures the auto-checkout happens at the correct time

UPDATE system_settings 
SET setting_value = '22:00' 
WHERE setting_key = 'auto_checkout_time'
  AND setting_value != '22:00';

-- Also ensure default is 22:00 if not exists
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('auto_checkout_time', '22:00', 'เวลา Auto Checkout (HH:mm format, 24-hour)')
ON CONFLICT (setting_key) DO NOTHING;
