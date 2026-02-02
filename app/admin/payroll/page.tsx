"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { FileText } from "lucide-react";
import { usePayroll } from "@/lib/hooks/use-payroll";
import {
  PayrollFilters,
  PayrollSummaryCards,
  PayrollTable,
  OTDetailModal,
} from "@/components/admin/payroll";

function PayrollContent() {
  const {
    // Data
    payrollData,
    employees,
    branches,
    summary,
    settings,
    loading,

    // Filters
    currentMonth,
    selectedEmployee,
    selectedBranch,
    searchTerm,

    // OT Modal
    showOTModal,
    selectedOTEmployee,
    otDetails,
    loadingOT,

    // Actions
    setCurrentMonth,
    setSelectedEmployee,
    setSelectedBranch,
    setSearchTerm,
    setShowOTModal,
    fetchOTDetails,
    exportToCSV,
  } = usePayroll();

  return (
    <AdminLayout title="ระบบเงินเดือน (Payroll)">
      {/* Filters */}
      <PayrollFilters
        currentMonth={currentMonth}
        searchTerm={searchTerm}
        selectedEmployee={selectedEmployee}
        selectedBranch={selectedBranch}
        employees={employees}
        branches={branches}
        hasData={payrollData.length > 0}
        onMonthChange={setCurrentMonth}
        onSearchChange={setSearchTerm}
        onEmployeeChange={setSelectedEmployee}
        onBranchChange={setSelectedBranch}
        onExport={exportToCSV}
      />

      {/* Summary Cards */}
      <PayrollSummaryCards summary={summary} />

      {/* Payroll Table */}
      <PayrollTable
        data={payrollData}
        summary={summary}
        currentMonth={currentMonth}
        settings={settings}
        loading={loading}
        onOTClick={fetchOTDetails}
      />

      {/* Info */}
      <div className="mt-6 p-4 bg-[#f5f5f7] rounded-xl">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-[#86868b] mt-0.5" />
          <div className="text-[13px] text-[#86868b]">
            <p className="font-medium text-[#1d1d1f] mb-1">สูตรคำนวณ:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>เงินเดือน = เงินเดือนตั้ง (เต็มจำนวนทุกเดือน)</li>
              <li>
                หักสาย = นาทีสาย × {settings.late_deduction_per_minute}{" "}
                บาท/นาที
              </li>
              <li>รวม = เงินเดือน + คอมมิชชั่น + OT - หักสาย</li>
            </ul>
          </div>
        </div>
      </div>

      {/* OT Modal */}
      {showOTModal && (
        <OTDetailModal
          employee={selectedOTEmployee}
          currentMonth={currentMonth}
          details={otDetails}
          loading={loadingOT}
          onClose={() => setShowOTModal(false)}
        />
      )}
    </AdminLayout>
  );
}

export default function PayrollPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <PayrollContent />
    </ProtectedRoute>
  );
}
