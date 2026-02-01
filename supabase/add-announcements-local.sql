-- Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'hr', 'payroll', 'holiday', 'urgent')),
  target_type VARCHAR(20) DEFAULT 'all' CHECK (target_type IN ('all', 'branch', 'department', 'employee')),
  target_branch_id UUID REFERENCES branches(id),
  target_employee_ids TEXT[],
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  send_notification BOOLEAN DEFAULT true,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(announcement_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_announcement_reads_employee ON announcement_reads(employee_id, read_at DESC);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_announcements" ON announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_announcement_reads" ON announcement_reads FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON announcements TO anon, authenticated;
GRANT ALL ON announcement_reads TO anon, authenticated;
