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
  Square,
  Calendar,
  Timer,
  MapPin,
  Loader2
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { th } from "date-fns/locale";
import { processOTGamification } from "@/lib/services/gamification.service";

interface OTRequest {
  id: string;
  employee_id: string;
  request_date: string;
  requested_start_time: string;
  requested_end_time: string;
  approved_start_time: string | null;
  approved_end_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  reason: string;
  status: string;
  before_photo_url: string | null;
  after_photo_url: string | null;
  ot_rate: number | null;
  ot_type: string | null;
}

function OTEndContent({ id }: { id: string }) {
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
  const [elapsedTime, setElapsedTime] = useState<string>("00:00");

  // GPS state
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (otRequest?.actual_start_time) {
        const minutes = differenceInMinutes(new Date(), new Date(otRequest.actual_start_time));
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        setElapsedTime(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [otRequest]);

  useEffect(() => {
    fetchOTRequest();
    startCamera();
    getLocation();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const fetchOTRequest = async () => {
    try {
      const { data, error } = await supabase
        .from("ot_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      setOtRequest(data);
    } catch (err) {
      setError("ไม่พบคำขอ OT นี้");
    } finally {
      setFetchingOT(false);
    }
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

  const handleEndOT = async () => {
    if (!photo || !employee || !otRequest) return;

    // Check GPS
    if (!location) {
      setError("กรุณาเปิด GPS และกดปุ่มรีเฟรชตำแหน่ง");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Validate OT status
      if (!otRequest.actual_start_time) {
        setError("กรุณาเริ่ม OT ก่อน");
        setLoading(false);
        return;
      }

      if (otRequest.actual_end_time) {
        setError("คุณได้จบ OT นี้ไปแล้ว");
        setLoading(false);
        return;
      }

      // Upload photo
      const photoUrl = await uploadAttendancePhoto(photo, employee.id, "ot-after");
      if (!photoUrl) {
        setError("ไม่สามารถอัปโหลดรูปภาพได้");
        setLoading(false);
        return;
      }

      const now = new Date();
      const startTime = new Date(otRequest.actual_start_time);
      const approvedEndTime = new Date(otRequest.approved_end_time || otRequest.requested_end_time);

      // Calculate actual OT hours
      // ถ้าจบหลังเวลาที่อนุมัติ → ใช้เวลาที่อนุมัติ
      // ถ้าจบก่อนเวลาที่อนุมัติ → ใช้เวลาจริง
      const effectiveEndTime = now > approvedEndTime ? approvedEndTime : now;
      const actualMinutes = differenceInMinutes(effectiveEndTime, startTime);
      const actualOTHours = Math.max(0, actualMinutes / 60);

      // Get OT rate from stored value (set during OT start)
      // ot_type can be: "holiday", "weekend", "workday"
      // ot_rate is the actual multiplier (1, 1.5, 2, etc.)
      let otRate = otRequest.ot_rate || 1.5; // Use stored rate from start OT

      // ดึงข้อมูลเงินเดือนและ settings
      const { data: empData } = await supabase
        .from("employees")
        .select("base_salary")
        .eq("id", employee.id)
        .maybeSingle();

      const { data: payrollSettingsData } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["hours_per_day", "days_per_month"]);

      const payrollSettings: Record<string, string> = {};
      (payrollSettingsData || []).forEach((s: { setting_key: string; setting_value: string }) => {
        payrollSettings[s.setting_key] = s.setting_value;
      });

      const baseSalary = empData?.base_salary || 0;
      const hoursPerDay = parseFloat(payrollSettings.hours_per_day || "8");
      const daysPerMonth = parseFloat(payrollSettings.days_per_month || "26");

      // Calculate OT amount
      let otAmount = null;
      if (baseSalary > 0) {
        const hourlyRate = baseSalary / daysPerMonth / hoursPerDay;
        otAmount = actualOTHours * hourlyRate * otRate;
      }

      // Update OT request with GPS
      const { error: updateError } = await supabase
        .from("ot_requests")
        .update({
          actual_end_time: now.toISOString(),
          after_photo_url: photoUrl,
          end_gps_lat: location.lat,
          end_gps_lng: location.lng,
          actual_ot_hours: Math.round(actualOTHours * 100) / 100,
          ot_amount: otAmount ? Math.round(otAmount * 100) / 100 : null,
          status: "completed",
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Send LINE notification with GPS
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "ot_end",
            data: {
              employeeName: employee.name,
              date: otRequest.request_date,
              time: now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }),
              hours: actualOTHours.toFixed(1),
              amount: otAmount ? otAmount.toFixed(0) : null,
              gpsLat: location.lat,
              gpsLng: location.lng,
            },
          }),
        });
      } catch (notifyError) {
        console.error("Notification error:", notifyError);
      }

      // Gamification (fire-and-forget)
      processOTGamification(employee.id, id)
        .catch((err) => console.error("Gamification error:", err));

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

  if (!otRequest.actual_start_time) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-[#ff9500] mx-auto mb-4" />
          <h2 className="text-[20px] font-semibold text-[#1d1d1f] mb-2">ยังไม่ได้เริ่ม OT</h2>
          <p className="text-[#86868b] mb-4">กรุณากดเริ่ม OT ก่อน</p>
          <Link href={`/ot/start/${id}`} className="text-[#0071e3]">
            ไปหน้าเริ่ม OT
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 bg-[#34c759] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-2">
            จบ OT สำเร็จ
          </h2>
          <p className="text-[17px] text-[#86868b]">
            บันทึกเวลาเสร็จสิ้นการทำ OT เรียบร้อยแล้ว
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] pt-safe">
      <main className="max-w-[600px] mx-auto px-4 pt-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/ot"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-[#86868b]" />
          </Link>
          <h1 className="text-[28px] font-bold text-[#1d1d1f]">จบ OT</h1>
        </div>

        {/* Elapsed Time Display */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff9500]/10 rounded-full mb-3">
            <Timer className="w-5 h-5 text-[#ff9500]" />
            <span className="text-[14px] font-medium text-[#ff9500]">กำลังทำ OT</span>
          </div>
          <p className="text-[48px] font-light text-[#ff9500] tracking-tight">
            {elapsedTime}
          </p>
          <p className="text-[15px] text-[#86868b]">
            ชั่วโมง:นาที (ทำไปแล้ว)
          </p>
        </div>

        {/* OT Info */}
        <Card elevated className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="warning">กำลังทำ OT</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
              <Calendar className="w-4 h-4" />
              {format(new Date(otRequest.request_date), "d MMMM yyyy", { locale: th })}
            </div>
            <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
              <Clock className="w-4 h-4" />
              เริ่มเวลา: {format(new Date(otRequest.actual_start_time), "HH:mm")} น.
            </div>
            <div className="flex items-center gap-2 text-[14px] text-[#6e6e73]">
              <Clock className="w-4 h-4" />
              อนุมัติถึง: {format(new Date(otRequest.approved_end_time || otRequest.requested_end_time), "HH:mm")} น.
            </div>
          </div>
          {otRequest.before_photo_url && (
            <div className="mt-3 pt-3 border-t border-[#e8e8ed]">
              <p className="text-[13px] text-[#86868b] mb-2">รูปก่อนเริ่ม OT:</p>
              <img
                src={otRequest.before_photo_url}
                alt="Before OT"
                className="w-20 h-20 object-cover rounded-lg"
              />
            </div>
          )}
        </Card>

        {/* Camera */}
        <Card elevated className="overflow-hidden mb-6">
          <div className="px-4 py-3 bg-[#f5f5f7] border-b border-[#e8e8ed]">
            <p className="text-[14px] font-medium text-[#1d1d1f]">📸 ถ่ายรูปหลังจบ OT</p>
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
                onClick={handleEndOT}
                loading={loading}
                size="lg"
                variant="danger"
              >
                <Square className="w-5 h-5" />
                ยืนยันจบ OT
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

export default function OTEndPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <ProtectedRoute>
      <OTEndContent id={resolvedParams.id} />
    </ProtectedRoute>
  );
}

