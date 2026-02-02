"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAttendanceAdmin } from "@/lib/hooks/use-attendance-admin";
import {
  AttendanceFilters,
  AttendanceStats,
  AttendanceTable,
  PhotoModal,
  AddAttendanceModal,
} from "@/components/admin/attendance";

function AttendanceContent() {
  const {
    // Data
    employees,
    branches,
    filteredRows,
    stats,
    loading,

    // Date state
    dateMode,
    selectedDate,
    startDate,
    endDate,

    // Filter state
    searchTerm,
    filterBranch,
    filterStatus,

    // Modal state
    photoModal,
    addModal,
    addForm,
    saving,

    // Actions
    setDateMode,
    setSelectedDate,
    setStartDate,
    setEndDate,
    setSearchTerm,
    setFilterBranch,
    setFilterStatus,
    setPhotoModal,
    setAddModal,
    setAddForm,
    goToPrevDay,
    goToNextDay,
    goToToday,
    handleAddAttendance,
    fetchAttendance,
  } = useAttendanceAdmin();

  return (
    <AdminLayout title="การเข้างาน">
      {/* Filters */}
      <AttendanceFilters
        dateMode={dateMode}
        selectedDate={selectedDate}
        startDate={startDate}
        endDate={endDate}
        searchTerm={searchTerm}
        filterBranch={filterBranch}
        filterStatus={filterStatus}
        branches={branches}
        loading={loading}
        onDateModeChange={setDateMode}
        onSelectedDateChange={setSelectedDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onSearchChange={setSearchTerm}
        onBranchChange={setFilterBranch}
        onStatusChange={setFilterStatus}
        onPrevDay={goToPrevDay}
        onNextDay={goToNextDay}
        onToday={goToToday}
        onRefresh={fetchAttendance}
        onAdd={() => setAddModal(true)}
      />

      {/* Stats */}
      <AttendanceStats stats={stats} />

      {/* Table */}
      <AttendanceTable
        rows={filteredRows}
        branches={branches}
        dateMode={dateMode}
        loading={loading}
        onPhotoClick={(url, type) => setPhotoModal({ url, type })}
      />

      {/* Photo Modal */}
      {photoModal && (
        <PhotoModal
          url={photoModal.url}
          type={photoModal.type}
          onClose={() => setPhotoModal(null)}
        />
      )}

      {/* Add Modal */}
      <AddAttendanceModal
        isOpen={addModal}
        employees={employees}
        form={addForm}
        saving={saving}
        onClose={() => setAddModal(false)}
        onFormChange={setAddForm}
        onSubmit={handleAddAttendance}
      />
    </AdminLayout>
  );
}

export default function AttendancePage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AttendanceContent />
    </ProtectedRoute>
  );
}
