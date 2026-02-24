-- =============================================
-- Gamification System Migration
-- =============================================

-- Badge Definitions (master list of available badges)
CREATE TABLE IF NOT EXISTS badge_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT '🏅',
    category VARCHAR(30) NOT NULL DEFAULT 'attendance',
    tier VARCHAR(20) NOT NULL DEFAULT 'bronze',
    condition_type VARCHAR(50) NOT NULL,
    condition_value INT NOT NULL DEFAULT 1,
    points_reward INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT badge_definitions_category_check CHECK (category IN ('attendance', 'punctuality', 'ot', 'streak', 'special')),
    CONSTRAINT badge_definitions_tier_check CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum'))
);

-- Employee Badges (earned badges per employee)
CREATE TABLE IF NOT EXISTS employee_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT now(),
    month_context VARCHAR(7),
    UNIQUE(employee_id, badge_id, month_context)
);

-- Point Transactions (audit trail of all point changes)
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    points INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    description TEXT,
    reference_id UUID,
    reference_type VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Employee Points (aggregated summary per employee)
CREATE TABLE IF NOT EXISTS employee_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    total_points INT NOT NULL DEFAULT 0,
    monthly_points INT NOT NULL DEFAULT 0,
    current_month VARCHAR(7) NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
    level INT NOT NULL DEFAULT 1,
    level_name VARCHAR(50) NOT NULL DEFAULT 'Rookie',
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_streak_date DATE,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_badges_employee ON employee_badges(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_badges_badge ON employee_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_employee_badges_earned ON employee_badges(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_employee ON point_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_action ON point_transactions(action_type);
CREATE INDEX IF NOT EXISTS idx_employee_points_total ON employee_points(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_employee_points_monthly ON employee_points(monthly_points DESC);
CREATE INDEX IF NOT EXISTS idx_employee_points_level ON employee_points(level DESC);

-- Enable RLS
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badge_definitions (read-only for all authenticated, write for service role)
CREATE POLICY "badge_definitions_read" ON badge_definitions
    FOR SELECT TO authenticated USING (true);

-- RLS Policies for employee_badges
CREATE POLICY "employee_badges_read" ON employee_badges
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "employee_badges_insert" ON employee_badges
    FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for point_transactions
CREATE POLICY "point_transactions_read_own" ON point_transactions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "point_transactions_insert" ON point_transactions
    FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for employee_points
CREATE POLICY "employee_points_read" ON employee_points
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "employee_points_insert" ON employee_points
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "employee_points_update" ON employee_points
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at on badge_definitions
CREATE TRIGGER update_badge_definitions_updated_at
    BEFORE UPDATE ON badge_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on employee_points
CREATE TRIGGER update_employee_points_updated_at
    BEFORE UPDATE ON employee_points
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Seed Badge Definitions
-- =============================================

INSERT INTO badge_definitions (code, name, description, icon, category, tier, condition_type, condition_value, points_reward) VALUES
    ('FIRST_CHECKIN', 'เช็กอินครั้งแรก', 'เช็กอินเข้างานครั้งแรกในระบบ', '🎉', 'special', 'bronze', 'first_checkin', 1, 10),
    ('PERFECT_WEEK', 'สัปดาห์สมบูรณ์', 'เช็กอินตรงเวลาครบ 5 วันติดต่อกัน', '⭐', 'punctuality', 'gold', 'on_time_streak', 5, 50),
    ('PERFECT_MONTH', 'เดือนสมบูรณ์', 'เช็กอินตรงเวลาครบทุกวันทำงานในเดือน', '🌟', 'punctuality', 'platinum', 'on_time_month', 1, 200),
    ('EARLY_BIRD_10', 'นกน้อยตื่นเช้า', 'เข้างานก่อนเวลา 10 ครั้ง', '🐤', 'punctuality', 'bronze', 'early_count', 10, 30),
    ('EARLY_BIRD_30', 'ราชานกน้อย', 'เข้างานก่อนเวลา 30 ครั้ง', '🦅', 'punctuality', 'silver', 'early_count', 30, 80),
    ('EARLY_BIRD_100', 'ตำนานตื่นเช้า', 'เข้างานก่อนเวลา 100 ครั้ง', '🌅', 'punctuality', 'gold', 'early_count', 100, 200),
    ('OT_WARRIOR_10', 'นักรบ OT', 'ทำ OT สำเร็จ 10 ครั้ง', '⚔️', 'ot', 'bronze', 'ot_count', 10, 50),
    ('OT_WARRIOR_50', 'จอมทัพ OT', 'ทำ OT สำเร็จ 50 ครั้ง', '🛡️', 'ot', 'gold', 'ot_count', 50, 200),
    ('IRONMAN_7', 'มาทุกวัน 7 วัน', 'มาทำงานติดต่อกัน 7 วัน', '💪', 'streak', 'bronze', 'streak_days', 7, 40),
    ('IRONMAN_30', 'มาทุกวัน 30 วัน', 'มาทำงานติดต่อกัน 30 วัน', '🔥', 'streak', 'silver', 'streak_days', 30, 150),
    ('IRONMAN_90', 'มาทุกวัน 90 วัน', 'มาทำงานติดต่อกัน 90 วัน', '🏆', 'streak', 'gold', 'streak_days', 90, 500),
    ('NO_LEAVE_MONTH', 'ไม่ลาทั้งเดือน', 'ไม่ลางานเลยตลอดทั้งเดือน', '💎', 'attendance', 'silver', 'no_leave_month', 1, 100),
    ('ATTENDANCE_100', 'มาครบ 100 วัน', 'เข้างานครบ 100 วัน', '📊', 'attendance', 'silver', 'attendance_count', 100, 100),
    ('ATTENDANCE_365', 'ครบ 1 ปี', 'เข้างานครบ 365 วัน', '🎊', 'attendance', 'gold', 'attendance_count', 365, 500)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Seed Gamification Settings
-- =============================================

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('gamify_enabled', 'true', 'เปิด/ปิดระบบ Gamification'),
    ('gamify_points_on_time', '10', 'แต้มสำหรับเช็กอินตรงเวลา'),
    ('gamify_points_early', '5', 'แต้มโบนัสสำหรับเข้าก่อนเวลา (>15 นาที)'),
    ('gamify_points_full_day', '5', 'แต้มสำหรับเข้า-ออกครบวัน'),
    ('gamify_points_ot', '15', 'แต้มสำหรับทำ OT สำเร็จ'),
    ('gamify_points_no_leave_week', '20', 'แต้มสำหรับไม่ลาตลอดสัปดาห์'),
    ('gamify_points_streak_bonus', '25', 'แต้มโบนัส Streak ทุก 5 วัน'),
    ('gamify_points_late_penalty', '-5', 'หักแต้มเมื่อมาสาย'),
    ('gamify_early_minutes', '15', 'จำนวนนาทีที่ต้องมาก่อน ถึงจะนับว่า Early Bird')
ON CONFLICT (setting_key) DO NOTHING;
