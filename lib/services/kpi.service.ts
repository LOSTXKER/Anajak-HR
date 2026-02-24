/**
 * KPI Service
 * =============================================
 * Core engine for KPI periods, goals, evaluations, and scoring
 */

import { supabase } from "@/lib/supabase/client";
import { format, eachDayOfInterval, getDay, parseISO, differenceInDays } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KPIPeriod {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  goal_deadline: string | null;
  self_eval_start: string | null;
  self_eval_end: string | null;
  supervisor_eval_end: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  kpi_period_templates?: PeriodTemplate[];
}

export interface KPITemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  evaluation_type: string;
  default_weight: number;
  score_min: number;
  score_max: number;
  is_active: boolean;
  sort_order: number;
}

export interface PeriodTemplate {
  id: string;
  period_id: string;
  template_id: string;
  weight: number;
  is_active: boolean;
  kpi_templates?: KPITemplate;
}

export interface KPIGoal {
  id: string;
  employee_id: string;
  period_id: string;
  title: string;
  description: string | null;
  target_value: string | null;
  target_unit: string | null;
  weight: number;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  kpi_goal_progress?: GoalProgress[];
  employees_kpi_goals_employee_idToemployees?: { name: string };
}

export interface GoalProgress {
  id: string;
  goal_id: string;
  progress_value: string | null;
  progress_percent: number;
  note: string | null;
  attachment_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface KPIEvaluation {
  id: string;
  employee_id: string;
  period_id: string;
  evaluator_id: string;
  evaluation_type: string;
  status: string;
  overall_score: number | null;
  overall_grade: string | null;
  overall_comment: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  kpi_evaluation_items?: EvaluationItem[];
}

export interface EvaluationItem {
  id: string;
  evaluation_id: string;
  template_id: string | null;
  goal_id: string | null;
  category: string;
  score: number | null;
  weight: number;
  comment: string | null;
}

export interface AutoMetrics {
  id: string;
  employee_id: string;
  period_id: string;
  total_working_days: number;
  days_present: number;
  days_late: number;
  days_absent: number;
  attendance_rate: number | null;
  punctuality_rate: number | null;
  total_leave_days: number | null;
  total_ot_hours: number | null;
  calculated_score: number | null;
  calculated_at: string | null;
}

export interface CreatePeriodInput {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  goal_deadline?: string;
  self_eval_start?: string;
  self_eval_end?: string;
  supervisor_eval_end?: string;
  created_by?: string;
  templates?: { template_id: string; weight: number }[];
}

export interface CreateGoalInput {
  employee_id: string;
  period_id: string;
  title: string;
  description?: string;
  target_value?: string;
  target_unit?: string;
  weight: number;
}

export interface EvaluationItemInput {
  template_id?: string;
  goal_id?: string;
  category: string;
  score: number;
  weight: number;
  comment?: string;
}

export interface SubmitEvaluationInput {
  employee_id: string;
  period_id: string;
  evaluator_id: string;
  evaluation_type: "self" | "supervisor";
  overall_comment?: string;
  items: EvaluationItemInput[];
}

// ─── Grade Mapping ───────────────────────────────────────────────────────────

const GRADE_MAP = [
  { min: 4.5, grade: "S", label: "Outstanding" },
  { min: 4.0, grade: "A", label: "Excellent" },
  { min: 3.5, grade: "B+", label: "Very Good" },
  { min: 3.0, grade: "B", label: "Good" },
  { min: 2.5, grade: "C+", label: "Fair" },
  { min: 2.0, grade: "C", label: "Needs Improvement" },
  { min: 0, grade: "D", label: "Poor" },
];

export function scoreToGrade(score: number): { grade: string; label: string } {
  for (const g of GRADE_MAP) {
    if (score >= g.min) return { grade: g.grade, label: g.label };
  }
  return { grade: "D", label: "Poor" };
}

export function rateToScore(rate: number, thresholds = [98, 95, 90, 85]): number {
  if (rate >= thresholds[0]) return 5;
  if (rate >= thresholds[1]) return 4;
  if (rate >= thresholds[2]) return 3;
  if (rate >= thresholds[3]) return 2;
  return 1;
}

// ─── Periods ─────────────────────────────────────────────────────────────────

export async function getKPIPeriods(): Promise<KPIPeriod[]> {
  const { data, error } = await supabase
    .from("kpi_periods")
    .select("*, kpi_period_templates(*, kpi_templates(*))")
    .order("start_date", { ascending: false });

  if (error) throw error;
  return (data || []) as KPIPeriod[];
}

export async function getKPIPeriod(id: string): Promise<KPIPeriod | null> {
  const { data, error } = await supabase
    .from("kpi_periods")
    .select("*, kpi_period_templates(*, kpi_templates(*))")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as KPIPeriod | null;
}

export async function getActivePeriod(): Promise<KPIPeriod | null> {
  const { data, error } = await supabase
    .from("kpi_periods")
    .select("*, kpi_period_templates(*, kpi_templates(*))")
    .neq("status", "closed")
    .neq("status", "draft")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as KPIPeriod | null;
}

export async function createKPIPeriod(input: CreatePeriodInput): Promise<KPIPeriod> {
  const { templates, ...periodData } = input;

  const { data: period, error } = await supabase
    .from("kpi_periods")
    .insert(periodData)
    .select()
    .single();

  if (error) throw error;

  if (templates && templates.length > 0) {
    const templateRows = templates.map((t) => ({
      period_id: period.id,
      template_id: t.template_id,
      weight: t.weight,
    }));

    const { error: tmplError } = await supabase
      .from("kpi_period_templates")
      .insert(templateRows);

    if (tmplError) throw tmplError;
  }

  return period as KPIPeriod;
}

export async function updateKPIPeriod(
  id: string,
  updates: Partial<KPIPeriod>
): Promise<KPIPeriod> {
  const { data, error } = await supabase
    .from("kpi_periods")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as KPIPeriod;
}

export async function updatePeriodStatus(id: string, status: string): Promise<KPIPeriod> {
  return updateKPIPeriod(id, { status } as Partial<KPIPeriod>);
}

export async function updatePeriodTemplates(
  periodId: string,
  templates: { template_id: string; weight: number }[]
): Promise<void> {
  await supabase
    .from("kpi_period_templates")
    .delete()
    .eq("period_id", periodId);

  if (templates.length > 0) {
    const rows = templates.map((t) => ({
      period_id: periodId,
      template_id: t.template_id,
      weight: t.weight,
    }));

    const { error } = await supabase.from("kpi_period_templates").insert(rows);
    if (error) throw error;
  }
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function getKPITemplates(activeOnly = false): Promise<KPITemplate[]> {
  let query = supabase
    .from("kpi_templates")
    .select("*")
    .order("sort_order", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as KPITemplate[];
}

export async function createKPITemplate(
  input: Omit<KPITemplate, "id">
): Promise<KPITemplate> {
  const { data, error } = await supabase
    .from("kpi_templates")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as KPITemplate;
}

export async function updateKPITemplate(
  id: string,
  updates: Partial<KPITemplate>
): Promise<KPITemplate> {
  const { data, error } = await supabase
    .from("kpi_templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as KPITemplate;
}

export async function deleteKPITemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from("kpi_templates")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export async function getEmployeeGoals(
  employeeId: string,
  periodId: string
): Promise<KPIGoal[]> {
  const { data, error } = await supabase
    .from("kpi_goals")
    .select("*, kpi_goal_progress(*))")
    .eq("employee_id", employeeId)
    .eq("period_id", periodId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as KPIGoal[];
}

export async function getGoal(id: string): Promise<KPIGoal | null> {
  const { data, error } = await supabase
    .from("kpi_goals")
    .select("*, kpi_goal_progress(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as KPIGoal | null;
}

export async function getPendingGoals(periodId?: string): Promise<KPIGoal[]> {
  let query = supabase
    .from("kpi_goals")
    .select("*, employees_kpi_goals_employee_idToemployees:employees!kpi_goals_employee_idToemployees(name)")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true });

  if (periodId) {
    query = query.eq("period_id", periodId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as KPIGoal[];
}

export async function createGoal(input: CreateGoalInput): Promise<KPIGoal> {
  const { data, error } = await supabase
    .from("kpi_goals")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as KPIGoal;
}

export async function updateGoal(
  id: string,
  updates: Partial<KPIGoal>
): Promise<KPIGoal> {
  const { data, error } = await supabase
    .from("kpi_goals")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as KPIGoal;
}

export async function approveGoal(
  goalId: string,
  approvedBy: string
): Promise<KPIGoal> {
  return updateGoal(goalId, {
    status: "approved",
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
  } as Partial<KPIGoal>);
}

export async function rejectGoal(
  goalId: string,
  reason: string
): Promise<KPIGoal> {
  return updateGoal(goalId, {
    status: "rejected",
    rejection_reason: reason,
  } as Partial<KPIGoal>);
}

export async function addGoalProgress(
  goalId: string,
  progressValue: string,
  progressPercent: number,
  note: string,
  createdBy: string,
  attachmentUrl?: string
): Promise<GoalProgress> {
  const { data, error } = await supabase
    .from("kpi_goal_progress")
    .insert({
      goal_id: goalId,
      progress_value: progressValue,
      progress_percent: progressPercent,
      note,
      created_by: createdBy,
      attachment_url: attachmentUrl || null,
    })
    .select()
    .single();

  if (error) throw error;

  const newStatus = progressPercent >= 100 ? "completed" : "in_progress";
  await supabase
    .from("kpi_goals")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", goalId);

  return data as GoalProgress;
}

// ─── Auto Metrics ────────────────────────────────────────────────────────────

async function getWorkingDays(): Promise<number[]> {
  const { data } = await supabase
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", "working_days")
    .maybeSingle();

  if (data?.setting_value) {
    return data.setting_value.split(",").map(Number);
  }
  return [1, 2, 3, 4, 5];
}

async function getHolidayDates(startDate: string, endDate: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("holidays")
    .select("date")
    .gte("date", startDate)
    .lte("date", endDate)
    .eq("is_active", true);

  const set = new Set<string>();
  (data || []).forEach((h: { date: string }) => {
    set.add(format(parseISO(h.date), "yyyy-MM-dd"));
  });
  return set;
}

export async function calculateAutoMetrics(
  employeeId: string,
  periodId: string
): Promise<AutoMetrics> {
  const period = await getKPIPeriod(periodId);
  if (!period) throw new Error("Period not found");

  const startDate = period.start_date;
  const endDate = period.end_date;

  const workingDayNumbers = await getWorkingDays();
  const holidays = await getHolidayDates(startDate, endDate);

  const allDays = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  });

  const workingDays = allDays.filter((d) => {
    const dayOfWeek = getDay(d);
    const dateStr = format(d, "yyyy-MM-dd");
    return workingDayNumbers.includes(dayOfWeek) && !holidays.has(dateStr);
  });

  const totalWorkingDays = workingDays.length;

  const { data: attendanceLogs } = await supabase
    .from("attendance_logs")
    .select("work_date, is_late, status")
    .eq("employee_id", employeeId)
    .gte("work_date", startDate)
    .lte("work_date", endDate);

  const logs = (attendanceLogs || []) as {
    work_date: string;
    is_late: boolean;
    status: string;
  }[];

  const daysPresent = logs.filter((l) => l.status === "present" || l.status === "wfh").length;
  const daysLate = logs.filter((l) => l.is_late).length;
  const daysAbsent = totalWorkingDays - daysPresent;

  const { data: leaveData } = await supabase
    .from("leave_requests")
    .select("start_date, end_date, is_half_day")
    .eq("employee_id", employeeId)
    .eq("status", "approved")
    .gte("start_date", startDate)
    .lte("end_date", endDate);

  let totalLeaveDays = 0;
  (leaveData || []).forEach((lr: { start_date: string; end_date: string; is_half_day: boolean }) => {
    if (lr.is_half_day) {
      totalLeaveDays += 0.5;
    } else {
      totalLeaveDays += differenceInDays(parseISO(lr.end_date), parseISO(lr.start_date)) + 1;
    }
  });

  const { data: otData } = await supabase
    .from("ot_requests")
    .select("actual_ot_hours")
    .eq("employee_id", employeeId)
    .eq("status", "completed")
    .gte("request_date", startDate)
    .lte("request_date", endDate);

  let totalOTHours = 0;
  (otData || []).forEach((ot: { actual_ot_hours: number | null }) => {
    totalOTHours += Number(ot.actual_ot_hours || 0);
  });

  const attendanceRate = totalWorkingDays > 0
    ? (daysPresent / totalWorkingDays) * 100
    : 0;
  const punctualityRate = daysPresent > 0
    ? ((daysPresent - daysLate) / daysPresent) * 100
    : 0;

  const attendanceScore = rateToScore(attendanceRate);
  const punctualityScore = rateToScore(punctualityRate, [98, 95, 90, 80]);
  const calculatedScore = (attendanceScore + punctualityScore) / 2;

  const metricsData = {
    employee_id: employeeId,
    period_id: periodId,
    total_working_days: totalWorkingDays,
    days_present: daysPresent,
    days_late: daysLate,
    days_absent: daysAbsent,
    attendance_rate: Math.round(attendanceRate * 100) / 100,
    punctuality_rate: Math.round(punctualityRate * 100) / 100,
    total_leave_days: totalLeaveDays,
    total_ot_hours: Math.round(totalOTHours * 100) / 100,
    calculated_score: Math.round(calculatedScore * 100) / 100,
    calculated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("kpi_auto_metrics")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("period_id", periodId)
    .maybeSingle();

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from("kpi_auto_metrics")
      .update(metricsData)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from("kpi_auto_metrics")
      .insert(metricsData)
      .select()
      .single();
    if (error) throw error;
    result = data;
  }

  return result as AutoMetrics;
}

export async function calculateAllAutoMetrics(periodId: string): Promise<number> {
  const { data: employees } = await supabase
    .from("employees")
    .select("id")
    .eq("account_status", "approved")
    .is("deleted_at", null)
    .eq("is_system_account", false);

  if (!employees) return 0;

  let count = 0;
  for (const emp of employees) {
    try {
      await calculateAutoMetrics(emp.id, periodId);
      count++;
    } catch (err) {
      console.error(`Error calculating metrics for ${emp.id}:`, err);
    }
  }
  return count;
}

export async function getAutoMetrics(
  employeeId: string,
  periodId: string
): Promise<AutoMetrics | null> {
  const { data, error } = await supabase
    .from("kpi_auto_metrics")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("period_id", periodId)
    .maybeSingle();

  if (error) throw error;
  return data as AutoMetrics | null;
}

// ─── Evaluations ─────────────────────────────────────────────────────────────

export async function getEvaluation(
  employeeId: string,
  periodId: string,
  evaluationType: string
): Promise<KPIEvaluation | null> {
  const { data, error } = await supabase
    .from("kpi_evaluations")
    .select("*, kpi_evaluation_items(*)")
    .eq("employee_id", employeeId)
    .eq("period_id", periodId)
    .eq("evaluation_type", evaluationType)
    .maybeSingle();

  if (error) throw error;
  return data as KPIEvaluation | null;
}

export async function getEvaluationById(id: string): Promise<KPIEvaluation | null> {
  const { data, error } = await supabase
    .from("kpi_evaluations")
    .select("*, kpi_evaluation_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as KPIEvaluation | null;
}

export async function submitEvaluation(
  input: SubmitEvaluationInput,
  isDraft = false
): Promise<KPIEvaluation> {
  const { items, ...evalData } = input;

  const { weightedScore, grade } = calculateWeightedScore(items);

  const existing = await getEvaluation(
    input.employee_id,
    input.period_id,
    input.evaluation_type
  );

  let evaluationId: string;

  if (existing) {
    const { data, error } = await supabase
      .from("kpi_evaluations")
      .update({
        overall_score: weightedScore,
        overall_grade: grade,
        overall_comment: input.overall_comment || null,
        status: isDraft ? "draft" : "submitted",
        submitted_at: isDraft ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    evaluationId = data.id;

    await supabase
      .from("kpi_evaluation_items")
      .delete()
      .eq("evaluation_id", evaluationId);
  } else {
    const { data, error } = await supabase
      .from("kpi_evaluations")
      .insert({
        ...evalData,
        overall_score: weightedScore,
        overall_grade: grade,
        status: isDraft ? "draft" : "submitted",
        submitted_at: isDraft ? null : new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    evaluationId = data.id;
  }

  if (items.length > 0) {
    const itemRows = items.map((item) => ({
      evaluation_id: evaluationId,
      template_id: item.template_id || null,
      goal_id: item.goal_id || null,
      category: item.category,
      score: item.score,
      weight: item.weight,
      comment: item.comment || null,
    }));

    const { error: itemError } = await supabase
      .from("kpi_evaluation_items")
      .insert(itemRows);

    if (itemError) throw itemError;
  }

  const result = await getEvaluationById(evaluationId);
  return result as KPIEvaluation;
}

export function calculateWeightedScore(
  items: EvaluationItemInput[]
): { weightedScore: number; grade: string } {
  if (items.length === 0) return { weightedScore: 0, grade: "D" };

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return { weightedScore: 0, grade: "D" };

  const weightedSum = items.reduce((sum, item) => {
    return sum + item.score * (item.weight / totalWeight);
  }, 0);

  const weightedScore = Math.round(weightedSum * 100) / 100;
  const { grade } = scoreToGrade(weightedScore);

  return { weightedScore, grade };
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface EmployeeKPISummary {
  employee_id: string;
  employee_name: string;
  branch_id: string | null;
  self_eval: KPIEvaluation | null;
  supervisor_eval: KPIEvaluation | null;
  auto_metrics: AutoMetrics | null;
  goals_count: number;
  goals_completed: number;
  final_score: number | null;
  final_grade: string | null;
}

export async function getTeamKPISummary(
  periodId: string,
  branchId?: string
): Promise<EmployeeKPISummary[]> {
  let empQuery = supabase
    .from("employees")
    .select("id, name, branch_id")
    .eq("account_status", "approved")
    .is("deleted_at", null)
    .eq("is_system_account", false);

  if (branchId) {
    empQuery = empQuery.eq("branch_id", branchId);
  }

  const { data: employees } = await empQuery;
  if (!employees || employees.length === 0) return [];

  const empIds = employees.map((e: { id: string }) => e.id);

  const [
    { data: evaluations },
    { data: metrics },
    { data: goals },
  ] = await Promise.all([
    supabase
      .from("kpi_evaluations")
      .select("*")
      .eq("period_id", periodId)
      .in("employee_id", empIds),
    supabase
      .from("kpi_auto_metrics")
      .select("*")
      .eq("period_id", periodId)
      .in("employee_id", empIds),
    supabase
      .from("kpi_goals")
      .select("employee_id, status")
      .eq("period_id", periodId)
      .in("employee_id", empIds),
  ]);

  return employees.map((emp: { id: string; name: string; branch_id: string | null }) => {
    const selfEval = (evaluations || []).find(
      (e: KPIEvaluation) => e.employee_id === emp.id && e.evaluation_type === "self"
    ) as KPIEvaluation | undefined;
    const supEval = (evaluations || []).find(
      (e: KPIEvaluation) => e.employee_id === emp.id && e.evaluation_type === "supervisor"
    ) as KPIEvaluation | undefined;
    const empMetrics = (metrics || []).find(
      (m: AutoMetrics) => m.employee_id === emp.id
    ) as AutoMetrics | undefined;
    const empGoals = (goals || []).filter(
      (g: { employee_id: string; status: string }) => g.employee_id === emp.id
    );

    return {
      employee_id: emp.id,
      employee_name: emp.name,
      branch_id: emp.branch_id,
      self_eval: selfEval || null,
      supervisor_eval: supEval || null,
      auto_metrics: empMetrics || null,
      goals_count: empGoals.length,
      goals_completed: empGoals.filter(
        (g: { status: string }) => g.status === "completed"
      ).length,
      final_score: supEval?.overall_score ?? selfEval?.overall_score ?? null,
      final_grade: supEval?.overall_grade ?? selfEval?.overall_grade ?? null,
    };
  });
}

export async function getKPIReportSummary(periodId: string) {
  const summaries = await getTeamKPISummary(periodId);

  const gradeDistribution: Record<string, number> = {};
  let totalScore = 0;
  let scoredCount = 0;

  const categoryScores: Record<string, { total: number; count: number }> = {};

  for (const s of summaries) {
    if (s.final_grade) {
      gradeDistribution[s.final_grade] = (gradeDistribution[s.final_grade] || 0) + 1;
    }
    if (s.final_score !== null) {
      totalScore += s.final_score;
      scoredCount++;
    }
  }

  const { data: evalItems } = await supabase
    .from("kpi_evaluation_items")
    .select("category, score, evaluation_id, kpi_evaluations!inner(period_id, evaluation_type)")
    .eq("kpi_evaluations.period_id", periodId)
    .eq("kpi_evaluations.evaluation_type", "supervisor");

  (evalItems || []).forEach((item: { category: string; score: number | null }) => {
    if (item.score !== null) {
      if (!categoryScores[item.category]) {
        categoryScores[item.category] = { total: 0, count: 0 };
      }
      categoryScores[item.category].total += Number(item.score);
      categoryScores[item.category].count++;
    }
  });

  const avgByCategory: Record<string, number> = {};
  for (const [cat, val] of Object.entries(categoryScores)) {
    avgByCategory[cat] = val.count > 0
      ? Math.round((val.total / val.count) * 100) / 100
      : 0;
  }

  return {
    totalEmployees: summaries.length,
    evaluatedCount: scoredCount,
    averageScore: scoredCount > 0 ? Math.round((totalScore / scoredCount) * 100) / 100 : 0,
    gradeDistribution,
    avgByCategory,
    topPerformers: summaries
      .filter((s) => s.final_score !== null)
      .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
      .slice(0, 5),
    bottomPerformers: summaries
      .filter((s) => s.final_score !== null)
      .sort((a, b) => (a.final_score || 0) - (b.final_score || 0))
      .slice(0, 5),
  };
}

export async function getEmployeeKPIHistory(employeeId: string): Promise<{
  period: KPIPeriod;
  evaluation: KPIEvaluation | null;
  metrics: AutoMetrics | null;
}[]> {
  const { data: evaluations } = await supabase
    .from("kpi_evaluations")
    .select("*, kpi_periods(*)")
    .eq("employee_id", employeeId)
    .eq("evaluation_type", "supervisor")
    .eq("status", "submitted")
    .order("created_at", { ascending: false });

  const { data: metrics } = await supabase
    .from("kpi_auto_metrics")
    .select("*")
    .eq("employee_id", employeeId);

  const periods = await getKPIPeriods();
  const closedPeriods = periods.filter((p) => p.status === "closed");

  return closedPeriods.map((period) => {
    const eval_ = (evaluations || []).find(
      (e: KPIEvaluation) => e.period_id === period.id
    ) as KPIEvaluation | undefined;
    const met = (metrics || []).find(
      (m: AutoMetrics) => m.period_id === period.id
    ) as AutoMetrics | undefined;

    return {
      period,
      evaluation: eval_ || null,
      metrics: met || null,
    };
  });
}
