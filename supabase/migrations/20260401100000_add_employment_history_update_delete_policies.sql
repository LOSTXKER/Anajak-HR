-- Add missing UPDATE and DELETE RLS policies for employment_history table
-- Without these, edit and delete operations fail silently (0 rows affected)

CREATE POLICY employment_history_update ON employment_history
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY employment_history_delete ON employment_history
  FOR DELETE USING (true);
