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
  Info,
  MapPin,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { getOTRateForDate } from "@/lib/utils/holiday";

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
  const [dayInfo, setDayInfo] = useState<{
    rate: number;
    type: "holiday" | "weekend" | "workday";
    typeName: string;
    requireCheckin: boolean;
    holidayName?: string;
  } | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [checkingRequirements, setCheckingRequirements] = useState(true);
  
  // GPS state
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // Early start buffer (minutes)
  const [earlyStartBuffer, setEarlyStartBuffer] = useState(15);

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

  // Get GPS location
  const getLocation = () => {
    setGettingLocation(true);
    setLocationError("");
    
    if (!navigator.geolocation) {
      setLocationError("เบราว์เซอร์ไม่รองรับ GPS");
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGettingLocation(false);
      },
      (err) => {
        setLocationError("ไม่สามารถรับตำแหน่งได้: " + err.message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Auto get location on mount
  useEffect(() => {
    getLocation();
  }, []);

  const checkRequirements = async () => {
    if (!otRequest || !employee) return;
    setCheckingRequirements(true);

    try {
      // Fetch early start buffer setting
      const { data: bufferData } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "ot_early_start_buffer")
        .single();
      
      if (bufferData?.setting_value) {
        setEarlyStartBuffer(parseInt(bufferData.setting_value) || 15);
      }

      // Get day type info (holiday, weekend, or workday)
      const info = await getOTRateForDate(otRequest.request_date, employee.branch_id || undefined);
      setDayInfo(info);

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
    
    // Use settings to determine if check-in is required
    if (dayInfo && !dayInfo.requireCheckin) return true;
    
    // If OT type is holiday, can start without check-in (fallback)
    if (otRequest.ot_type === "holiday") return true;
    
    // Check-in required but not checked in
    if (!todayAttendance?.clock_in_time) return false;
    
    return true;
  };

  // Check if it's too early to start OT
  const canStartByTime = () => {
    if (!otRequest) return { canStart: false, message: "", minutesUntilStart: 0 };
    
    const now = new Date();
    const approvedStartTime = otRequest.approved_start_time || otRequest.requested_start_time;
    const startTime = new Date(approvedStartTime);
    
    // Calculate minutes until approved start time
    const diffMs = startTime.getTime() - now.getTime();
    const minutesUntilStart = Math.ceil(diffMs / (1000 * 60));
    
    // Allow starting if within the buffer period (e.g., 15 minutes before)
    if (minutesUntilStart > earlyStartBuffer) {
      const hours = Math.floor(minutesUntilStart / 60);
      const mins = minutesUntilStart % 60;
      const timeStr = hours > 0 ? `${hours} ชม. ${mins} นาที` : `${mins} นาที`;
      return {
        canStart: false,
        message: `⏳ ยังเร็วเกินไป อีก ${timeStr} ถึงเริ่ม OT ได้\n(เริ่มได้ก่อน ${earlyStartBuffer} นาที)`,
        minutesUntilStart,
      };
    }
    
    return { canStart: true, message: "", minutesUntilStart };
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

    // Check time - prevent starting too early
    const timeCheck = canStartByTime();
    if (!timeCheck.canStart) {
      return {
        type: "too_early",
        message: timeCheck.message,
        canProceed: false,
      };
    }

    // Check based on day type
    if (dayInfo) {
      // Holiday or weekend - no check-in required based on settings
      if (!dayInfo.requireCheckin) {
        const emoji = dayInfo.type === "holiday" ? "🎉" : dayInfo.type === "weekend" ? "🌅" : "📋";
        return {
          type: dayInfo.type,
          message: `${emoji} ${dayInfo.typeName} (${dayInfo.rate}x) - ไม่ต้องเช็คอินก่อน`,
          canProceed: true,
        };
      }
    }
    
    // Check-in required
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
      message: `✅ พร้อมเริ่ม OT ${dayInfo ? `(${dayInfo.rate}x)` : ""}`,
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

    // Check GPS
    if (!location) {
      setError("กรุณาเปิด GPS และกดปุ่มรีเฟรชตำแหน่ง");
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
      const isNonWorkday = dayInfo && (dayInfo.type === "holiday" || dayInfo.type === "weekend");

      // For holiday/weekend OT without attendance, create one automatically
      if ((isNonWorkday || otRequest.ot_type === "holiday") && !todayAttendance) {
        const { error: attendanceError } = await supabase
          .from("attendance_logs")
          .insert({
            employee_id: employee.id,
            work_date: otRequest.request_date,
            clock_in_time: now.toISOString(),
            clock_in_photo_url: photoUrl,
            clock_in_gps_lat: location.lat,
            clock_in_gps_lng: location.lng,
            status: dayInfo?.type || "holiday", // Mark day type
            work_mode: "onsite",
            note: `OT ${dayInfo?.typeName || "วันหยุด"}`,
            is_late: false,
          });

        if (attendanceError) {
          console.error("Error creating attendance:", attendanceError);
        }
      }

      // Update OT request with GPS
      const { error: updateError } = await supabase
        .from("ot_requests")
        .update({
          actual_start_time: now.toISOString(),
          before_photo_url: photoUrl,
          start_gps_lat: location.lat,
          start_gps_lng: location.lng,
          ot_type: dayInfo?.type || otRequest.ot_type || "normal",
          ot_rate: dayInfo?.rate || 1.5,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Send LINE notification with GPS
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
              dayType: dayInfo?.type || "workday",
              otRate: dayInfo?.rate || 1.5,
              gpsLat: location.lat,
              gpsLng: location.lng,
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
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant="success">อนุมัติแล้ว</Badge>
            {dayInfo && (
              <Badge variant={
                dayInfo.type === "holiday" ? "danger" :
                dayInfo.type === "weekend" ? "warning" : "info"
              }>
                {dayInfo.type === "holiday" ? "🎉 วันหยุดนักขัตฤกษ์" :
                 dayInfo.type === "weekend" ? "🌅 วันหยุดสุดสัปดาห์" : "📋 วันทำงานปกติ"} ({dayInfo.rate}x)
              </Badge>
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
              ? dayInfo && (dayInfo.type === "holiday" || dayInfo.type === "weekend")
                ? dayInfo.type === "holiday" ? "bg-[#ff3b30]/10 border border-[#ff3b30]/30" : "bg-[#ff9500]/10 border border-[#ff9500]/30"
                : "bg-[#34c759]/10 border border-[#34c759]/30"
              : "bg-[#ff3b30]/10 border border-[#ff3b30]/30"
          }`}>
            <div className="flex items-center gap-3">
              {dayInfo?.type === "holiday" ? (
                <PartyPopper className="w-5 h-5 text-[#ff3b30]" />
              ) : dayInfo?.type === "weekend" ? (
                <PartyPopper className="w-5 h-5 text-[#ff9500]" />
              ) : getRequirementMessage().canProceed ? (
                <CheckCircle className="w-5 h-5 text-[#34c759]" />
              ) : (
                <AlertCircle className="w-5 h-5 text-[#ff3b30]" />
              )}
              <div>
                <p className={`text-[14px] font-medium ${
                  getRequirementMessage().canProceed 
                    ? dayInfo?.type === "holiday" ? "text-[#ff3b30]" 
                      : dayInfo?.type === "weekend" ? "text-[#ff9500]" 
                      : "text-[#34c759]"
                    : "text-[#ff3b30]"
                }`}>
                  {getRequirementMessage().message}
                </p>
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

        {/* Camera & GPS Status */}
        <div className="space-y-3 mb-6">
          {/* Camera Status */}
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#e8e8ed]">
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

          {/* GPS Status */}
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#e8e8ed]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${location ? "bg-[#34c759]/10" : locationError ? "bg-[#ff3b30]/10" : "bg-[#ff9500]/10"}`}>
                {gettingLocation ? (
                  <Loader2 className="w-5 h-5 text-[#ff9500] animate-spin" />
                ) : (
                  <MapPin className={`w-5 h-5 ${location ? "text-[#34c759]" : locationError ? "text-[#ff3b30]" : "text-[#ff9500]"}`} />
                )}
              </div>
              <div>
                <p className={`text-[15px] font-medium ${location ? "text-[#1d1d1f]" : locationError ? "text-[#ff3b30]" : "text-[#1d1d1f]"}`}>
                  {gettingLocation ? "กำลังหาตำแหน่ง..." : location ? "ตำแหน่ง GPS พร้อม" : locationError || "รอรับตำแหน่ง"}
                </p>
                {location && (
                  <p className="text-[12px] text-[#86868b]">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!location && !gettingLocation && (
                <button
                  onClick={getLocation}
                  className="text-[13px] text-[#0071e3] hover:underline"
                >
                  รีเฟรช
                </button>
              )}
              <div className={`w-3 h-3 rounded-full ${location ? "bg-[#34c759]" : locationError ? "bg-[#ff3b30]" : "bg-[#ff9500] animate-pulse"}`} />
            </div>
          </div>
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

