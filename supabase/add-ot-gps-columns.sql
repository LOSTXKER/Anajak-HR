-- Add GPS columns to ot_requests table for OT tracking
-- Run this in Supabase SQL Editor

-- Add GPS columns for OT start
ALTER TABLE ot_requests 
ADD COLUMN IF NOT EXISTS start_gps_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS start_gps_lng DECIMAL(11, 8);

-- Add GPS columns for OT end
ALTER TABLE ot_requests 
ADD COLUMN IF NOT EXISTS end_gps_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS end_gps_lng DECIMAL(11, 8);

-- Add setting for early OT start buffer (minutes before approved time)
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('ot_early_start_buffer', '15', 'จำนวนนาทีที่อนุญาตให้เริ่ม OT ก่อนเวลาที่อนุมัติ (เช่น 15 = เริ่มได้ก่อน 15 นาที)')
ON CONFLICT (setting_key) DO NOTHING;

-- Verify changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ot_requests' 
AND column_name IN ('start_gps_lat', 'start_gps_lng', 'end_gps_lat', 'end_gps_lng');

