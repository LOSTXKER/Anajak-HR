-- KPI System Migration
-- Adds tables for employee KPI evaluation: periods, templates, goals, evaluations, auto-metrics

-- 1. kpi_templates: criteria definitions
CREATE TABLE IF NOT EXISTS kpi_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(30) NOT NULL,
  evaluation_type VARCHAR(20) NOT NULL,
  default_weight DECIMAL(5,2) DEFAULT 0,
  score_min INT DEFAULT 1,
  score_max INT DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ(6) DEFAULT now(),
  updated_at TIMESTAMPTZ(6) DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_templates_category ON kpi_templates(category);
CREATE INDEX IF NOT EXISTS idx_kpi_templates_active ON kpi_templates(is_active);

-- 2. kpi_periods: evaluation periods
CREATE TABLE IF NOT EXISTS kpi_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goal_deadline DATE,
  self_eval_start DATE,
  self_eval_end DATE,
  supervisor_eval_end DATE,
  status VARCHAR(20) DEFAULT 'draft' NOT NULL,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ(6) DEFAULT now(),
  updated_at TIMESTAMPTZ(6) DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_periods_status ON kpi_periods(status);
CREATE INDEX IF NOT EXISTS idx_kpi_periods_dates ON kpi_periods(start_date, end_date);

-- 3. kpi_period_templates: templates assigned to periods with weights
CREATE TABLE IF NOT EXISTS kpi_period_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES kpi_periods(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES kpi_templates(id) ON DELETE CASCADE,
  weight DECIMAL(5,2) DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(period_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_kpi_period_templates_period ON kpi_period_templates(period_id);

-- 4. kpi_goals: individual employee goals
CREATE TABLE IF NOT EXISTS kpi_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES kpi_periods(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  target_value VARCHAR(100),
  target_unit VARCHAR(50),
  weight DECIMAL(5,2) DEFAULT 0 NOT NULL,
  status VARCHAR(20) DEFAULT 'pending_approval' NOT NULL,
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ(6),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ(6) DEFAULT now(),
  updated_at TIMESTAMPTZ(6) DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_goals_employee ON kpi_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_kpi_goals_period ON kpi_goals(period_id);
CREATE INDEX IF NOT EXISTS idx_kpi_goals_status ON kpi_goals(status);

-- 5. kpi_goal_progress: progress updates
CREATE TABLE IF NOT EXISTS kpi_goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES kpi_goals(id) ON DELETE CASCADE,
  progress_value VARCHAR(100),
  progress_percent DECIMAL(5,2) DEFAULT 0,
  note TEXT,
  attachment_url TEXT,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ(6) DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_goal_progress_goal ON kpi_goal_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_kpi_goal_progress_created ON kpi_goal_progress(created_at DESC);

-- 6. kpi_evaluations: evaluation records
CREATE TABLE IF NOT EXISTS kpi_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES kpi_periods(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES employees(id),
  evaluation_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' NOT NULL,
  overall_score DECIMAL(5,2),
  overall_grade VARCHAR(10),
  overall_comment TEXT,
  submitted_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) DEFAULT now(),
  updated_at TIMESTAMPTZ(6) DEFAULT now(),
  UNIQUE(employee_id, period_id, evaluation_type)
);

CREATE INDEX IF NOT EXISTS idx_kpi_evaluations_employee ON kpi_evaluations(employee_id);
CREATE INDEX IF NOT EXISTS idx_kpi_evaluations_period ON kpi_evaluations(period_id);
CREATE INDEX IF NOT EXISTS idx_kpi_evaluations_evaluator ON kpi_evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_kpi_evaluations_status ON kpi_evaluations(status);

-- 7. kpi_evaluation_items: individual scores per evaluation
CREATE TABLE IF NOT EXISTS kpi_evaluation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES kpi_evaluations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES kpi_templates(id) ON DELETE SET NULL,
  goal_id UUID REFERENCES kpi_goals(id) ON DELETE SET NULL,
  category VARCHAR(30) NOT NULL,
  score DECIMAL(5,2),
  weight DECIMAL(5,2) DEFAULT 0 NOT NULL,
  comment TEXT
);

CREATE INDEX IF NOT EXISTS idx_kpi_eval_items_evaluation ON kpi_evaluation_items(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_kpi_eval_items_template ON kpi_evaluation_items(template_id);

-- 8. kpi_auto_metrics: auto-calculated metrics snapshot
CREATE TABLE IF NOT EXISTS kpi_auto_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES kpi_periods(id) ON DELETE CASCADE,
  total_working_days INT DEFAULT 0,
  days_present INT DEFAULT 0,
  days_late INT DEFAULT 0,
  days_absent INT DEFAULT 0,
  attendance_rate DECIMAL(5,2),
  punctuality_rate DECIMAL(5,2),
  total_leave_days DECIMAL(5,2) DEFAULT 0,
  total_ot_hours DECIMAL(5,2) DEFAULT 0,
  calculated_score DECIMAL(5,2),
  calculated_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) DEFAULT now(),
  updated_at TIMESTAMPTZ(6) DEFAULT now(),
  UNIQUE(employee_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_kpi_auto_metrics_employee ON kpi_auto_metrics(employee_id);
CREATE INDEX IF NOT EXISTS idx_kpi_auto_metrics_period ON kpi_auto_metrics(period_id);

-- Enable RLS on all KPI tables
ALTER TABLE kpi_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_period_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_evaluation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_auto_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: allow service role full access (app uses service role key)
CREATE POLICY "service_role_all_kpi_templates" ON kpi_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_kpi_periods" ON kpi_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_kpi_period_templates" ON kpi_period_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_kpi_goals" ON kpi_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_kpi_goal_progress" ON kpi_goal_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_kpi_evaluations" ON kpi_evaluations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_kpi_evaluation_items" ON kpi_evaluation_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_kpi_auto_metrics" ON kpi_auto_metrics FOR ALL USING (true) WITH CHECK (true);

-- Seed default KPI templates
INSERT INTO kpi_templates (name, description, category, evaluation_type, default_weight, sort_order) VALUES
  ('อัตราการมาทำงาน', 'คำนวณจากจำนวนวันที่มาทำงานเทียบกับวันทำงานทั้งหมด', 'attendance', 'auto', 10, 1),
  ('อัตราการมาตรงเวลา', 'คำนวณจากจำนวนวันที่มาตรงเวลาเทียบกับวันที่มาทำงาน', 'attendance', 'auto', 10, 2),
  ('คุณภาพงาน', 'ประเมินคุณภาพของผลงานที่ส่งมอบ ความถูกต้อง ครบถ้วน', 'work_quality', 'manual', 15, 3),
  ('ความรับผิดชอบ', 'ความรับผิดชอบต่องานที่ได้รับมอบหมาย ส่งงานตรงเวลา', 'work_quality', 'manual', 15, 4),
  ('การทำงานเป็นทีม', 'ความสามารถในการทำงานร่วมกับผู้อื่น ช่วยเหลือเพื่อนร่วมงาน', 'competency', 'manual', 10, 5),
  ('ความคิดริเริ่ม', 'การเสนอไอเดียใหม่ๆ การพัฒนาตนเอง การแก้ปัญหาเชิงรุก', 'competency', 'manual', 10, 6),
  ('เป้าหมายรายบุคคล', 'ประเมินจากผลสำเร็จของเป้าหมายที่ตั้งไว้', 'goals', 'goal_based', 30, 7);
