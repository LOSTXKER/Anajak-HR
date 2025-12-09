-- Add line_user_id column to employees table for LINE notifications
ALTER TABLE employees ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(255);

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_employees_line_user_id ON employees(line_user_id);

-- Comment
COMMENT ON COLUMN employees.line_user_id IS 'LINE User ID สำหรับส่งแจ้งเตือนส่วนตัว';

