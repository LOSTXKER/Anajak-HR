import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();

  console.log("Replacing update_leave_balance() with SECURITY DEFINER...");

  await client.query(`
    CREATE OR REPLACE FUNCTION update_leave_balance()
    RETURNS TRIGGER
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      v_year INTEGER;
    BEGIN
      v_year := EXTRACT(YEAR FROM NEW.start_date)::INTEGER;

      IF (NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved')) 
         OR (NEW.status != 'approved' AND OLD IS NOT NULL AND OLD.status = 'approved') THEN
        
        INSERT INTO leave_balances (
          employee_id,
          year,
          annual_leave_quota,
          sick_leave_quota,
          personal_leave_quota
        )
        SELECT 
          NEW.employee_id,
          v_year,
          COALESCE(e.annual_leave_quota, 10),
          COALESCE(e.sick_leave_quota, 30),
          COALESCE(e.personal_leave_quota, 3)
        FROM employees e
        WHERE e.id = NEW.employee_id
        ON CONFLICT (employee_id, year) DO UPDATE SET
          annual_leave_quota = EXCLUDED.annual_leave_quota,
          sick_leave_quota = EXCLUDED.sick_leave_quota,
          personal_leave_quota = EXCLUDED.personal_leave_quota;
        
        UPDATE leave_balances
        SET
          annual_leave_used = (
            SELECT COALESCE(SUM(calculate_leave_days(start_date, end_date, is_half_day)), 0)
            FROM leave_requests
            WHERE employee_id = NEW.employee_id
              AND leave_type = 'annual'
              AND status = 'approved'
              AND EXTRACT(YEAR FROM start_date) = v_year
          ),
          sick_leave_used = (
            SELECT COALESCE(SUM(calculate_leave_days(start_date, end_date, is_half_day)), 0)
            FROM leave_requests
            WHERE employee_id = NEW.employee_id
              AND leave_type = 'sick'
              AND status = 'approved'
              AND EXTRACT(YEAR FROM start_date) = v_year
          ),
          personal_leave_used = (
            SELECT COALESCE(SUM(calculate_leave_days(start_date, end_date, is_half_day)), 0)
            FROM leave_requests
            WHERE employee_id = NEW.employee_id
              AND leave_type = 'personal'
              AND status = 'approved'
              AND EXTRACT(YEAR FROM start_date) = v_year
          ),
          updated_at = NOW()
        WHERE employee_id = NEW.employee_id
          AND year = v_year;
        
        UPDATE leave_balances
        SET
          annual_leave_remaining = annual_leave_quota - annual_leave_used,
          sick_leave_remaining = sick_leave_quota - sick_leave_used,
          personal_leave_remaining = personal_leave_quota - personal_leave_used
        WHERE employee_id = NEW.employee_id
          AND year = v_year;
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  console.log("Done! Trigger function now runs with SECURITY DEFINER.");

  await client.end();
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
