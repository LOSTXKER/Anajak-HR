/**
 * Request Actions Hook
 * =============================================
 * Hook for handling request actions: approve, reject, cancel, create, edit
 */

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  RequestItem,
  RequestType,
  Employee,
  CreateFormData,
  tableMap,
} from "@/lib/types/request";

interface UseRequestActionsOptions {
  employees: Employee[];
  onSuccess?: () => Promise<void>;
}

interface UseRequestActionsReturn {
  processing: boolean;
  handleApprove: (request: RequestItem, adminId: string) => Promise<boolean>;
  handleReject: (request: RequestItem, adminId: string) => Promise<boolean>;
  handleCancel: (
    request: RequestItem,
    adminId: string,
    cancelReason: string
  ) => Promise<boolean>;
  handleCreateRequest: (
    type: RequestType,
    formData: CreateFormData,
    adminId: string
  ) => Promise<boolean>;
  handleEditRequest: (
    request: RequestItem,
    editData: any,
    adminId: string
  ) => Promise<boolean>;
}

export function useRequestActions(
  options: UseRequestActionsOptions
): UseRequestActionsReturn {
  const { employees, onSuccess } = options;
  const [processing, setProcessing] = useState(false);

  // Send LINE notification helper
  const sendNotification = async (type: string, data: Record<string, unknown>) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  // Handle approve
  const handleApprove = useCallback(
    async (request: RequestItem, adminId: string): Promise<boolean> => {
      setProcessing(true);
      try {
        const updateData: Record<string, unknown> = {
          status: "approved",
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        };

        if (request.type === "ot") {
          updateData.approved_start_time = request.rawData.requested_start_time;
          updateData.approved_end_time = request.rawData.requested_end_time;
          const start = new Date(request.rawData.requested_start_time);
          const end = new Date(request.rawData.requested_end_time);
          updateData.approved_ot_hours =
            (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }

        const { error } = await supabase
          .from(tableMap[request.type])
          .update(updateData)
          .eq("id", request.id);

        if (error) throw error;

        // Send LINE notification
        const employee = employees.find((e) => e.id === request.employeeId);
        const employeeName = employee?.name || request.employeeName || "ไม่ระบุ";

        switch (request.type) {
          case "ot":
            sendNotification("ot_approval", {
              employeeName,
              date: request.rawData.request_date,
              startTime: request.rawData.requested_start_time,
              endTime: request.rawData.requested_end_time,
              approved: true,
            });
            break;
          case "leave":
            sendNotification("leave_approval", {
              employeeName,
              leaveType: request.rawData.leave_type,
              startDate: request.rawData.start_date,
              endDate: request.rawData.end_date,
              approved: true,
            });
            break;
          case "wfh":
            sendNotification("wfh_approval", {
              employeeName,
              date: request.rawData.date,
              approved: true,
            });
            break;
          case "late":
            sendNotification("late_approval", {
              employeeName,
              date: request.rawData.request_date,
              lateMinutes: request.rawData.actual_late_minutes,
              approved: true,
            });
            break;
          case "field_work":
            sendNotification("field_work_approval", {
              employeeName,
              date: request.rawData.date,
              location: request.rawData.location,
              approved: true,
            });
            break;
        }

        if (onSuccess) await onSuccess();
        return true;
      } catch (error) {
        console.error("Error approving request:", error);
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [employees, onSuccess]
  );

  // Handle reject
  const handleReject = useCallback(
    async (request: RequestItem, adminId: string): Promise<boolean> => {
      setProcessing(true);
      try {
        const { error } = await supabase
          .from(tableMap[request.type])
          .update({
            status: "rejected",
            approved_by: adminId,
            approved_at: new Date().toISOString(),
          })
          .eq("id", request.id);

        if (error) throw error;

        // Send LINE notification
        const employee = employees.find((e) => e.id === request.employeeId);
        const employeeName = employee?.name || request.employeeName || "ไม่ระบุ";

        switch (request.type) {
          case "ot":
            sendNotification("ot_approval", {
              employeeName,
              date: request.rawData.request_date,
              startTime: request.rawData.requested_start_time,
              endTime: request.rawData.requested_end_time,
              approved: false,
            });
            break;
          case "leave":
            sendNotification("leave_approval", {
              employeeName,
              leaveType: request.rawData.leave_type,
              startDate: request.rawData.start_date,
              endDate: request.rawData.end_date,
              approved: false,
            });
            break;
          case "wfh":
            sendNotification("wfh_approval", {
              employeeName,
              date: request.rawData.date,
              approved: false,
            });
            break;
          case "late":
            sendNotification("late_approval", {
              employeeName,
              date: request.rawData.request_date,
              lateMinutes: request.rawData.actual_late_minutes,
              approved: false,
            });
            break;
          case "field_work":
            sendNotification("field_work_approval", {
              employeeName,
              date: request.rawData.date,
              location: request.rawData.location,
              approved: false,
            });
            break;
        }

        if (onSuccess) await onSuccess();
        return true;
      } catch (error) {
        console.error("Error rejecting request:", error);
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [employees, onSuccess]
  );

  // Handle cancel
  const handleCancel = useCallback(
    async (
      request: RequestItem,
      adminId: string,
      cancelReason: string
    ): Promise<boolean> => {
      if (!cancelReason.trim()) return false;

      setProcessing(true);
      try {
        const { error } = await supabase
          .from(tableMap[request.type])
          .update({
            status: "cancelled",
            cancelled_by: adminId,
            cancelled_at: new Date().toISOString(),
            cancel_reason: cancelReason.trim(),
          })
          .eq("id", request.id);

        if (error) throw error;

        if (onSuccess) await onSuccess();
        return true;
      } catch (error) {
        console.error("Error cancelling request:", error);
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [onSuccess]
  );

  // Handle create request
  const handleCreateRequest = useCallback(
    async (
      type: RequestType,
      formData: CreateFormData,
      adminId: string
    ): Promise<boolean> => {
      if (!formData.employeeId) return false;

      setProcessing(true);
      try {
        const approvalData = {
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        };

        switch (type) {
          case "ot": {
            const startDateTime = new Date(
              `${formData.otDate}T${formData.otStartTime}:00`
            );
            const endDateTime = new Date(
              `${formData.otDate}T${formData.otEndTime}:00`
            );
            const otHours =
              (endDateTime.getTime() - startDateTime.getTime()) /
              (1000 * 60 * 60);

            const emp = employees.find((e) => e.id === formData.employeeId);
            const baseSalary = emp?.base_salary || 0;
            let otAmount = null;
            if (baseSalary > 0) {
              const hourlyRate = baseSalary / 30 / 8;
              otAmount =
                Math.round(otHours * hourlyRate * formData.otRate * 100) / 100;
            }

            const insertData: any = {
              employee_id: formData.employeeId,
              request_date: formData.otDate,
              requested_start_time: startDateTime.toISOString(),
              requested_end_time: endDateTime.toISOString(),
              approved_start_time: startDateTime.toISOString(),
              approved_end_time: endDateTime.toISOString(),
              approved_ot_hours: Math.round(otHours * 100) / 100,
              ot_type: formData.otType,
              ot_rate: formData.otRate,
              reason: formData.reason,
              ...approvalData,
            };

            if (formData.otIsCompleted) {
              insertData.status = "completed";
              insertData.actual_start_time = startDateTime.toISOString();
              insertData.actual_end_time = endDateTime.toISOString();
              insertData.actual_ot_hours = Math.round(otHours * 100) / 100;
              insertData.ot_amount = otAmount;
            } else {
              insertData.status = "approved";
            }

            const { error } = await supabase
              .from("ot_requests")
              .insert(insertData);
            if (error) throw error;
            break;
          }

          case "leave": {
            const { error } = await supabase.from("leave_requests").insert({
              employee_id: formData.employeeId,
              leave_type: formData.leaveType,
              start_date: formData.leaveStartDate,
              end_date: formData.leaveEndDate,
              is_half_day: formData.leaveIsHalfDay,
              reason: formData.reason,
              status: "approved",
              ...approvalData,
            });
            if (error) throw error;
            break;
          }

          case "wfh": {
            const { error } = await supabase.from("wfh_requests").insert({
              employee_id: formData.employeeId,
              date: formData.wfhDate,
              is_half_day: formData.wfhIsHalfDay,
              reason: formData.reason,
              status: "approved",
              ...approvalData,
            });
            if (error) throw error;
            break;
          }

          case "late": {
            const { error } = await supabase.from("late_requests").insert({
              employee_id: formData.employeeId,
              request_date: formData.lateDate,
              actual_late_minutes: formData.lateMinutes,
              reason: formData.reason,
              status: "approved",
              ...approvalData,
            });
            if (error) throw error;
            break;
          }

          case "field_work": {
            if (!formData.fieldWorkLocation.trim()) return false;
            const { error } = await supabase.from("field_work_requests").insert({
              employee_id: formData.employeeId,
              date: formData.fieldWorkDate,
              is_half_day: formData.fieldWorkIsHalfDay,
              location: formData.fieldWorkLocation.trim(),
              reason: formData.reason,
              status: "approved",
              ...approvalData,
            });
            if (error) throw error;
            break;
          }
        }

        if (onSuccess) await onSuccess();
        return true;
      } catch (error) {
        console.error("Error creating request:", error);
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [employees, onSuccess]
  );

  // Handle edit request
  const handleEditRequest = useCallback(
    async (
      request: RequestItem,
      editData: any,
      adminId: string
    ): Promise<boolean> => {
      setProcessing(true);
      try {
        let updateData: any = {};

        switch (request.type) {
          case "ot":
            const startDateTime = `${request.rawData.request_date}T${editData.requested_start_time}:00`;
            const endDateTime = `${request.rawData.request_date}T${editData.requested_end_time}:00`;
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
              actual_late_minutes: editData.actual_late_minutes,
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
          .from(tableMap[request.type])
          .update(updateData)
          .eq("id", request.id);

        if (error) throw error;

        if (onSuccess) await onSuccess();
        return true;
      } catch (error) {
        console.error("Error editing request:", error);
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [onSuccess]
  );

  return {
    processing,
    handleApprove,
    handleReject,
    handleCancel,
    handleCreateRequest,
    handleEditRequest,
  };
}
