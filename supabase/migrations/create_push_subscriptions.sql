-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_employee_id 
ON push_subscriptions(employee_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own push subscriptions"
ON push_subscriptions
FOR ALL
TO authenticated
USING (employee_id::text = auth.uid()::text);

CREATE POLICY "Admins can view all push subscriptions"
ON push_subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE id::text = auth.uid()::text AND role = 'admin'
  )
);

-- Add comment
COMMENT ON TABLE push_subscriptions IS 'Stores Web Push API subscriptions for employees';

