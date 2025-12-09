"use client";

import { useState, useRef, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { uploadAttendancePhoto } from "@/lib/utils/upload-photo";
import { 
  Camera, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Play,
  Calendar,
  PartyPopper,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { isHoliday } from "@/lib/utils/holiday";

interface OTRequest {
  id: string;
  employee_id: string;
  request_date: string;
  requested_start_time: string;
  requested_end_time: string;
  approved_start_time: string | null;
  approved_end_time: string | null;
  reason: string;
  status: string;
  before_photo_url: string | null;
  actual_start_time: string | null;
  ot_type: string;
}

function OTStartContent({ id }: { id: string }) {
  const { employee } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [otRequest, setOtRequest] = useState<OTRequest | null>(null);
  const [fetchingOT, setFetchingOT] = useState(true);
  const [holidayInfo, setHolidayInfo] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [checkingRequirements, setCheckingRequirements] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchOTRequest();
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Check holiday and attendance after OT request is loaded
  useEffect(() => {
    if (otRequest && employee) {
      checkRequirements();
    }
  }, [otRequest, employee]);

  const fetchOTRequest = async () => {
    try {
      const { data, error } = await supabase
        .from("ot_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setOtRequest(data);
    } catch (err) {
      setError("ไม่พบคำขอ OT นี้");
    } finally {
      setFetchingOT(false);
    }
  };

  const checkRequirements = async () => {
    if (!otRequest || !employee) return;
    setCheckingRequirements(true);

    try {
      // Check if OT date is a holiday
      const holiday = await isHoliday(otRequest.request_date, employee.branch_id || undefined);
      setHolidayInfo(holiday);

      // Check if employee has checked in today (for non-holiday OT)
      const { data: attendance } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("work_date", otRequest.request_date)
        .single();

      setTodayAttendance(attendance);
    } catch (err) {
      console.error("Error checking requirements:", err);
    } finally {
      setCheckingRequirements(false);
    }
  };

  // Check if it's the correct day
  const isCorrectDay = () => {
    if (!otRequest) return false;
    const today = new Date().toISOString().split("T")[0];
    return otRequest.request_date <= today; // Can start on the day or after (for past dates)
  };

  // Check if can start OT
  const canStartOT = () => {
    if (!otRequest || otRequest.status !== "approved") return false;
    if (otRequest.actual_start_time) return false;
    
    // Check if it's the correct day first
    if (!isCorrectDay()) return false;
    
    // If it's a holiday, can start without check-in
    if (holidayInfo) return true;
    
    // If OT type is holiday, can start without check-in
    if (otRequest.ot_type === "holiday") return true;
    
    // For normal OT, must have checked in first
    if (!todayAttendance?.clock_in_time) return false;
    
    return true;
  };

  const getRequirementMessage = () => {
    // Check date first
    if (!isCorrectDay()) {
      return {
        type: "wrong_date",
        message: `❌ ยังไม่ถึงวัน OT (${format(new Date(otRequest?.request_date || ""), "d MMMM yyyy", { locale: th })})`,
        canProceed: false,
      };
    }

    if (holidayInfo || otRequest?.ot_type === "holiday") {
      return {
        type: "holiday",
        message: `🎉 OT วันหยุด (${holidayInfo?.name || "วันหยุด"}) - ไม่ต้องเช็คอินก่อน`,
        canProceed: true,
      };
    }
    
    if (!todayAttendance?.clock_in_time) {
      return {
        type: "no_checkin",
        message: "❌ กรุณาเช็คอินก่อนเริ่มทำ OT",
        canProceed: false,
      };
    }

    if (!todayAttendance?.clock_out_time) {
      return {
        type: "no_checkout",
        message: "⚠️ แนะนำให้เช็คเอาท์ก่อนเริ่ม OT (หรือเริ่มได้เลยถ้าต่อเนื่อง)",
        canProceed: true,
      };
    }

    return {
      type: "ready",
      message: "✅ พร้อมเริ่ม OT",
      canProceed: true,
    };
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("ไม่สามารถเข้าถึงกล้องได้");
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    setPhoto(canvas.toDataURL("image/jpeg", 0.8));
  };

  const handleStartOT = async () => {
    if (!photo || !employee || !otRequest) return;

    // Check requirements
    const requirement = getRequirementMessage();
    if (!requirement.canProceed) {
      setError(requirement.message);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Validate OT status
      if (otRequest.status !== "approved") {
        setError("OT นี้ยังไม่ได้รับการอนุมัติ");
        setLoading(false);
        return;
      }

      if (otRequest.actual_start_time) {
        setError("คุณได้เริ่ม OT นี้ไปแล้ว");
        setLoading(false);
        return;
      }

      // Upload photo
      const photoUrl = await uploadAttendancePhoto(photo, employee.id, "ot-before");
      if (!photoUrl) {
        setError("ไม่สามารถอัปโหลดรูปภาพได้");
        setLoading(false);
        return;
      }

      const now = new Date();

      // For holiday OT without attendance, create one automatically
      if ((holidayInfo || otRequest.ot_type === "holiday") && !todayAttendance) {
        const { error: attendanceError } = await supabase
          .from("attendance_logs")
          .insert({
            employee_id: employee.id,
            work_date: otRequest.request_date,
            clock_in_time: now.toISOString(),
            clock_in_photo_url: photoUrl,
            status: "holiday", // Mark as holiday work
            work_mode: "onsite",
            note: `OT วันหยุด: ${holidayInfo?.name || "วันหยุด"}`,
            is_late: false,
          });

        if (attendanceError) {
          console.error("Error creating holiday attendance:", attendanceError);
        }
      }

      // Update OT request
      const { error: updateError } = await supabase
        .from("ot_requests")
        .update({
          actual_start_time: now.toISOString(),
          before_photo_url: photoUrl,
          ot_type: holidayInfo ? "holiday" : otRequest.ot_type || "normal",
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Send LINE notification
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "ot_start",
            data: {
              employeeName: employee.name,
              date: otRequest.request_date,
              time: now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }),
              isHoliday: !!holidayInfo,
            },
          }),
        });
      } catch (notifyError) {
        console.error("Notification error:", notifyError);
      }

      setSuccess(true);
      stopCamera();
      setTimeout(() => router.push("/history"), 2000);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingOT) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!otRequest) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-[#ff3b30] mx-auto mb-4" />
          <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-2">ไม่พบคำขอ OT</h2>
          <Link href="/history" className="text-[#0071e3]">
            กลับไปหน้าประวัติ
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 bg-[#ff9500] rounded-full flex items-center justify-center mx-auto mb-6">
            <Play className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-2">
            เริ่ม OT สำเร็จ
          </h2>
          <p className="text-[17px] text-[#86868b]">
            บันทึกเวลาเริ่มทำ OT เรียบร้อยแล้ว
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      {/* Header */}
      <header className="sticky top-0 z-50 apple-glass border-b border-[#d2d2d7]/30">
        <div className="max-w-[600px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link href="/history" className="flex items-center gap-2 text-[#0071e3]">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[15px]">กลับ</span>
          </Link>
          <span className="text-[15px] font-medium text-[#1d1d1f]">เริ่ม OT</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-6 py-8">
        {/* Time Display */}
        <div className="text-center mb-6">
          <p className="text-[48px] font-light text-[#1d1d1f] tracking-tight">
            {currentTime.toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </p>
          <p className="text-[15px] text-[#86868b]">
            {currentTime.toLocaleDateString("th-TH", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>

        {/* OT Info */}
        <Card elevated className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="success">อนุมัติแล้ว</Badge>
            {(holidayInfo || otRequest.ot_type === "holiday") && (
              <Badge variant="warning">OT วันหยุด (2x)</Badge>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
              <Calendar className="w-4 h-4" />
              {format(new Date(otRequest.request_date), "d MMMM yyyy", { locale: th })}
            </div>
            <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
              <Clock className="w-4 h-4" />
              เวลาที่อนุมัติ: {format(new Date(otRequest.approved_start_time || otRequest.requested_start_time), "HH:mm")} - {format(new Date(otRequest.approved_end_time || otRequest.requested_end_time), "HH:mm")} น.
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#e8e8ed]">
            <p className="text-[13px] text-[#86868b]">
              <span className="font-medium text-[#1d1d1f]">เหตุผล:</span> {otRequest.reason}
            </p>
          </div>
        </Card>

        {/* Requirement Status */}
        {!checkingRequirements && (
          <div className={`mb-6 p-4 rounded-xl ${
            getRequirementMessage().canProceed 
              ? holidayInfo 
                ? "bg-[#ff9500]/10 border border-[#ff9500]/30"
                : "bg-[#34c759]/10 border border-[#34c759]/30"
              : "bg-[#ff3b30]/10 border border-[#ff3b30]/30"
          }`}>
            <div className="flex items-center gap-3">
              {holidayInfo ? (
                <PartyPopper className="w-5 h-5 text-[#ff9500]" />
              ) : getRequirementMessage().canProceed ? (
                <CheckCircle className="w-5 h-5 text-[#34c759]" />
              ) : (
                <AlertCircle className="w-5 h-5 text-[#ff3b30]" />
              )}
              <div>
                <p className={`text-[14px] font-medium ${
                  getRequirementMessage().canProceed 
                    ? holidayInfo ? "text-[#ff9500]" : "text-[#34c759]"
                    : "text-[#ff3b30]"
                }`}>
                  {getRequirementMessage().message}
                </p>
                {holidayInfo && (
                  <p className="text-[13px] text-[#ff9500]/80 mt-1">
                    🎉 {holidayInfo.name} - ชั่วโมงทั้งหมดคิดเป็น OT rate 2x
                  </p>
                )}
                {!getRequirementMessage().canProceed && (
                  <Link href="/checkin" className="text-[13px] text-[#0071e3] hover:underline mt-1 inline-block">
                    ไปเช็คอิน →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Camera */}
        <Card elevated className="overflow-hidden mb-6">
          <div className="px-4 py-3 bg-[#f5f5f7] border-b border-[#e8e8ed]">
            <p className="text-[14px] font-medium text-[#1d1d1f]">📸 ถ่ายรูปก่อนเริ่ม OT</p>
          </div>
          <div className="aspect-[4/3] bg-black relative">
            {photo ? (
              <img src={photo} alt="Captured" className="w-full h-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            {!photo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 border-2 border-white/50 rounded-full" />
              </div>
            )}
          </div>
        </Card>

        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#e8e8ed] mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stream ? "bg-[#34c759]/10" : "bg-[#ff9500]/10"}`}>
              <Camera className={`w-5 h-5 ${stream ? "text-[#34c759]" : "text-[#ff9500]"}`} />
            </div>
            <p className="text-[15px] font-medium text-[#1d1d1f]">
              {stream ? "กล้องพร้อมใช้งาน" : "กำลังเปิดกล้อง..."}
            </p>
          </div>
          <div className={`w-3 h-3 rounded-full ${stream ? "bg-[#34c759]" : "bg-[#ff9500] animate-pulse"}`} />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-[#ff3b30]/10 rounded-xl mb-6">
            <AlertCircle className="w-5 h-5 text-[#ff3b30]" />
            <span className="text-[15px] text-[#ff3b30]">{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {!photo ? (
            <Button
              fullWidth
              onClick={capturePhoto}
              disabled={!stream}
              size="lg"
            >
              <Camera className="w-5 h-5" />
              ถ่ายรูป
            </Button>
          ) : (
            <>
              <Button
                fullWidth
                onClick={handleStartOT}
                loading={loading}
                disabled={!getRequirementMessage().canProceed || checkingRequirements}
                size="lg"
                className={getRequirementMessage().canProceed ? "bg-[#ff9500] hover:bg-[#e68600]" : ""}
              >
                <Play className="w-5 h-5" />
                {checkingRequirements ? "กำลังตรวจสอบ..." : "ยืนยันเริ่ม OT"}
              </Button>
              <Button
                fullWidth
                variant="secondary"
                onClick={() => setPhoto(null)}
                size="lg"
              >
                ถ่ายใหม่
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function OTStartPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <ProtectedRoute>
      <OTStartContent id={resolvedParams.id} />
    </ProtectedRoute>
  );
}

