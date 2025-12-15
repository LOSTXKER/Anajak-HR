"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  Clock,
  Calendar,
  Home,
  AlertTriangle,
  MapPin,
  RefreshCw,
  Search,
  Edit,
  Ban,
  Eye,
  Check,
  X,
  ChevronDown,
  Plus,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import Link from "next/link";

// Types
type RequestType = "ot" | "leave" | "wfh" | "late" | "field_work";
type RequestStatus = "pending" | "approved" | "rejected" | "cancelled" | "all";

interface RequestItem {
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

// Config
const typeConfig: Record<RequestType, { label: string; icon: any; color: string; bgColor: string }> = {
  ot: { label: "OT", icon: Clock, color: "text-[#ff9500]", bgColor: "bg-[#ff9500]/10" },
  leave: { label: "ลางาน", icon: Calendar, color: "text-[#0071e3]", bgColor: "bg-[#0071e3]/10" },
  wfh: { label: "WFH", icon: Home, color: "text-[#af52de]", bgColor: "bg-[#af52de]/10" },
  late: { label: "มาสาย", icon: AlertTriangle, color: "text-[#ff3b30]", bgColor: "bg-[#ff3b30]/10" },
  field_work: { label: "งานนอกสถานที่", icon: MapPin, color: "text-[#34c759]", bgColor: "bg-[#34c759]/10" },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: "รออนุมัติ", color: "text-[#ff9500]", bgColor: "bg-[#ff9500]/10" },
  approved: { label: "อนุมัติแล้ว", color: "text-[#34c759]", bgColor: "bg-[#34c759]/10" },
  rejected: { label: "ปฏิเสธ", color: "text-[#ff3b30]", bgColor: "bg-[#ff3b30]/10" },
  cancelled: { label: "ยกเลิก", color: "text-[#86868b]", bgColor: "bg-[#86868b]/10" },
};

const leaveTypeLabels: Record<string, string> = {
  sick: "ลาป่วย", personal: "ลากิจ", annual: "ลาพักร้อน",
  maternity: "ลาคลอด", military: "ลากรณีทหาร", other: "อื่นๆ"
};

