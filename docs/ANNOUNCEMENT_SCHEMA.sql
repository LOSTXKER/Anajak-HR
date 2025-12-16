-- Announcements Table
-- สำหรับระบบประกาศจากแอดมิน

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'hr', 'payroll', 'holiday', 'urgent')),
  
  -- Target audience
  target_type VARCHAR(20) DEFAULT 'all' CHECK (target_type IN ('all', 'branch', 'department', 'employee')),
  target_branch_id UUID REFERENCES branches(id),
  target_employee_ids TEXT[], -- Array of employee IDs for specific targeting
  
  -- Publish settings
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Send notification
  send_notification BOOLEAN DEFAULT true,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_by UUID REFERENCES employees(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Announcement Read Status Table
-- ติดตามว่าพนักงานคนไหนอ่านประกาศแล้วบ้าง

CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(announcement_id, employee_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON announcements(expires_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_target_branch ON announcements(target_branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_announcement_reads_employee ON announcement_reads(employee_id, read_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id);

-- RLS Policies

-- Employees can view published announcements targeted to them
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view published announcements"
  ON announcements FOR SELECT
  USING (
    published = true 
    AND deleted_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND published_at <= now()
    AND (
      target_type = 'all'
      OR (target_type = 'branch' AND target_branch_id IN (
        SELECT branch_id FROM employees WHERE id = auth.uid()
      ))
      OR (target_type = 'employee' AND auth.uid()::text = ANY(target_employee_ids))
    )
  );

-- Admins/Supervisors can view all announcements
CREATE POLICY "Admins can view all announcements"
  ON announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
  );

-- Admins/Supervisors can create announcements
CREATE POLICY "Admins can create announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
  );

-- Admins/Supervisors can update announcements
CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
  );

-- Admins/Supervisors can soft delete announcements
CREATE POLICY "Admins can delete announcements"
  ON announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
  );

-- Announcement Reads RLS
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view their own reads"
  ON announcement_reads FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can mark announcements as read"
  ON announcement_reads FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Admins can view all reads"
  ON announcement_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'supervisor')
    )
  );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_announcement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcement_updated_at();

-- Function to get unread announcement count for an employee
CREATE OR REPLACE FUNCTION get_unread_announcement_count(employee_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM announcements a
    WHERE a.published = true
      AND a.deleted_at IS NULL
      AND (a.expires_at IS NULL OR a.expires_at > now())
      AND a.published_at <= now()
      AND (
        a.target_type = 'all'
        OR (a.target_type = 'branch' AND a.target_branch_id IN (
          SELECT branch_id FROM employees WHERE id = employee_uuid
        ))
        OR (a.target_type = 'employee' AND employee_uuid::text = ANY(a.target_employee_ids))
      )
      AND NOT EXISTS (
        SELECT 1 FROM announcement_reads ar
        WHERE ar.announcement_id = a.id
          AND ar.employee_id = employee_uuid
      )
  );
END;
$$ LANGUAGE plpgsql;

