-- Create late_requests table for employees to request late arrival approval
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS late_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  request_date DATE NOT NULL,
  reason TEXT NOT NULL,
  expected_arrival_time TIME, -- เวลาที่คาดว่าจะมาถึง (optional)
  actual_late_minutes INTEGER, -- นาทีที่สายจริง (จาก attendance_logs)
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_late_requests_employee ON late_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_late_requests_date ON late_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_late_requests_status ON late_requests(status);

-- RLS Policies
ALTER TABLE late_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own late requests"
  ON late_requests FOR SELECT
  USING (auth.uid() = employee_id);

-- Users can insert their own requests
CREATE POLICY "Users can create their own late requests"
  ON late_requests FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

-- Users can update their own pending requests (cancel)
CREATE POLICY "Users can update their own late requests"
  ON late_requests FOR UPDATE
  USING (auth.uid() = employee_id);

-- Admin/Supervisor can view all
CREATE POLICY "Admin can view all late requests"
  ON late_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
  );

-- Admin/Supervisor can update all (approve/reject)
CREATE POLICY "Admin can update all late requests"
  ON late_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
  );

-- Comments
COMMENT ON TABLE late_requests IS 'Employee requests for late arrival approval';
COMMENT ON COLUMN late_requests.request_date IS 'The date employee was/will be late';
COMMENT ON COLUMN late_requests.reason IS 'Reason for being late';
COMMENT ON COLUMN late_requests.status IS 'pending, approved, rejected, cancelled';