function RequestsManagementContent() {
  const { employee: currentAdmin } = useAuth();
  const toast = useToast();

  // Filter State
  const [activeType, setActiveType] = useState<RequestType | "all">("all");
  const [activeStatus, setActiveStatus] = useState<RequestStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({
    start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  // Data State
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [detailModal, setDetailModal] = useState<RequestItem | null>(null);
  const [cancelModal, setCancelModal] = useState<RequestItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [createType, setCreateType] = useState<RequestType | null>(null);
  const [editModal, setEditModal] = useState<RequestItem | null>(null);
  const [editData, setEditData] = useState<any>({});
  
  // Create Form State
  const [employees, setEmployees] = useState<any[]>([]);
  const [createFormData, setCreateFormData] = useState<any>({
    employeeId: "",
    // OT
    otDate: format(new Date(), "yyyy-MM-dd"),
    otStartTime: "18:00",
    otEndTime: "21:00",
    otIsCompleted: true,
    otType: "workday",
    otRate: 1.5,
    // Leave
    leaveType: "sick",
    leaveStartDate: format(new Date(), "yyyy-MM-dd"),
    leaveEndDate: format(new Date(), "yyyy-MM-dd"),
    leaveIsHalfDay: false,
    // WFH
    wfhDate: format(new Date(), "yyyy-MM-dd"),
    wfhIsHalfDay: false,
    // Late
    lateDate: format(new Date(), "yyyy-MM-dd"),
    lateMinutes: 0,
    // Field Work
    fieldWorkDate: format(new Date(), "yyyy-MM-dd"),
    fieldWorkIsHalfDay: false,
    fieldWorkLocation: "",
    // Common
    reason: "",
  });

  // Fetch all requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [otRes, leaveRes, wfhRes, lateRes, fieldWorkRes] = await Promise.all([
        supabase
          .from("ot_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("request_date", dateRange.start)
          .lte("request_date", dateRange.end)
          .order("created_at", { ascending: false }),
        supabase
          .from("leave_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("start_date", dateRange.start)
          .lte("start_date", dateRange.end)
          .order("created_at", { ascending: false }),
        supabase
          .from("wfh_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("date", dateRange.start)
          .lte("date", dateRange.end)
          .order("created_at", { ascending: false }),
        supabase
          .from("late_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("request_date", dateRange.start)
          .lte("request_date", dateRange.end)
          .order("created_at", { ascending: false }),
        supabase
          .from("field_work_requests")
          .select("*, employee:employees!employee_id(id, name, email)")
          .gte("date", dateRange.start)
          .lte("date", dateRange.end)
          .order("created_at", { ascending: false }),
      ]);

      const allRequests: RequestItem[] = [];

      // Process OT
      (otRes.data || []).forEach((r: any) => {
        if (!r.employee?.id) return;
        const startTime = format(parseISO(r.requested_start_time), "HH:mm");
        const endTime = format(parseISO(r.requested_end_time), "HH:mm");
        allRequests.push({
          id: r.id,
          type: "ot",
          employeeId: r.employee.id,
          employeeName: r.employee.name,
          employeeEmail: r.employee.email || "",
          date: r.request_date,
          title: `OT ${startTime} - ${endTime}`,
          subtitle: format(parseISO(r.request_date), "EEEE d MMM yyyy", { locale: th }),
          details: `เวลา: ${startTime} - ${endTime}\nชั่วโมง: ${r.approved_ot_hours || ((new Date(r.requested_end_time).getTime() - new Date(r.requested_start_time).getTime()) / (1000 * 60 * 60)).toFixed(2)} ชม.`,
          reason: r.reason,
          status: r.status,
          createdAt: r.created_at,
          approvedBy: r.approved_by,
          approvedAt: r.approved_at,
          cancelledBy: r.cancelled_by,
          cancelledAt: r.cancelled_at,
          cancelReason: r.cancel_reason,
          rawData: r,
        });
      });

      // Process Leave
      (leaveRes.data || []).forEach((r: any) => {
        if (!r.employee?.id) return;
        allRequests.push({
          id: r.id,
          type: "leave",
          employeeId: r.employee.id,
          employeeName: r.employee.name,
          employeeEmail: r.employee.email || "",
          date: r.start_date,
          title: leaveTypeLabels[r.leave_type] || r.leave_type,
          subtitle: r.is_half_day 
            ? `${format(parseISO(r.start_date), "d MMM", { locale: th })} (ครึ่งวัน)`
            : `${format(parseISO(r.start_date), "d MMM", { locale: th })} - ${format(parseISO(r.end_date), "d MMM yyyy", { locale: th })}`,
          details: `ประเภท: ${leaveTypeLabels[r.leave_type] || r.leave_type}\n${r.is_half_day ? "ครึ่งวัน" : `${r.start_date} ถึง ${r.end_date}`}`,
          reason: r.reason,
          status: r.status,
          createdAt: r.created_at,
          approvedBy: r.approved_by,
          approvedAt: r.approved_at,
          cancelledBy: r.cancelled_by,
          cancelledAt: r.cancelled_at,
          cancelReason: r.cancel_reason,
          rawData: r,
        });
      });

      // Process WFH
      (wfhRes.data || []).forEach((r: any) => {
        if (!r.employee?.id) return;
        allRequests.push({
          id: r.id,
          type: "wfh",
          employeeId: r.employee.id,
          employeeName: r.employee.name,
          employeeEmail: r.employee.email || "",
          date: r.date,
          title: r.is_half_day ? "WFH ครึ่งวัน" : "WFH เต็มวัน",
          subtitle: format(parseISO(r.date), "EEEE d MMM yyyy", { locale: th }),
          details: `วันที่: ${format(parseISO(r.date), "d MMM yyyy", { locale: th })}\n${r.is_half_day ? "ครึ่งวัน" : "เต็มวัน"}`,
          reason: r.reason,
          status: r.status,
          createdAt: r.created_at,
          approvedBy: r.approved_by,
          approvedAt: r.approved_at,
          cancelledBy: r.cancelled_by,
          cancelledAt: r.cancelled_at,
          cancelReason: r.cancel_reason,
          rawData: r,
        });
      });

      // Process Late
      (lateRes.data || []).forEach((r: any) => {
        if (!r.employee?.id) return;
        allRequests.push({
          id: r.id,
          type: "late",
          employeeId: r.employee.id,
          employeeName: r.employee.name,
          employeeEmail: r.employee.email || "",
          date: r.request_date,
          title: r.actual_late_minutes ? `สาย ${r.actual_late_minutes} นาที` : "ขออนุมัติมาสาย",
          subtitle: format(parseISO(r.request_date), "EEEE d MMM yyyy", { locale: th }),
          details: `วันที่: ${format(parseISO(r.request_date), "d MMM yyyy", { locale: th })}${r.actual_late_minutes ? `\nสาย: ${r.actual_late_minutes} นาที` : ""}`,
          reason: r.reason,
          status: r.status,
          createdAt: r.created_at,
          approvedBy: r.approved_by,
          approvedAt: r.approved_at,
          cancelledBy: r.cancelled_by,
          cancelledAt: r.cancelled_at,
          cancelReason: r.cancel_reason,
          rawData: r,
        });
      });

      // Process Field Work
      (fieldWorkRes.data || []).forEach((r: any) => {
        if (!r.employee?.id) return;
        allRequests.push({
          id: r.id,
          type: "field_work",
          employeeId: r.employee.id,
          employeeName: r.employee.name,
          employeeEmail: r.employee.email || "",
          date: r.date,
          title: r.is_half_day ? "งานนอกสถานที่ ครึ่งวัน" : "งานนอกสถานที่ เต็มวัน",
          subtitle: `${format(parseISO(r.date), "d MMM", { locale: th })} • ${r.location}`,
          details: `วันที่: ${format(parseISO(r.date), "d MMM yyyy", { locale: th })}\nสถานที่: ${r.location}\n${r.is_half_day ? "ครึ่งวัน" : "เต็มวัน"}`,
          reason: r.reason,
          status: r.status,
          createdAt: r.created_at,
          approvedBy: r.approved_by,
          approvedAt: r.approved_at,
          cancelledBy: r.cancelled_by,
          cancelledAt: r.cancelled_at,
          cancelReason: r.cancel_reason,
          rawData: r,
        });
      });

      // Sort by date descending
      allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(allRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    fetchRequests();
    fetchEmployees();
  }, [fetchRequests]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, name, email, base_salary")
      .neq("role", "admin")
      .order("name");
    setEmployees(data || []);
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (activeType !== "all" && r.type !== activeType) return false;
      if (activeStatus !== "all" && r.status !== activeStatus) return false;
      if (searchTerm && !r.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [requests, activeType, activeStatus, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const counts = { ot: 0, leave: 0, wfh: 0, late: 0, field_work: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    requests.forEach((r) => {
      counts[r.type]++;
      if (r.status in counts) (counts as any)[r.status]++;
    });
    return counts;
  }, [requests]);

  // Handle approve
  const handleApprove = async (request: RequestItem) => {
    if (!currentAdmin) return;
    setProcessing(true);
    try {
      const tableMap: Record<RequestType, string> = {
        ot: "ot_requests", leave: "leave_requests", wfh: "wfh_requests",
        late: "late_requests", field_work: "field_work_requests",
      };

      const updateData: any = {
        status: "approved",
        approved_by: currentAdmin.id,
        approved_at: new Date().toISOString(),
      };

      if (request.type === "ot") {
        updateData.approved_start_time = request.rawData.requested_start_time;
        updateData.approved_end_time = request.rawData.requested_end_time;
        const start = new Date(request.rawData.requested_start_time);
        const end = new Date(request.rawData.requested_end_time);
        updateData.approved_ot_hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }

      const { error } = await supabase.from(tableMap[request.type]).update(updateData).eq("id", request.id);
      if (error) throw error;

      toast.success("อนุมัติสำเร็จ", `${typeConfig[request.type].label} ของ ${request.employeeName}`);
      setDetailModal(null);
      fetchRequests();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setProcessing(false);
    }
  };

  // Handle reject
  const handleReject = async (request: RequestItem) => {
    if (!currentAdmin) return;
    setProcessing(true);
    try {
      const tableMap: Record<RequestType, string> = {
        ot: "ot_requests", leave: "leave_requests", wfh: "wfh_requests",
        late: "late_requests", field_work: "field_work_requests",
      };

      const { error } = await supabase
        .from(tableMap[request.type])
        .update({
          status: "rejected",
          approved_by: currentAdmin.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;

      toast.success("ปฏิเสธสำเร็จ", `${typeConfig[request.type].label} ของ ${request.employeeName}`);
      setDetailModal(null);
      fetchRequests();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setProcessing(false);
    }
  };

  // Handle cancel
  const handleCancel = async () => {
    if (!cancelModal || !currentAdmin || !cancelReason.trim()) return;
    setProcessing(true);
    try {
      const tableMap: Record<RequestType, string> = {
        ot: "ot_requests", leave: "leave_requests", wfh: "wfh_requests",
        late: "late_requests", field_work: "field_work_requests",
      };

      const { error } = await supabase
        .from(tableMap[cancelModal.type])
        .update({
          status: "cancelled",
          cancelled_by: currentAdmin.id,
          cancelled_at: new Date().toISOString(),
          cancel_reason: cancelReason.trim(),
        })
        .eq("id", cancelModal.id);

      if (error) throw error;

      toast.success("ยกเลิกสำเร็จ", `${typeConfig[cancelModal.type].label} ของ ${cancelModal.employeeName}`);
      setCancelModal(null);
      setCancelReason("");
      fetchRequests();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setProcessing(false);
    }
  };

  // Handle create request
  const handleCreateRequest = async () => {
    if (!createType || !createFormData.employeeId || !currentAdmin) return;
    setProcessing(true);
    try {
      const approvalData = {
        approved_by: currentAdmin.id,
        approved_at: new Date().toISOString(),
      };

      switch (createType) {
        case "ot": {
          const startDateTime = new Date(`${createFormData.otDate}T${createFormData.otStartTime}:00`);
          const endDateTime = new Date(`${createFormData.otDate}T${createFormData.otEndTime}:00`);
          const otHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

          // Get employee salary
          const emp = employees.find(e => e.id === createFormData.employeeId);
          const baseSalary = emp?.base_salary || 0;
          let otAmount = null;
          if (baseSalary > 0) {
            const hourlyRate = baseSalary / 30 / 8;
            otAmount = Math.round(otHours * hourlyRate * createFormData.otRate * 100) / 100;
          }

          const insertData: any = {
            employee_id: createFormData.employeeId,
            request_date: createFormData.otDate,
            requested_start_time: startDateTime.toISOString(),
            requested_end_time: endDateTime.toISOString(),
            approved_start_time: startDateTime.toISOString(),
            approved_end_time: endDateTime.toISOString(),
            approved_ot_hours: Math.round(otHours * 100) / 100,
            ot_type: createFormData.otType,
            ot_rate: createFormData.otRate,
            reason: createFormData.reason,
            ...approvalData,
          };

          if (createFormData.otIsCompleted) {
            insertData.status = "completed";
            insertData.actual_start_time = startDateTime.toISOString();
            insertData.actual_end_time = endDateTime.toISOString();
            insertData.actual_ot_hours = Math.round(otHours * 100) / 100;
            insertData.ot_amount = otAmount;
          } else {
            insertData.status = "approved";
          }

          const { error } = await supabase.from("ot_requests").insert(insertData);
          if (error) throw error;
          break;
        }

        case "leave": {
          const { error } = await supabase.from("leave_requests").insert({
            employee_id: createFormData.employeeId,
            leave_type: createFormData.leaveType,
            start_date: createFormData.leaveStartDate,
            end_date: createFormData.leaveEndDate,
            is_half_day: createFormData.leaveIsHalfDay,
            reason: createFormData.reason,
            status: "approved",
            ...approvalData,
          });
          if (error) throw error;
          break;
        }

        case "wfh": {
          const { error } = await supabase.from("wfh_requests").insert({
            employee_id: createFormData.employeeId,
            date: createFormData.wfhDate,
            is_half_day: createFormData.wfhIsHalfDay,
            reason: createFormData.reason,
            status: "approved",
            ...approvalData,
          });
          if (error) throw error;
          break;
        }

        case "late": {
          const { error } = await supabase.from("late_requests").insert({
            employee_id: createFormData.employeeId,
            request_date: createFormData.lateDate,
            actual_late_minutes: createFormData.lateMinutes,
            reason: createFormData.reason,
            status: "approved",
            ...approvalData,
          });
          if (error) throw error;
          break;
        }

        case "field_work": {
          if (!createFormData.fieldWorkLocation.trim()) {
            toast.error("กรุณาระบุสถานที่", "สถานที่จำเป็นสำหรับงานนอกสถานที่");
            setProcessing(false);
            return;
          }
          const { error } = await supabase.from("field_work_requests").insert({
            employee_id: createFormData.employeeId,
            date: createFormData.fieldWorkDate,
            is_half_day: createFormData.fieldWorkIsHalfDay,
            location: createFormData.fieldWorkLocation.trim(),
            reason: createFormData.reason,
            status: "approved",
            ...approvalData,
          });
          if (error) throw error;
          break;
        }
      }

      const successMsg = createType === "ot" && createFormData.otIsCompleted
        ? "OT ถูกบันทึกและคำนวณยอดเงินแล้ว"
        : "คำขอได้รับการอนุมัติแล้ว";
      toast.success("สร้างคำขอสำเร็จ", successMsg);
      
      // Reset and close
      setCreateType(null);
      setCreateModal(false);
      setCreateFormData({
        employeeId: "",
        otDate: format(new Date(), "yyyy-MM-dd"),
        otStartTime: "18:00",
        otEndTime: "21:00",
        otIsCompleted: true,
        otType: "workday",
        otRate: 1.5,
        leaveType: "sick",
        leaveStartDate: format(new Date(), "yyyy-MM-dd"),
        leaveEndDate: format(new Date(), "yyyy-MM-dd"),
        leaveIsHalfDay: false,
        wfhDate: format(new Date(), "yyyy-MM-dd"),
        wfhIsHalfDay: false,
        lateDate: format(new Date(), "yyyy-MM-dd"),
        lateMinutes: 0,
        fieldWorkDate: format(new Date(), "yyyy-MM-dd"),
        fieldWorkIsHalfDay: false,
        fieldWorkLocation: "",
        reason: "",
      });
      fetchRequests();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message || "ไม่สามารถสร้างคำขอได้");
    } finally {
      setProcessing(false);
    }
  };

  // Handle edit
  const openEditModal = (request: RequestItem) => {
    setEditModal(request);
    // Initialize edit data based on type
    switch (request.type) {
      case "ot":
        setEditData({
          requested_start_time: request.rawData.requested_start_time?.split('T')[1]?.substring(0, 5) || "",
          requested_end_time: request.rawData.requested_end_time?.split('T')[1]?.substring(0, 5) || "",
          reason: request.reason || "",
        });
        break;
      case "leave":
        setEditData({
          leave_type: request.rawData.leave_type || "sick",
          start_date: request.rawData.start_date || "",
          end_date: request.rawData.end_date || "",
          is_half_day: request.rawData.is_half_day || false,
          reason: request.reason || "",
        });
        break;
      case "wfh":
        setEditData({
          date: request.rawData.date || "",
          is_half_day: request.rawData.is_half_day || false,
          reason: request.reason || "",
        });
        break;
      case "late":
        setEditData({
          request_date: request.rawData.request_date || "",
          actual_late_minutes: request.rawData.actual_late_minutes || 0,
          reason: request.reason || "",
        });
        break;
      case "field_work":
        setEditData({
          date: request.rawData.date || "",
          location: request.rawData.location || "",
          is_half_day: request.rawData.is_half_day || false,
          reason: request.reason || "",
        });
        break;
    }
  };

  const handleEdit = async () => {
    if (!editModal || !currentAdmin) return;
    setProcessing(true);
    try {
      const tableMap: Record<RequestType, string> = {
        ot: "ot_requests", leave: "leave_requests", wfh: "wfh_requests",
        late: "late_requests", field_work: "field_work_requests",
      };

      let updateData: any = {};

      switch (editModal.type) {
        case "ot":
          const startDateTime = `${editModal.rawData.request_date}T${editData.requested_start_time}:00`;
          const endDateTime = `${editModal.rawData.request_date}T${editData.requested_end_time}:00`;
          updateData = {
            requested_start_time: startDateTime,
            requested_end_time: endDateTime,
            reason: editData.reason,
          };
          break;
        case "leave":
          updateData = {
            leave_type: editData.leave_type,
            start_date: editData.start_date,
            end_date: editData.end_date,
            is_half_day: editData.is_half_day,
            reason: editData.reason,
          };
          break;
        case "wfh":
          updateData = {
            date: editData.date,
            is_half_day: editData.is_half_day,
            reason: editData.reason,
          };
          break;
        case "late":
          updateData = {
            request_date: editData.request_date,
            actual_late_minutes: parseInt(editData.actual_late_minutes) || 0,
            reason: editData.reason,
          };
          break;
        case "field_work":
          updateData = {
            date: editData.date,
            location: editData.location,
            is_half_day: editData.is_half_day,
            reason: editData.reason,
          };
          break;
      }

      const { error } = await supabase
        .from(tableMap[editModal.type])
        .update(updateData)
        .eq("id", editModal.id);

      if (error) throw error;

      toast.success("แก้ไขสำเร็จ", `${typeConfig[editModal.type].label} ของ ${editModal.employeeName}`);
      setEditModal(null);
      setEditData({});
      fetchRequests();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาด", error?.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AdminLayout title="จัดการคำขอ" description="ดูและจัดการคำขอทั้งหมด (OT, ลา, WFH, มาสาย, งานนอกสถานที่)">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {(Object.keys(typeConfig) as RequestType[]).map((type) => {
          const config = typeConfig[type];
          const Icon = config.icon;
          return (
            <Card key={type} elevated className="!p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${config.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div>
                  <p className="text-[24px] font-bold text-[#1d1d1f]">{stats[type]}</p>
                  <p className="text-[13px] text-[#86868b]">{config.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card elevated className="mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 rounded-lg bg-[#f5f5f7] text-[14px]"
            />
            <span className="text-[#86868b]">ถึง</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 rounded-lg bg-[#f5f5f7] text-[14px]"
            />
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              placeholder="ค้นหาชื่อพนักงาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#f5f5f7] text-[14px]"
            />
          </div>

          {/* Type Filter */}
          <select
            value={activeType}
            onChange={(e) => setActiveType(e.target.value as any)}
            className="px-3 py-2 rounded-lg bg-[#f5f5f7] text-[14px]"
          >
            <option value="all">ทุกประเภท</option>
            {(Object.keys(typeConfig) as RequestType[]).map((type) => (
              <option key={type} value={type}>{typeConfig[type].label}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={activeStatus}
            onChange={(e) => setActiveStatus(e.target.value as any)}
            className="px-3 py-2 rounded-lg bg-[#f5f5f7] text-[14px]"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="pending">รออนุมัติ ({stats.pending})</option>
            <option value="approved">อนุมัติแล้ว ({stats.approved})</option>
            <option value="rejected">ปฏิเสธ ({stats.rejected})</option>
            <option value="cancelled">ยกเลิก ({stats.cancelled})</option>
          </select>

          {/* Refresh */}
          <Button variant="secondary" onClick={fetchRequests} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          {/* Add New */}
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateModal(true)}>
            เพิ่มคำขอ
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card elevated className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e8e8ed] bg-[#f5f5f7]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#86868b]">วันที่</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#86868b]">พนักงาน</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#86868b]">ประเภท</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#86868b]">รายละเอียด</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">สถานะ</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#86868b]">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-[#86868b]">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      กำลังโหลด...
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#86868b]">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const tConfig = typeConfig[request.type];
                  const sConfig = statusConfig[request.status] || statusConfig.pending;
                  const Icon = tConfig.icon;

                  return (
                    <tr key={`${request.type}_${request.id}`} className="border-b border-[#e8e8ed] hover:bg-[#f5f5f7]/50">
                      <td className="px-4 py-3 text-sm text-[#1d1d1f]">
                        {format(parseISO(request.date), "d MMM yy", { locale: th })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={request.employeeName} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-[#1d1d1f]">{request.employeeName}</p>
                            <p className="text-xs text-[#86868b]">{request.employeeEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${tConfig.bgColor} ${tConfig.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {tConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[#1d1d1f]">{request.title}</p>
                        <p className="text-xs text-[#86868b]">{request.subtitle}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${sConfig.bgColor} ${sConfig.color}`}>
                          {sConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* View Detail */}
                          <button
                            onClick={() => setDetailModal(request)}
                            className="p-1.5 text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg transition-colors"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit for pending */}
                          {request.status === "pending" && (
                            <button
                              onClick={() => openEditModal(request)}
                              className="p-1.5 text-[#ff9500] hover:bg-[#ff9500]/10 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Approve/Reject for pending */}
                          {request.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleApprove(request)}
                                className="p-1.5 text-[#34c759] hover:bg-[#34c759]/10 rounded-lg transition-colors"
                                title="อนุมัติ"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(request)}
                                className="p-1.5 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                                title="ปฏิเสธ"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Cancel for approved */}
                          {request.status === "approved" && (
                            <button
                              onClick={() => setCancelModal(request)}
                              className="p-1.5 text-[#86868b] hover:bg-[#86868b]/10 rounded-lg transition-colors"
                              title="ยกเลิก"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Results count */}
        <div className="px-4 py-3 border-t border-[#e8e8ed] bg-[#f5f5f7]">
          <p className="text-[13px] text-[#86868b]">
            แสดง {filteredRequests.length} จาก {requests.length} รายการ
          </p>
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="รายละเอียดคำขอ">
        {detailModal && (
          <div className="space-y-4">
            {/* Type & Status */}
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${typeConfig[detailModal.type].bgColor} ${typeConfig[detailModal.type].color}`}>
                {React.createElement(typeConfig[detailModal.type].icon, { className: "w-4 h-4" })}
                {typeConfig[detailModal.type].label}
              </span>
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusConfig[detailModal.status]?.bgColor} ${statusConfig[detailModal.status]?.color}`}>
                {statusConfig[detailModal.status]?.label}
              </span>
            </div>

            {/* Employee */}
            <div className="p-4 bg-[#f5f5f7] rounded-xl">
              <p className="text-[13px] text-[#86868b] mb-1">พนักงาน</p>
              <p className="text-[15px] font-medium text-[#1d1d1f]">{detailModal.employeeName}</p>
              <p className="text-[13px] text-[#86868b]">{detailModal.employeeEmail}</p>
            </div>

            {/* Details */}
            <div className="p-4 bg-[#f5f5f7] rounded-xl">
              <p className="text-[13px] text-[#86868b] mb-1">รายละเอียด</p>
              <p className="text-[15px] text-[#1d1d1f] whitespace-pre-line">{detailModal.details}</p>
            </div>

            {/* Reason */}
            {detailModal.reason && (
              <div className="p-4 bg-[#f5f5f7] rounded-xl">
                <p className="text-[13px] text-[#86868b] mb-1">เหตุผล</p>
                <p className="text-[15px] text-[#1d1d1f]">{detailModal.reason}</p>
              </div>
            )}

            {/* Cancel Reason */}
            {detailModal.cancelReason && (
              <div className="p-4 bg-[#ff3b30]/10 rounded-xl">
                <p className="text-[13px] text-[#ff3b30] mb-1">เหตุผลยกเลิก</p>
                <p className="text-[15px] text-[#1d1d1f]">{detailModal.cancelReason}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setDetailModal(null)} fullWidth>
                ปิด
              </Button>
              {detailModal.status === "pending" && (
                <>
                  <Button onClick={() => handleReject(detailModal)} loading={processing} fullWidth className="!bg-[#ff3b30] hover:!bg-[#e0352b]">
                    ปฏิเสธ
                  </Button>
                  <Button onClick={() => handleApprove(detailModal)} loading={processing} fullWidth>
                    อนุมัติ
                  </Button>
                </>
              )}
              {detailModal.status === "approved" && (
                <Button onClick={() => { setDetailModal(null); setCancelModal(detailModal); }} fullWidth className="!bg-[#ff3b30] hover:!bg-[#e0352b]">
                  ยกเลิก
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Request Modal - Step 1: Select Type */}
      <Modal isOpen={createModal && !createType} onClose={() => setCreateModal(false)} title="เลือกประเภทคำขอ">
        <div className="space-y-3">
          <p className="text-[14px] text-[#86868b] mb-4">เลือกประเภทคำขอที่ต้องการสร้าง</p>
          {(Object.keys(typeConfig) as RequestType[]).map((type) => {
            const config = typeConfig[type];
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => setCreateType(type)}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-[#f5f5f7] transition-all group"
              >
                <div className={`w-12 h-12 ${config.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${config.color}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-semibold text-[#1d1d1f]">{config.label}</p>
                  <p className="text-[13px] text-[#86868b]">
                    {type === "ot" && "สร้างคำขอ OT แทนพนักงาน"}
                    {type === "leave" && "สร้างคำขอลางานแทนพนักงาน"}
                    {type === "wfh" && "สร้างคำขอ WFH แทนพนักงาน"}
                    {type === "late" && "สร้างคำขออนุมัติมาสายแทนพนักงาน"}
                    {type === "field_work" && "สร้างคำของานนอกสถานที่แทนพนักงาน"}
                  </p>
                </div>
                <ChevronDown className="w-5 h-5 text-[#86868b] -rotate-90 group-hover:translate-x-1 transition-transform" />
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Create Request Modal - Step 2: Form */}
      <Modal
        isOpen={!!createType}
        onClose={() => {
          setCreateType(null);
          setCreateModal(false);
        }}
        title={`สร้าง${typeConfig[createType || "ot"].label}ใหม่`}
      >
        {createType && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Employee Selection */}
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เลือกพนักงาน</label>
              <select
                value={createFormData.employeeId}
                onChange={(e) => setCreateFormData({ ...createFormData, employeeId: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                required
              >
                <option value="">-- เลือกพนักงาน --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
            </div>

            {/* OT Form */}
            {createType === "ot" && (
              <>
                <div className="p-4 bg-[#f5f5f7] rounded-xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createFormData.otIsCompleted}
                      onChange={(e) => setCreateFormData({ ...createFormData, otIsCompleted: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <span className="text-[15px] font-medium text-[#1d1d1f]">
                        ✅ OT ทำเสร็จแล้ว (สร้างย้อนหลัง)
                      </span>
                      <p className="text-[13px] text-[#86868b]">
                        {createFormData.otIsCompleted 
                          ? "บันทึกยอดเงิน OT ทันที พนักงานไม่ต้องกดเริ่ม-จบ"
                          : "พนักงานต้องกดเริ่มและจบ OT เอง"
                        }
                      </p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่</label>
                  <input
                    type="date"
                    value={createFormData.otDate}
                    onChange={(e) => setCreateFormData({ ...createFormData, otDate: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เวลาเริ่ม</label>
                    <input
                      type="time"
                      value={createFormData.otStartTime}
                      onChange={(e) => setCreateFormData({ ...createFormData, otStartTime: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เวลาสิ้นสุด</label>
                    <input
                      type="time"
                      value={createFormData.otEndTime}
                      onChange={(e) => setCreateFormData({ ...createFormData, otEndTime: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[15px] focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">ประเภท OT & อัตราคูณ</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateFormData({ ...createFormData, otType: "workday", otRate: 1.5 })}
                      className={`p-3 rounded-xl text-center transition-all ${createFormData.otType === "workday" ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"}`}
                    >
                      <span className="block text-[20px] font-bold">1.5x</span>
                      <span className="block text-[11px] mt-0.5">วันธรรมดา</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateFormData({ ...createFormData, otType: "weekend", otRate: 2 })}
                      className={`p-3 rounded-xl text-center transition-all ${createFormData.otType === "weekend" ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"}`}
                    >
                      <span className="block text-[20px] font-bold">2x</span>
                      <span className="block text-[11px] mt-0.5">วันหยุด</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateFormData({ ...createFormData, otType: "holiday", otRate: 3 })}
                      className={`p-3 rounded-xl text-center transition-all ${createFormData.otType === "holiday" ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]"}`}
                    >
                      <span className="block text-[20px] font-bold">3x</span>
                      <span className="block text-[11px] mt-0.5">นักขัตฤกษ์</span>
                    </button>
                  </div>
                </div>

                {/* OT Preview */}
                {createFormData.otIsCompleted && createFormData.otStartTime && createFormData.otEndTime && (
                  <div className="p-4 bg-[#34c759]/10 rounded-xl">
                    <p className="text-[13px] text-[#34c759] font-medium mb-1">💰 ประมาณการ OT</p>
                    <p className="text-[15px] text-[#1d1d1f]">
                      {(() => {
                        const start = new Date(`2000-01-01T${createFormData.otStartTime}:00`);
                        const end = new Date(`2000-01-01T${createFormData.otEndTime}:00`);
                        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                        const emp = employees.find(e => e.id === createFormData.employeeId);
                        const baseSalary = emp?.base_salary || 0;
                        if (baseSalary > 0) {
                          const hourlyRate = baseSalary / 30 / 8;
                          const amount = hours * hourlyRate * createFormData.otRate;
                          return `${hours.toFixed(2)} ชม. × ${createFormData.otRate}x ≈ ฿${amount.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
                        }
                        return `${hours.toFixed(2)} ชั่วโมง × ${createFormData.otRate}x = ${(hours * createFormData.otRate).toFixed(2)} ชม. (เทียบเท่า)`;
                      })()}
                    </p>
                    <p className="text-[12px] text-[#86868b] mt-1">
                      * ยอดเงินคำนวณจาก base salary ของพนักงาน
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                  <Textarea
                    value={createFormData.reason}
                    onChange={(e) => setCreateFormData({ ...createFormData, reason: e.target.value })}
                    rows={2}
                    placeholder="ระบุเหตุผล..."
                  />
                </div>
              </>
            )}

            {/* Leave Form */}
            {createType === "leave" && (
              <>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">ประเภทการลา</label>
                  <select
                    value={createFormData.leaveType}
                    onChange={(e) => setCreateFormData({ ...createFormData, leaveType: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                  >
                    <option value="sick">ลาป่วย</option>
                    <option value="personal">ลากิจ</option>
                    <option value="annual">ลาพักร้อน</option>
                    <option value="maternity">ลาคลอด</option>
                    <option value="military">ลากรณีทหาร</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-lg">
                  <input
                    type="checkbox"
                    checked={createFormData.leaveIsHalfDay}
                    onChange={(e) => setCreateFormData({ ...createFormData, leaveIsHalfDay: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-[14px] text-[#1d1d1f]">ลาครึ่งวัน</label>
                </div>

                {!createFormData.leaveIsHalfDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่เริ่ม</label>
                      <input
                        type="date"
                        value={createFormData.leaveStartDate}
                        onChange={(e) => setCreateFormData({ ...createFormData, leaveStartDate: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่สิ้นสุด</label>
                      <input
                        type="date"
                        value={createFormData.leaveEndDate}
                        onChange={(e) => setCreateFormData({ ...createFormData, leaveEndDate: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                      />
                    </div>
                  </div>
                )}

                {createFormData.leaveIsHalfDay && (
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่</label>
                    <input
                      type="date"
                      value={createFormData.leaveStartDate}
                      onChange={(e) => setCreateFormData({ ...createFormData, leaveStartDate: e.target.value, leaveEndDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                  <Textarea
                    value={createFormData.reason}
                    onChange={(e) => setCreateFormData({ ...createFormData, reason: e.target.value })}
                    rows={2}
                    placeholder="ระบุเหตุผล (ถ้ามี)..."
                  />
                </div>
              </>
            )}

            {/* WFH Form */}
            {createType === "wfh" && (
              <>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่</label>
                  <input
                    type="date"
                    value={createFormData.wfhDate}
                    onChange={(e) => setCreateFormData({ ...createFormData, wfhDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-lg">
                  <input
                    type="checkbox"
                    checked={createFormData.wfhIsHalfDay}
                    onChange={(e) => setCreateFormData({ ...createFormData, wfhIsHalfDay: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-[14px] text-[#1d1d1f]">WFH ครึ่งวัน</label>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                  <Textarea
                    value={createFormData.reason}
                    onChange={(e) => setCreateFormData({ ...createFormData, reason: e.target.value })}
                    rows={2}
                    placeholder="ระบุเหตุผล..."
                  />
                </div>
              </>
            )}

            {/* Late Form */}
            {createType === "late" && (
              <>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่</label>
                  <input
                    type="date"
                    value={createFormData.lateDate}
                    onChange={(e) => setCreateFormData({ ...createFormData, lateDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">จำนวนนาทีที่สาย</label>
                  <input
                    type="number"
                    value={createFormData.lateMinutes}
                    onChange={(e) => setCreateFormData({ ...createFormData, lateMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                  <Textarea
                    value={createFormData.reason}
                    onChange={(e) => setCreateFormData({ ...createFormData, reason: e.target.value })}
                    rows={2}
                    placeholder="ระบุเหตุผล..."
                  />
                </div>
              </>
            )}

            {/* Field Work Form */}
            {createType === "field_work" && (
              <>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่</label>
                  <input
                    type="date"
                    value={createFormData.fieldWorkDate}
                    onChange={(e) => setCreateFormData({ ...createFormData, fieldWorkDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">สถานที่</label>
                  <input
                    type="text"
                    value={createFormData.fieldWorkLocation}
                    onChange={(e) => setCreateFormData({ ...createFormData, fieldWorkLocation: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                    placeholder="ระบุสถานที่..."
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-lg">
                  <input
                    type="checkbox"
                    checked={createFormData.fieldWorkIsHalfDay}
                    onChange={(e) => setCreateFormData({ ...createFormData, fieldWorkIsHalfDay: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-[14px] text-[#1d1d1f]">ครึ่งวัน</label>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                  <Textarea
                    value={createFormData.reason}
                    onChange={(e) => setCreateFormData({ ...createFormData, reason: e.target.value })}
                    rows={2}
                    placeholder="ระบุเหตุผล..."
                  />
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setCreateType(null);
                  setCreateModal(false);
                }}
                fullWidth
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleCreateRequest}
                loading={processing}
                disabled={!createFormData.employeeId}
                fullWidth
              >
                สร้างคำขอ (อนุมัติทันที)
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editModal} onClose={() => { setEditModal(null); setEditData({}); }} title={`แก้ไข${typeConfig[editModal?.type || "ot"].label}`}>
        {editModal && (
          <div className="space-y-4">
            {/* Employee Info */}
            <div className="p-4 bg-[#f5f5f7] rounded-xl">
              <p className="text-[13px] text-[#86868b] mb-1">พนักงาน</p>
              <p className="text-[15px] font-medium text-[#1d1d1f]">{editModal.employeeName}</p>
            </div>

            {/* Edit Forms based on type */}
            {editModal.type === "ot" && (
              <>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เวลาเริ่ม OT</label>
                  <input
                    type="time"
                    value={editData.requested_start_time || ""}
                    onChange={(e) => setEditData({ ...editData, requested_start_time: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เวลาสิ้นสุด OT</label>
                  <input
                    type="time"
                    value={editData.requested_end_time || ""}
                    onChange={(e) => setEditData({ ...editData, requested_end_time: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                  <Textarea
                    value={editData.reason || ""}
                    onChange={(e) => setEditData({ ...editData, reason: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}

            {editModal.type === "leave" && (
              <>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">ประเภทการลา</label>
                  <select
                    value={editData.leave_type || "sick"}
                    onChange={(e) => setEditData({ ...editData, leave_type: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                  >
                    <option value="sick">ลาป่วย</option>
                    <option value="personal">ลากิจ</option>
                    <option value="annual">ลาพักร้อน</option>
                    <option value="maternity">ลาคลอด</option>
                    <option value="military">ลากรณีทหาร</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-lg">
                  <input
                    type="checkbox"
                    checked={editData.is_half_day || false}
                    onChange={(e) => setEditData({ ...editData, is_half_day: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-[14px] text-[#1d1d1f]">ลาครึ่งวัน</label>
                </div>
                {!editData.is_half_day && (
                  <>
                    <div>
                      <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่เริ่ม</label>
                      <input
                        type="date"
                        value={editData.start_date || ""}
                        onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่สิ้นสุด</label>
                      <input
                        type="date"
                        value={editData.end_date || ""}
                        onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                      />
                    </div>
                  </>
                )}
                {editData.is_half_day && (
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่</label>
                    <input
                      type="date"
                      value={editData.start_date || ""}
                      onChange={(e) => setEditData({ ...editData, start_date: e.target.value, end_date: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                  <Textarea
                    value={editData.reason || ""}
                    onChange={(e) => setEditData({ ...editData, reason: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}

            {editModal.type === "wfh" && (
              <>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่</label>
                  <input
                    type="date"
                    value={editData.date || ""}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                  />
                </div>
                <div className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-lg">
                  <input
                    type="checkbox"
                    checked={editData.is_half_day || false}
                    onChange={(e) => setEditData({ ...editData, is_half_day: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-[14px] text-[#1d1d1f]">WFH ครึ่งวัน</label>
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                  <Textarea
                    value={editData.reason || ""}
                    onChange={(e) => setEditData({ ...editData, reason: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}

            {editModal.type === "late" && (
              <>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่</label>
                  <input
                    type="date"
                    value={editData.request_date || ""}
                    onChange={(e) => setEditData({ ...editData, request_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">จำนวนนาทีที่มาสาย</label>
                  <input
                    type="number"
                    value={editData.actual_late_minutes || 0}
                    onChange={(e) => setEditData({ ...editData, actual_late_minutes: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                  <Textarea
                    value={editData.reason || ""}
                    onChange={(e) => setEditData({ ...editData, reason: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}

            {editModal.type === "field_work" && (
              <>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">วันที่</label>
                  <input
                    type="date"
                    value={editData.date || ""}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">สถานที่</label>
                  <input
                    type="text"
                    value={editData.location || ""}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-[#e8e8ed] text-[15px]"
                    placeholder="ระบุสถานที่"
                  />
                </div>
                <div className="flex items-center gap-3 p-3 bg-[#f5f5f7] rounded-lg">
                  <input
                    type="checkbox"
                    checked={editData.is_half_day || false}
                    onChange={(e) => setEditData({ ...editData, is_half_day: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-[14px] text-[#1d1d1f]">ครึ่งวัน</label>
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">เหตุผล</label>
                  <Textarea
                    value={editData.reason || ""}
                    onChange={(e) => setEditData({ ...editData, reason: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => { setEditModal(null); setEditData({}); }} fullWidth>
                ยกเลิก
              </Button>
              <Button onClick={handleEdit} loading={processing} fullWidth>
                บันทึก
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal isOpen={!!cancelModal} onClose={() => setCancelModal(null)} title="ยกเลิกคำขอ">
        {cancelModal && (
          <div className="space-y-4">
            <div className="p-4 bg-[#f5f5f7] rounded-xl">
              <p className="text-[14px] font-medium text-[#1d1d1f]">
                {cancelModal.employeeName} - {typeConfig[cancelModal.type].label}
              </p>
              <p className="text-[13px] text-[#86868b]">{cancelModal.title}</p>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                เหตุผลการยกเลิก <span className="text-[#ff3b30]">*</span>
              </label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="เช่น: เผลอกดอนุมัติ, ข้อมูลไม่ถูกต้อง"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setCancelModal(null)} fullWidth>
                ยกเลิก
              </Button>
              <Button
                onClick={handleCancel}
                loading={processing}
                disabled={!cancelReason.trim()}
                fullWidth
                className="!bg-[#ff3b30] hover:!bg-[#e0352b]"
              >
                ยืนยันยกเลิก
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}

export default function RequestsManagementPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <RequestsManagementContent />
    </ProtectedRoute>
  );
}

