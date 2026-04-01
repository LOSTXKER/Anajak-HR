"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useSalaryManagement } from "@/lib/hooks/use-salary-management";
import { SalaryTable } from "@/components/admin/salary/SalaryTable";
import { SalaryHistoryModal } from "@/components/admin/salary/SalaryHistoryModal";
import { DollarSign, Users, TrendingUp, Wallet } from "lucide-react";

function formatCurrency(val: number): string {
  return `฿${val.toLocaleString("th-TH", { minimumFractionDigits: 0 })}`;
}

function SalaryContent() {
  const {
    employees,
    branches,
    loading,
    summary,
    searchTerm,
    setSearchTerm,
    selectedBranch,
    setSelectedBranch,
    selectedEmployee,
    history,
    historyLoading,
    saving,
    openHistory,
    closeHistory,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useSalaryManagement();

  const summaryCards = [
    {
      label: "พนักงานทั้งหมด",
      value: summary.totalEmployees.toString(),
      icon: Users,
      color: "text-[#0071e3]",
      bg: "bg-[#0071e3]/10",
    },
    {
      label: "เงินเดือนรวม",
      value: formatCurrency(summary.totalSalary),
      icon: DollarSign,
      color: "text-[#34c759]",
      bg: "bg-[#34c759]/10",
    },
    {
      label: "คอมมิชชั่นรวม",
      value: formatCurrency(summary.totalCommission),
      icon: TrendingUp,
      color: "text-[#ff9500]",
      bg: "bg-[#ff9500]/10",
    },
    {
      label: "ค่าใช้จ่ายรวม",
      value: formatCurrency(summary.totalCost),
      icon: Wallet,
      color: "text-[#af52de]",
      bg: "bg-[#af52de]/10",
    },
  ];

  return (
    <AdminLayout
      title="จัดการเงินเดือน"
      description="จัดการเงินเดือน คอมมิชชั่น และประวัติการปรับเงินเดือนของพนักงาน"
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map((card, i) => (
            <Card key={i} elevated className="!p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}
                >
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className={`text-[16px] font-bold ${card.color}`}>
                    {card.value}
                  </p>
                  <p className="text-[11px] text-[#86868b]">{card.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card elevated>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="ค้นหาชื่อหรืออีเมล..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                value={selectedBranch}
                onChange={setSelectedBranch}
                options={[
                  { value: "all", label: "ทุกสาขา" },
                  { value: "none", label: "ไม่ระบุสาขา" },
                  ...branches.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card elevated padding="none">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <SalaryTable employees={employees} onViewHistory={openHistory} />
          )}
        </Card>

        {/* History Modal */}
        {selectedEmployee && (
          <SalaryHistoryModal
            employee={selectedEmployee}
            history={history}
            loading={historyLoading}
            saving={saving}
            onClose={closeHistory}
            onAdd={addEntry}
            onUpdate={updateEntry}
            onDelete={deleteEntry}
          />
        )}
      </div>
    </AdminLayout>
  );
}

export default function SalaryPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <SalaryContent />
    </ProtectedRoute>
  );
}
