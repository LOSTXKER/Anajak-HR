/**
 * Admin Requests Types
 * =============================================
 * Shared types and configs for admin request management
 */

import {
  Clock,
  Calendar,
  Home,
  AlertTriangle,
  MapPin,
  LucideIcon,
} from "lucide-react";

// Request Types
export type RequestType = "ot" | "leave" | "wfh" | "late" | "field_work";
export type RequestStatus =
  | "pending"
  | "approved"
  | "completed"
  | "rejected"
  | "cancelled"
  | "all";

// OT Rate Info
export interface OTRateInfo {
  rate: number;
  type: "workday" | "weekend" | "holiday";
  typeName: string;
  holidayName?: string;
}

// Request Item Interface
export interface RequestItem {
  id: string;
  type: RequestType;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  date: string;
  title: string;
  subtitle: string;
  details: string;
  reason?: string;
  status: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
  rawData: any;
}

// Type Config
export interface TypeConfigItem {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const typeConfig: Record<RequestType, TypeConfigItem> = {
  ot: {
    label: "OT",
    icon: Clock,
    color: "text-[#ff9500]",
    bgColor: "bg-[#ff9500]/10",
  },
  leave: {
    label: "ลางาน",
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

// Status Config
export interface StatusConfigItem {
  label: string;
  color: string;
  bgColor: string;
}

export const statusConfig: Record<string, StatusConfigItem> = {
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

// Leave Type Labels
export const leaveTypeLabels: Record<string, string> = {
  sick: "ลาป่วย",
  personal: "ลากิจ",
  annual: "ลาพักร้อน",
  maternity: "ลาคลอด",
  military: "ลากรณีทหาร",
  other: "อื่นๆ",
};

// Table name mapping
export const tableMap: Record<RequestType, string> = {
  ot: "ot_requests",
  leave: "leave_requests",
  wfh: "wfh_requests",
  late: "late_requests",
  field_work: "field_work_requests",
};

// Employee interface for forms
export interface Employee {
  id: string;
  name: string;
  email: string;
  base_salary?: number;
}

// Holiday interface
export interface Holiday {
  date: string;
  name: string;
}

// OT Settings interface
export interface OTSettings {
  workday: number;
  weekend: number;
  holiday: number;
}

// Request Stats interface
export interface RequestStats {
  ot: number;
  leave: number;
  wfh: number;
  late: number;
  field_work: number;
  pending: number;
  approved: number;
  completed: number;
  rejected: number;
  cancelled: number;
}

// Filter state interface
export interface RequestFiltersState {
  activeType: RequestType | "all";
  activeStatus: RequestStatus;
  searchTerm: string;
  dateRange: {
    start: string;
    end: string;
  };
}

// Create form data interface
export interface CreateFormData {
  employeeId: string;
  // OT
  otDate: string;
  otStartTime: string;
  otEndTime: string;
  otIsCompleted: boolean;
  otType: string;
  otRate: number;
  // Leave
  leaveType: string;
  leaveStartDate: string;
  leaveEndDate: string;
  leaveIsHalfDay: boolean;
  // WFH
  wfhDate: string;
  wfhIsHalfDay: boolean;
  // Late
  lateDate: string;
  lateMinutes: number;
  // Field Work
  fieldWorkDate: string;
  fieldWorkIsHalfDay: boolean;
  fieldWorkLocation: string;
  // Common
  reason: string;
}
