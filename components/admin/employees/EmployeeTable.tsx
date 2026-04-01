"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import {
  Edit,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Eye,
  ChevronRight,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { Employee, LeaveBalance } from "./types";

interface EmployeeTableProps {
  employees: Employee[];
  balances: Record<string, LeaveBalance>;
  loading: boolean;
  showDeleted?: boolean;
  onEdit: (employee: Employee) => void;
  onApprove: (employee: Employee) => void;
  onReject: (employee: Employee) => void;
  onResign?: (employee: Employee) => void;
  onRehire?: (employee: Employee) => void;
}

function getRoleBadge(role: string) {
  switch (role) {
    case "admin":
      return <Badge variant="danger">👑 Admin</Badge>;
    case "supervisor":
      return <Badge variant="info">👨‍💼 Supervisor</Badge>;
    default:
      return <Badge variant="default">👤 Staff</Badge>;
  }
}

function getStatusBadge(status: string, employmentStatus?: string | null) {
  if (employmentStatus === "resigned") {
    return <Badge variant="default">ลาออก</Badge>;
  }
  if (employmentStatus === "terminated") {
    return <Badge variant="danger">เลิกจ้าง</Badge>;
  }
  switch (status) {
    case "approved":
      return <Badge variant="success">อนุมัติแล้ว</Badge>;
    case "pending":
      return <Badge variant="warning">รออนุมัติ</Badge>;
    case "rejected":
      return <Badge variant="danger">ปฏิเสธ</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export function EmployeeTable({
  employees,
  balances,
  loading,
  showDeleted = false,
  onEdit,
  onApprove,
  onReject,
  onResign,
  onRehire,
}: EmployeeTableProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Card elevated padding="none">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e8e8ed] bg-[#f9f9fb]">
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#86868b] uppercase">
                พนักงาน
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                ตำแหน่ง
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                สถานะ
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                พักร้อน
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                ป่วย
              </th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-[#86868b] uppercase">
                กิจ
              </th>
              <th className="text-right px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8ed]">
            {employees.map((emp) => {
              const balance = balances[emp.id];
              return (
                <tr
                  key={emp.id}
                  className={`hover:bg-[#f5f5f7]/50 cursor-pointer group ${emp.deleted_at ? "opacity-60" : ""}`}
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/employees/${emp.id}`}
                      className="flex items-center gap-3"
                    >
                      <Avatar name={emp.name} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">
                            {emp.name}
                          </p>
                          {emp.work_arrangement === "wfh" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0071e3]/10 text-[#0071e3]">
                              WFH
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-[#86868b] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="w-3 h-3 text-[#86868b]" />
                          <p className="text-xs text-[#86868b]">{emp.email}</p>
                        </div>
                        {emp.phone && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <Phone className="w-3 h-3 text-[#86868b]" />
                            <p className="text-xs text-[#86868b]">{emp.phone}</p>
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-4">{getRoleBadge(emp.role)}</td>
                  <td className="px-3 py-4">
                    {getStatusBadge(emp.account_status, emp.employment_status)}
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#34c759]">
                        {emp.annual_leave_quota || 10}
                      </p>
                      <p className="text-xs text-[#86868b]">
                        ใช้ {balance?.annual_used ?? 0} | เหลือ{" "}
                        {balance?.annual_remaining ?? (emp.annual_leave_quota || 10)}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#ff3b30]">
                        {emp.sick_leave_quota || 30}
                      </p>
                      <p className="text-xs text-[#86868b]">
                        ใช้ {balance?.sick_used ?? 0} | เหลือ{" "}
                        {balance?.sick_remaining ?? (emp.sick_leave_quota || 30)}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#ff9500]">
                        {emp.personal_leave_quota || 3}
                      </p>
                      <p className="text-xs text-[#86868b]">
                        ใช้ {balance?.personal_used ?? 0} | เหลือ{" "}
                        {balance?.personal_remaining ?? (emp.personal_leave_quota || 3)}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Show rehire button for resigned/terminated employees */}
                      {showDeleted && (emp.employment_status === "resigned" || emp.employment_status === "terminated" || emp.deleted_at) && onRehire && (
                        <button
                          onClick={() => onRehire(emp)}
                          className="p-2 text-[#34c759] hover:bg-[#34c759]/10 rounded-lg transition-colors"
                          title="รับกลับเข้าทำงาน"
                        >
                          <UserPlus className="w-5 h-5" />
                        </button>
                      )}

                      {showDeleted && (
                        <Link
                          href={`/admin/employees/${emp.id}`}
                          className="p-2 text-[#86868b] hover:bg-[#f5f5f7] rounded-lg transition-colors"
                          title="ดูประวัติ"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      )}
                      
                      {/* Normal action buttons for active employees */}
                      {!showDeleted && !emp.deleted_at && (
                        <>
                          {emp.account_status === "pending" &&
                            emp.role !== "admin" && (
                              <>
                                <button
                                  onClick={() => onApprove(emp)}
                                  className="p-2 text-[#34c759] hover:bg-[#34c759]/10 rounded-lg transition-colors"
                                  title="อนุมัติ"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => onReject(emp)}
                                  className="p-2 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                                  title="ปฏิเสธ"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </>
                            )}
                          <Link
                            href={`/admin/employees/${emp.id}`}
                            className="p-2 text-[#34c759] hover:bg-[#34c759]/10 rounded-lg transition-colors"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => onEdit(emp)}
                            className="p-2 text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg transition-colors"
                            title="แก้ไข"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {onResign && !emp.is_system_account && emp.role !== "admin" && (
                            <button
                              onClick={() => onResign(emp)}
                              className="p-2 text-[#ff9500] hover:bg-[#ff9500]/10 rounded-lg transition-colors"
                              title="ออกจากงาน"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
