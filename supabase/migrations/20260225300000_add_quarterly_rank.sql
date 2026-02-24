-- Add quarterly rank system to employee_points
-- Replaces monthly_points/current_month with quarterly_points/current_quarter/rank_tier

-- 1. Add new columns
ALTER TABLE employee_points ADD COLUMN IF NOT EXISTS quarterly_points INT DEFAULT 0;
ALTER TABLE employee_points ADD COLUMN IF NOT EXISTS current_quarter VARCHAR(7) DEFAULT '';
ALTER TABLE employee_points ADD COLUMN IF NOT EXISTS rank_tier VARCHAR(20) DEFAULT 'Unranked';

-- 2. Migrate monthly data to quarterly (preserve current points as quarterly start)
UPDATE employee_points SET
  quarterly_points = COALESCE(monthly_points, 0),
  current_quarter = CONCAT(EXTRACT(YEAR FROM now())::text, '-Q', CEIL(EXTRACT(MONTH FROM now()) / 3.0)::int::text);

-- 3. Calculate initial rank tiers
UPDATE employee_points SET
  rank_tier = CASE
    WHEN quarterly_points >= 700 THEN 'Diamond'
    WHEN quarterly_points >= 500 THEN 'Platinum'
    WHEN quarterly_points >= 300 THEN 'Gold'
    WHEN quarterly_points >= 150 THEN 'Silver'
    WHEN quarterly_points >= 50  THEN 'Bronze'
    ELSE 'Unranked'
  END;

-- 4. Drop old monthly columns
ALTER TABLE employee_points DROP COLUMN IF EXISTS monthly_points;
ALTER TABLE employee_points DROP COLUMN IF EXISTS current_month;

-- 5. Drop old index, create new
DROP INDEX IF EXISTS idx_employee_points_monthly;
CREATE INDEX IF NOT EXISTS idx_employee_points_quarterly ON employee_points(quarterly_points DESC);
