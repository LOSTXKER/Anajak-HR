"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Clock } from "lucide-react";

interface ProfileHeaderProps {
  employee: any;
  pendingRequests: { ot: number; leave: number; wfh: number; late: number };
}

export function ProfileHeader({ employee, pendingRequests }: ProfileHeaderProps) {
  const totalPending = pendingRequests.ot + pendingRequests.leave + pendingRequests.wfh + pendingRequests.late;

  return (
    <>
      <Card elevated className="mb-6">
        <div className="flex items-center gap-4">
          <Avatar name={employee.name || "User"} size="xl" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[#1d1d1f]">{employee.name}</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="info">{employee.role === "supervisor" ? "หัวหน้างาน" : "พนักงาน"}</Badge>
              {employee.position && (
                <span className="text-sm text-[#86868b]">{employee.position}</span>
              )}
            </div>
            <p className="text-sm text-[#86868b] mt-1">{employee.email}</p>
          </div>
        </div>
      </Card>

      {totalPending > 0 && (
        <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff9500]/20 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#1d1d1f]">คำขอรอดำเนินการ</p>
              <p className="text-[13px] text-[#86868b]">
                {pendingRequests.ot > 0 && `OT ${pendingRequests.ot} `}
                {pendingRequests.leave > 0 && `ลา ${pendingRequests.leave} `}
                {pendingRequests.wfh > 0 && `WFH ${pendingRequests.wfh} `}
                {pendingRequests.late > 0 && `สาย ${pendingRequests.late}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
