-- Rebalance Gamification: reduce point inflation, increase late penalty, harder levels
-- Points per day drops from ~15-19 to ~7-9 for a perfect employee

-- 1. Update point values in system_settings
UPDATE system_settings SET setting_value = '5'   WHERE setting_key = 'gamify_points_on_time';
UPDATE system_settings SET setting_value = '2'   WHERE setting_key = 'gamify_points_early';
UPDATE system_settings SET setting_value = '2'   WHERE setting_key = 'gamify_points_full_day';
UPDATE system_settings SET setting_value = '10'  WHERE setting_key = 'gamify_points_ot';
UPDATE system_settings SET setting_value = '15'  WHERE setting_key = 'gamify_points_streak_bonus';
UPDATE system_settings SET setting_value = '10'  WHERE setting_key = 'gamify_points_no_leave_week';
UPDATE system_settings SET setting_value = '-10' WHERE setting_key = 'gamify_points_late_penalty';

-- 2. Recalculate levels for all employees based on new curve:
--    Lv.1 Rookie      0
--    Lv.2 Regular      200
--    Lv.3 Reliable     600
--    Lv.4 Star         1500
--    Lv.5 Super Star   3000
--    Lv.6 MVP          6000
--    Lv.7 Legend        10000
--    Lv.8 Immortal     15000

UPDATE employee_points SET
  level = CASE
    WHEN total_points >= 15000 THEN 8
    WHEN total_points >= 10000 THEN 7
    WHEN total_points >= 6000  THEN 6
    WHEN total_points >= 3000  THEN 5
    WHEN total_points >= 1500  THEN 4
    WHEN total_points >= 600   THEN 3
    WHEN total_points >= 200   THEN 2
    ELSE 1
  END,
  level_name = CASE
    WHEN total_points >= 15000 THEN 'Immortal'
    WHEN total_points >= 10000 THEN 'Legend'
    WHEN total_points >= 6000  THEN 'MVP'
    WHEN total_points >= 3000  THEN 'Super Star'
    WHEN total_points >= 1500  THEN 'Star'
    WHEN total_points >= 600   THEN 'Reliable'
    WHEN total_points >= 200   THEN 'Regular'
    ELSE 'Rookie'
  END,
  updated_at = now();
