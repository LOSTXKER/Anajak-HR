/**
 * Approval Types
 * =============================================
 */

import { Clock, Calendar, Home, AlertTriangle, MapPin } from "lucide-react";

export type RequestType = "ot" | "leave" | "wfh" | "late" | "field_work";
export type ViewMode = "pending" | "history";
export type HistoryStatus = "approved" | "rejected" | "cancelled" | "all";

export interface RequestItem {
  id: string;
  type: RequestType;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  date: string;
  title: string;
  subtitle: string;
  reason?: string;
  createdAt: string;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
  rawData: any;
}

export interface ApprovalStats {
  ot: number;
  leave: number;
  wfh: number;
  late: number;
  field_work: number;
  total: number;
}

export const typeConfig: Record<
  RequestType,
  { label: string; icon: any; color: string; bgColor: string }
> = {
  ot: {
    label: "OT",
    icon: Clock,
    color: "text-[#ff9500]",
    bgColor: "bg-[#ff9500]/10",
  },
  leave: {
    label: "ลา",
    icon: Calendar,
    color: "text-[#0071e3]",
    bgColor: "bg-[#0071e3]/10",
  },
  wfh: {
    label: "WFH",
    icon: Home,
    color: "text-[#af52de]",
    bgColor: "bg-[#af52de]/10",
  },
  late: {
    label: "มาสาย",
    icon: AlertTriangle,
    color: "text-[#ff3b30]",
    bgColor: "bg-[#ff3b30]/10",
  },
  field_work: {
    label: "งานนอกสถานที่",
    icon: MapPin,
    color: "text-[#34c759]",
    bgColor: "bg-[#34c759]/10",
  },
};

export const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  pending: {
    label: "รออนุมัติ",
    color: "text-[#ff9500]",
    bgColor: "bg-[#ff9500]/10",
  },
  approved: {
    label: "อนุมัติแล้ว",
    color: "text-[#34c759]",
    bgColor: "bg-[#34c759]/10",
  },
  completed: {
    label: "เสร็จสิ้น",
    color: "text-[#0071e3]",
    bgColor: "bg-[#0071e3]/10",
  },
  rejected: {
    label: "ปฏิเสธ",
    color: "text-[#ff3b30]",
    bgColor: "bg-[#ff3b30]/10",
  },
  cancelled: {
    label: "ยกเลิก",
    color: "text-[#86868b]",
    bgColor: "bg-[#86868b]/10",
  },
};
