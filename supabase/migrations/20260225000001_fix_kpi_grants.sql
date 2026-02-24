-- Grant access to KPI tables for all Supabase roles
GRANT ALL ON kpi_templates TO anon, authenticated, service_role;
GRANT ALL ON kpi_periods TO anon, authenticated, service_role;
GRANT ALL ON kpi_period_templates TO anon, authenticated, service_role;
GRANT ALL ON kpi_goals TO anon, authenticated, service_role;
GRANT ALL ON kpi_goal_progress TO anon, authenticated, service_role;
GRANT ALL ON kpi_evaluations TO anon, authenticated, service_role;
GRANT ALL ON kpi_evaluation_items TO anon, authenticated, service_role;
GRANT ALL ON kpi_auto_metrics TO anon, authenticated, service_role;

-- Grant usage on sequences if any
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
