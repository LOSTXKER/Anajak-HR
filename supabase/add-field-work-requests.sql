-- Create field_work_requests table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS field_work_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  date DATE NOT NULL,
  is_half_day BOOLEAN DEFAULT FALSE,
  location TEXT NOT NULL, -- ชื่อสถานที่/ที่อยู่
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_field_work_employee ON field_work_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_field_work_date ON field_work_requests(date);
CREATE INDEX IF NOT EXISTS idx_field_work_status ON field_work_requests(status);

-- Enable RLS
ALTER TABLE field_work_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- พนักงานดูคำขอของตัวเอง / Admin-Supervisor ดูทั้งหมด
CREATE POLICY "Employees can view their own field work requests"
  ON field_work_requests FOR SELECT
  USING (
    auth.uid()::text = employee_id::text OR 
    EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('supervisor', 'admin'))
  );

-- พนักงานสร้างคำขอของตัวเอง
CREATE POLICY "Employees can create their own field work requests"
  ON field_work_requests FOR INSERT
  WITH CHECK (auth.uid()::text = employee_id::text);

-- Admin/Supervisor อัพเดทคำขอ (อนุมัติ/ปฏิเสธ)
CREATE POLICY "Supervisors and admins can update field work requests"
  ON field_work_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role IN ('supervisor', 'admin'))
  );

-- พนักงานสามารถยกเลิกคำขอของตัวเอง (pending only)
CREATE POLICY "Employees can cancel their own pending field work requests"
  ON field_work_requests FOR UPDATE
  USING (
    auth.uid()::text = employee_id::text AND status = 'pending'
  )
  WITH CHECK (
    status = 'cancelled'
  );

-- Comment
COMMENT ON TABLE field_work_requests IS 'Field work (outside office) requests - employees request to work at external locations';
COMMENT ON COLUMN field_work_requests.location IS 'Location/address where employee will work';

