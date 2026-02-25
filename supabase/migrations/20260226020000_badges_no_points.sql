-- =============================================================
-- Migration: Badges are purely honorary — no points reward
-- =============================================================

UPDATE badge_definitions SET points_reward = 0;

SELECT 'All badge points_reward set to 0' AS message;
