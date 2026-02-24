"use client";

import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { User } from "lucide-react";
import Link from "next/link";

import { useEmployeeDetail } from "@/lib/hooks/use-employee-detail";
import {
  EmployeeHeader,
  QuickStats,
  TabNavigation,
  InfoTab,
  AttendanceTab,
  OTTab,
  LeaveTab,
  WFHTab,
  LateTab,
  GamificationTab,
  DeleteModal,
} from "@/components/admin/employee-detail";

function EmployeeProfileContent() {
  const params = useParams();
  const employeeId = params.id as string;

  const {
    // Data
    employee,
    branches,
    loading,
    activeTab,
    currentMonth,
    attendanceData,
    otData,
    leaveData,
    wfhData,
    lateData,
    leaveBalance,
    monthlyStats,

    // Edit state
    editMode,
    editForm,
    saving,

    // Delete state
    deleteModal,
    deleting,

    // Actions
    setActiveTab,
    setCurrentMonth,
    setEditMode,
    setEditForm,
    setDeleteModal,
    handleSave,
    handleDelete,
  } = useEmployeeDetail({ employeeId });

  if (loading) {
    return (
      <AdminLayout title="โปรไฟล์พนักงาน">
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-3 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!employee) {
    return (
      <AdminLayout title="โปรไฟล์พนักงาน">
        <div className="text-center py-20">
          <User className="w-16 h-16 mx-auto text-[#86868b] mb-4" />
          <p className="text-[#86868b]">ไม่พบข้อมูลพนักงาน</p>
          <Link
            href="/admin/employees"
            className="text-[#0071e3] mt-2 inline-block"
          >
            ← กลับไปหน้ารายชื่อ
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={employee.name}>
      {/* Header */}
      <EmployeeHeader
        employee={employee}
        showEditButton={!editMode && activeTab === "info"}
        onEdit={() => setEditMode(true)}
      />

      {/* Quick Stats */}
      <QuickStats stats={monthlyStats} />

      {/* Tabs */}
      <TabNavigation
        activeTab={activeTab}
        currentMonth={currentMonth}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setEditMode(false);
        }}
        onMonthChange={setCurrentMonth}
      />

      {/* Tab Content */}
      {activeTab === "info" && (
        <InfoTab
          employee={employee}
          branches={branches}
          editMode={editMode}
          editForm={editForm}
          saving={saving}
          onEditFormChange={setEditForm}
          onSave={handleSave}
          onCancel={() => {
            setEditMode(false);
            setEditForm(employee);
          }}
        />
      )}

      {activeTab === "attendance" && <AttendanceTab data={attendanceData} />}

      {activeTab === "ot" && (
        <OTTab
          data={otData}
          onDelete={(id, name) => setDeleteModal({ type: "ot", id, name })}
        />
      )}

      {activeTab === "leave" && (
        <LeaveTab
          data={leaveData}
          employee={employee}
          leaveBalance={leaveBalance}
          onDelete={(id, name) => setDeleteModal({ type: "leave", id, name })}
        />
      )}

      {activeTab === "wfh" && (
        <WFHTab
          data={wfhData}
          onDelete={(id, name) => setDeleteModal({ type: "wfh", id, name })}
        />
      )}

      {activeTab === "late" && <LateTab data={lateData} />}

      {activeTab === "gamification" && <GamificationTab employeeId={employeeId} />}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={!!deleteModal}
        itemName={deleteModal?.name || ""}
        deleting={deleting}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
      />
    </AdminLayout>
  );
}

export default function EmployeeProfilePage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "supervisor"]}>
      <EmployeeProfileContent />
    </ProtectedRoute>
  );
}
