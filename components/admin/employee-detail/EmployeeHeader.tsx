"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Edit,
} from "lucide-react";
import { Employee, getRoleLabel } from "./types";

interface EmployeeHeaderProps {
  employee: Employee;
  showEditButton?: boolean;
  onEdit?: () => void;
}

export function EmployeeHeader({
  employee,
  showEditButton = false,
  onEdit,
}: EmployeeHeaderProps) {
  return (
    <>
      {/* Back Button */}
      <Link
        href="/admin/employees"
        className="inline-flex items-center gap-1.5 text-[#0071e3] hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        กลับไปหน้ารายชื่อพนักงาน
      </Link>

      {/* Profile Header */}
      <Card elevated className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <Avatar name={employee.name} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-[#1d1d1f]">
                {employee.name}
              </h1>
              <Badge
                variant={
                  employee.account_status === "approved" ? "success" : "warning"
                }
              >
                {employee.account_status === "approved"
                  ? "Active"
                  : employee.account_status}
              </Badge>
              <Badge variant="default">{getRoleLabel(employee.role)}</Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-[#86868b]">
              {employee.position && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {employee.position}
                </span>
              )}
              {employee.branch?.name && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {employee.branch.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {employee.email}
              </span>
              {employee.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {employee.phone}
                </span>
              )}
            </div>
          </div>
          {showEditButton && onEdit && (
            <Button onClick={onEdit}>
              <Edit className="w-4 h-4" />
              แก้ไข
            </Button>
          )}
        </div>
      </Card>
    </>
  );
}
