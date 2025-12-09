-- Add late_minutes column to attendance_logs table
-- Run this in Supabase SQL Editor

ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0;

COMMENT ON COLUMN attendance_logs.late_minutes IS 'Number of minutes late from work start time';

