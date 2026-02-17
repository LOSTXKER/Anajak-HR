"use client";

import { Badge } from "@/components/ui/Badge";
import { CheckCircle, Clock, XCircle } from "lucide-react";

export function getStatusBadge(status: string) {
  switch (status) {
    case "approved":
      return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />อนุมัติ</Badge>;
    case "pending":
      return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" />รออนุมัติ</Badge>;
    case "rejected":
      return <Badge variant="danger"><XCircle className="w-3 h-3 mr-1" />ปฏิเสธ</Badge>;
    case "completed":
      return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />เสร็จสิ้น</Badge>;
    case "cancelled":
      return <Badge variant="default">ยกเลิก</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

export function getOTTypeLabel(type: string) {
  switch (type) {
    case "weekday": return "วันทำงาน";
    case "weekend": return "วันหยุด";
    case "holiday": return "นักขัตฤกษ์";
    default: return type;
  }
}

export function getLeaveTypeLabel(type: string) {
  switch (type) {
    case "sick": return "ลาป่วย";
    case "personal": return "ลากิจ";
    case "annual": return "ลาพักร้อน";
    default: return type;
  }
}
