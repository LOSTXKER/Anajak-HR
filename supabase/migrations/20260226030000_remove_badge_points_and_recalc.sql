-- =============================================================
-- Migration: Remove stale badge_earned transactions & recalculate totals
-- =============================================================

-- 1. Delete all badge_earned point_transactions
DELETE FROM point_transactions WHERE action_type = 'badge_earned';

-- 2. Recalculate total_points from remaining transactions
UPDATE employee_points ep
SET total_points = COALESCE(sub.sum_pts, 0)
FROM (
  SELECT employee_id, SUM(points) AS sum_pts
  FROM point_transactions
  GROUP BY employee_id
) sub
WHERE ep.employee_id = sub.employee_id;

-- For employees with NO transactions left, set to 0
UPDATE employee_points
SET total_points = 0
WHERE employee_id NOT IN (SELECT DISTINCT employee_id FROM point_transactions);

-- 3. Recalculate quarterly_points (current quarter only: 2026-Q1 = Jan-Mar 2026)
UPDATE employee_points ep
SET quarterly_points = COALESCE(sub.q_pts, 0)
FROM (
  SELECT pt.employee_id, SUM(pt.points) AS q_pts
  FROM point_transactions pt
  WHERE pt.created_at >= '2026-01-01'::date
    AND pt.created_at < '2026-04-01'::date
  GROUP BY pt.employee_id
) sub
WHERE ep.employee_id = sub.employee_id;

-- For employees with no Q1 transactions, set quarterly to 0
UPDATE employee_points
SET quarterly_points = 0
WHERE employee_id NOT IN (
  SELECT DISTINCT employee_id FROM point_transactions
  WHERE created_at >= '2026-01-01'::date AND created_at < '2026-04-01'::date
);

-- 4. Recalculate level & level_name from total_points
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
  END;

-- 5. Recalculate rank_tier from quarterly_points
UPDATE employee_points SET
  rank_tier = CASE
    WHEN quarterly_points >= 700 THEN 'Diamond'
    WHEN quarterly_points >= 500 THEN 'Platinum'
    WHEN quarterly_points >= 300 THEN 'Gold'
    WHEN quarterly_points >= 150 THEN 'Silver'
    WHEN quarterly_points >= 50  THEN 'Bronze'
    ELSE 'Unranked'
  END;

-- 6. Update current_quarter label
UPDATE employee_points SET current_quarter = '2026-Q1';

SELECT 'Done: badge_earned transactions removed, all totals recalculated' AS message;
