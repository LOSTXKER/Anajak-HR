"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  UserCheck,
  UserX,
  Clock,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface PendingEmployee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  account_status: string;
  created_at: string;
}

function ApprovalsContent() {
  const { employee } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingEmployees, setPendingEmployees] = useState<PendingEmployee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<PendingEmployee | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingEmployees();
  }, []);

  const fetchPendingEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("account_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingEmployees(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (employeeId: string) => {
    if (!employee?.id) return;
    setProcessing(true);
    
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          account_status: "approved",
          approved_by: employee.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", employeeId);

      if (error) throw error;

      toast.success("สำเร็จ", "อนุมัติบัญชีพนักงานแล้ว");
      fetchPendingEmployees();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาด", error.message || "ไม่สามารถอนุมัติได้");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedEmployee || !employee?.id) return;
    if (!rejectionReason.trim()) {
      toast.error("กรุณาระบุเหตุผล", "ต้องระบุเหตุผลในการปฏิเสธ");
      return;
    }
    
    setProcessing(true);
    
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          account_status: "rejected",
          approved_by: employee.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedEmployee.id);

      if (error) throw error;

      toast.success("สำเร็จ", "ปฏิเสธบัญชีพนักงานแล้ว");
      setShowRejectModal(false);
      setSelectedEmployee(null);
      setRejectionReason("");
      fetchPendingEmployees();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("เกิดข้อผิดพลาด", error.message || "ไม่สามารถปฏิเสธได้");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="อนุมัติบัญชี">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="อนุมัติบัญชีพนักงาน"
      description={`มี ${pendingEmployees.length} คำขอรออนุมัติ`}
    >
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card elevated>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#ff9500] rounded-2xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[13px] text-[#86868b] uppercase tracking-wide">
                รออนุมัติ
              </p>
              <p className="text-[28px] font-semibold text-[#1d1d1f]">
                {pendingEmployees.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Employees List */}
      {pendingEmployees.length === 0 ? (
        <Card elevated>
          <div className="text-center py-16">
            <UserCheck className="w-16 h-16 text-[#86868b] mx-auto mb-4" />
            <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-2">
              ไม่มีคำขอรออนุมัติ
            </h3>
            <p className="text-[15px] text-[#86868b]">
              ทุกบัญชีได้รับการอนุมัติแล้ว
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingEmployees.map((emp) => (
            <Card key={emp.id} elevated>
              <div className="flex items-start gap-4 mb-4">
                <Avatar name={emp.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-1">
                    {emp.name}
                  </h3>
                  <Badge variant="warning">รออนุมัติ</Badge>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
                  <Mail className="w-4 h-4 text-[#86868b]" />
                  {emp.email}
                </div>
                <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
                  <Phone className="w-4 h-4 text-[#86868b]" />
                  {emp.phone}
                </div>
                <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
                  <Clock className="w-4 h-4 text-[#86868b]" />
                  สมัครเมื่อ {format(new Date(emp.created_at), "d MMM yyyy, HH:mm", { locale: th })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(emp.id)}
                  disabled={processing}
                  className="flex-1"
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  อนุมัติ
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setShowRejectModal(true);
                  }}
                  disabled={processing}
                  className="flex-1"
                  icon={<XCircle className="w-4 h-4" />}
                >
                  ปฏิเสธ
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <Card className="max-w-[480px] w-full">
            <h3 className="text-[21px] font-semibold text-[#1d1d1f] mb-4">
              ปฏิเสธบัญชี
            </h3>
            <p className="text-[15px] text-[#86868b] mb-4">
              คุณกำลังปฏิเสธบัญชีของ <strong>{selectedEmployee.name}</strong>
            </p>
            
            <Textarea
              label="เหตุผลในการปฏิเสธ"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="ระบุเหตุผลในการปฏิเสธ..."
              rows={4}
              required
            />

            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedEmployee(null);
                  setRejectionReason("");
                }}
                fullWidth
              >
                ยกเลิก
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                loading={processing}
                fullWidth
              >
                ยืนยันปฏิเสธ
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}

export default function ApprovalsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <ApprovalsContent />
    </ProtectedRoute>
  );
}

