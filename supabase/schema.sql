-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  gps_lat DECIMAL(10, 8) NOT NULL,
  gps_lng DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('staff', 'supervisor', 'admin')),
  base_salary DECIMAL(12, 2) DEFAULT 0,
  base_salary_rate DECIMAL(10, 2),
  ot_rate_1x DECIMAL(5, 2) DEFAULT 1.0,
  ot_rate_1_5x DECIMAL(5, 2) DEFAULT 1.5,
  ot_rate_2x DECIMAL(5, 2) DEFAULT 2.0,
  commission DECIMAL(10, 2) DEFAULT 0,
  account_status VARCHAR(20) DEFAULT 'pending' CHECK (account_status IN ('pending', 'approved', 'rejected')),
  line_user_id VARCHAR(255),
  is_system_account BOOLEAN DEFAULT FALSE,
  face_profile_image_url TEXT,
  device_id VARCHAR(255),
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance_logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  work_date DATE NOT NULL,
  clock_in_time TIMESTAMP WITH TIME ZONE,
  clock_in_gps_lat DECIMAL(10, 8),
  clock_in_gps_lng DECIMAL(11, 8),
  clock_in_photo_url TEXT,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  clock_out_gps_lat DECIMAL(10, 8),
  clock_out_gps_lng DECIMAL(11, 8),
  clock_out_photo_url TEXT,
  total_hours DECIMAL(5, 2),
  is_late BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'leave', 'holiday', 'wfh')),
  work_mode VARCHAR(20) CHECK (work_mode IN ('onsite', 'wfh', 'field')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, work_date)
);

-- Create ot_requests table
CREATE TABLE IF NOT EXISTS ot_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  ot_type VARCHAR(20) DEFAULT 'normal' CHECK (ot_type IN ('normal', 'holiday', 'pre_shift')),
  request_date DATE NOT NULL,
  requested_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  requested_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  approved_start_time TIMESTAMP WITH TIME ZONE,
  approved_end_time TIMESTAMP WITH TIME ZONE,
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  before_photo_url TEXT,
  after_photo_url TEXT,
  approved_by UUID REFERENCES employees(id),
  actual_ot_hours DECIMAL(5, 2),
  approved_ot_hours DECIMAL(5, 2),
  ot_rate DECIMAL(5, 2),
  ot_amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) DEFAULT 'public' CHECK (type IN ('public', 'company', 'branch')),
  branch_id UUID REFERENCES branches(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leave_requests table (Phase 2)
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_half_day BOOLEAN DEFAULT FALSE,
  reason TEXT,
  attachment_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wfh_requests table (Phase 2)
CREATE TABLE IF NOT EXISTS wfh_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  date DATE NOT NULL,
  is_half_day BOOLEAN DEFAULT FALSE,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_logs(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_work_date ON attendance_logs(work_date);
CREATE INDEX IF NOT EXISTS idx_ot_requests_employee ON ot_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_ot_requests_status ON ot_requests(status);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_logs_updated_at ON attendance_logs;
CREATE TRIGGER update_attendance_logs_updated_at BEFORE UPDATE ON attendance_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ot_requests_updated_at ON ot_requests;
CREATE TRIGGER update_ot_requests_updated_at BEFORE UPDATE ON ot_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wfh_requests_updated_at ON wfh_requests;
CREATE TRIGGER update_wfh_requests_updated_at BEFORE UPDATE ON wfh_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE wfh_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Employees can view their own data"
  ON employees FOR SELECT
  USING (auth.uid()::text = id::text OR 
         EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('supervisor', 'admin')));

-- RLS Policies for attendance_logs
CREATE POLICY "Employees can view their own attendance"
  ON attendance_logs FOR SELECT
  USING (auth.uid()::text = employee_id::text OR 
         EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('supervisor', 'admin')));

CREATE POLICY "Employees can insert their own attendance"
  ON attendance_logs FOR INSERT
  WITH CHECK (auth.uid()::text = employee_id::text);

CREATE POLICY "Employees can update their own attendance"
  ON attendance_logs FOR UPDATE
  USING (auth.uid()::text = employee_id::text OR 
         EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('supervisor', 'admin')));

-- RLS Policies for ot_requests
CREATE POLICY "Employees can view their own OT requests"
  ON ot_requests FOR SELECT
  USING (auth.uid()::text = employee_id::text OR 
         EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('supervisor', 'admin')));

CREATE POLICY "Employees can create their own OT requests"
  ON ot_requests FOR INSERT
  WITH CHECK (auth.uid()::text = employee_id::text);

CREATE POLICY "Supervisors and admins can update OT requests"
  ON ot_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('supervisor', 'admin')) OR
         auth.uid()::text = employee_id::text);

-- Insert sample data (for testing)
-- INSERT INTO branches (name, address, gps_lat, gps_lng) VALUES
--   ('สำนักงานใหญ่', '123 ถนนสุขุมวิท กรุงเทพฯ', 13.7563, 100.5018);

-- INSERT INTO employees (name, email, phone, role) VALUES
--   ('Admin User', 'admin@anajak.com', '0812345678', 'admin'),
--   ('Supervisor User', 'supervisor@anajak.com', '0823456789', 'supervisor'),
--   ('Staff User', 'staff@anajak.com', '0834567890', 'staff');










