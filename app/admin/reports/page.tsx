"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";

import { useReportData } from "@/lib/hooks/use-report-data";
import {
  ReportFilters,
  SummaryCards,
  DailyTrendChart,
  BranchStatsChart,
  OTDistributionChart,
  TopOTList,
  TopLateList,
  EmployeeReportTable,
} from "@/components/admin/reports";

function ReportsContent() {
  // Filter state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");

  // Use report data hook
  const {
    loading,
    branches,
    filteredReports,
    summary,
    dailyStats,
    branchStats,
    otTypeStats,
    fetchAllData,
    exportToCSV,
  } = useReportData({
    currentMonth,
    searchTerm,
    selectedBranch,
    selectedRole,
  });

  return (
    <AdminLayout title="รายงานสรุป">
      {/* Filters */}
      <ReportFilters
        currentMonth={currentMonth}
        searchTerm={searchTerm}
        selectedBranch={selectedBranch}
        selectedRole={selectedRole}
        branches={branches}
        loading={loading}
        hasData={filteredReports.length > 0}
        onMonthChange={setCurrentMonth}
        onSearchChange={setSearchTerm}
        onBranchChange={setSelectedBranch}
        onRoleChange={setSelectedRole}
        onRefresh={fetchAllData}
        onExport={exportToCSV}
      />

      {/* Summary Stats */}
      <SummaryCards summary={summary} />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DailyTrendChart data={dailyStats} />
        <BranchStatsChart data={branchStats} />
      </div>

      {/* Charts Row 2 - OT Type Distribution */}
      {otTypeStats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <OTDistributionChart data={otTypeStats} />
          <TopOTList data={filteredReports} />
          <TopLateList data={filteredReports} />
        </div>
      )}

      {/* Data Table */}
      <EmployeeReportTable
        data={filteredReports}
        summary={summary}
        loading={loading}
      />
    </AdminLayout>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <ReportsContent />
    </ProtectedRoute>
  );
}
