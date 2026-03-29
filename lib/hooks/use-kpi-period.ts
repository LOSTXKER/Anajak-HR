"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { KPIPeriod } from "@/lib/services/kpi.service";

type PeriodStatusFilter = "active" | "goal_setting" | "closed" | "in_progress" | "evaluating" | "draft";

interface UseKpiPeriodOptions {
  /**
   * "active" = any status except "draft".
   * Otherwise matches the exact status string.
   * Defaults to "active".
   */
  status?: PeriodStatusFilter;
  skip?: boolean;
}

interface UseKpiPeriodReturn {
  period: KPIPeriod | null;
  loading: boolean;
}

/**
 * Fetches the most-recent KPI period matching the given status filter.
 * Replaces the repeated `kpi_periods` query across KPI pages.
 */
export function useKpiPeriod(options: UseKpiPeriodOptions = {}): UseKpiPeriodReturn {
  const { status = "active", skip = false } = options;
  const [period, setPeriod] = useState<KPIPeriod | null>(null);
  const [loading, setLoading] = useState(!skip);

  useEffect(() => {
    if (skip) return;
    let cancelled = false;

    const fetchPeriod = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("kpi_periods")
          .select("*")
          .order("start_date", { ascending: false })
          .limit(1);

        if (status === "active") {
          query = query.neq("status", "draft");
        } else {
          query = query.eq("status", status);
        }

        const { data } = await query;
        if (!cancelled) {
          setPeriod((data?.[0] as KPIPeriod) || null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPeriod();
    return () => {
      cancelled = true;
    };
  }, [skip, status]);

  return { period, loading };
}
