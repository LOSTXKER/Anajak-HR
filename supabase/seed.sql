-- Seed data for testing
-- Run this after schema.sql

-- Insert sample branch
INSERT INTO branches (id, name, address, gps_lat, gps_lng, radius_meters) VALUES
  ('00000000-0000-0000-0000-000000000001', 'สำนักงานใหญ่ กรุงเทพฯ', '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110', 13.7563, 100.5018, 100);

-- Insert sample employees (Note: You need to create these users in Supabase Auth first)
-- Password for all test accounts: password123

-- Sample data (update IDs to match your Supabase Auth users)
-- INSERT INTO employees (id, name, email, phone, role, branch_id, base_salary_rate, ot_rate_1_5x, ot_rate_2x) VALUES
--   ('user-uuid-1', 'Admin User', 'admin@anajak.com', '0812345678', 'admin', '00000000-0000-0000-0000-000000000001', 30000, 1.5, 2.0),
--   ('user-uuid-2', 'Supervisor User', 'supervisor@anajak.com', '0823456789', 'supervisor', '00000000-0000-0000-0000-000000000001', 25000, 1.5, 2.0),
--   ('user-uuid-3', 'Staff User 1', 'staff@anajak.com', '0834567890', 'staff', '00000000-0000-0000-0000-000000000001', 20000, 1.5, 2.0),
--   ('user-uuid-4', 'Staff User 2', 'staff2@anajak.com', '0845678901', 'staff', '00000000-0000-0000-0000-000000000001', 20000, 1.5, 2.0);

-- Insert sample holidays
INSERT INTO holidays (date, name, type) VALUES
  ('2024-01-01', 'วันขึ้นปีใหม่', 'public'),
  ('2024-04-13', 'วันสงกรานต์', 'public'),
  ('2024-04-14', 'วันสงกรานต์', 'public'),
  ('2024-04-15', 'วันสงกรานต์', 'public'),
  ('2024-05-01', 'วันแรงงาน', 'public'),
  ('2024-05-04', 'วันฉัตรมงคล', 'public'),
  ('2024-07-28', 'วันเฉลิมพระชนมพรรษา', 'public'),
  ('2024-08-12', 'วันแม่แห่งชาติ', 'public'),
  ('2024-10-13', 'วันคล้ายวันสวรรคต', 'public'),
  ('2024-10-23', 'วันปิยมหาราช', 'public'),
  ('2024-12-05', 'วันพ่อแห่งชาติ', 'public'),
  ('2024-12-10', 'วันรัฐธรรมนูญ', 'public'),
  ('2024-12-31', 'วันสิ้นปี', 'public'),
  ('2025-01-01', 'วันขึ้นปีใหม่', 'public');

-- Sample attendance logs (for testing - update employee_id to match your actual user IDs)
-- INSERT INTO attendance_logs (employee_id, work_date, clock_in_time, clock_out_time, total_hours, is_late, status, work_mode) VALUES
--   ('user-uuid-3', '2024-12-01', '2024-12-01 08:00:00+07', '2024-12-01 17:00:00+07', 9, false, 'present', 'onsite'),
--   ('user-uuid-3', '2024-12-02', '2024-12-02 08:30:00+07', '2024-12-02 17:15:00+07', 8.75, true, 'present', 'onsite');


