"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { uploadAttendancePhoto } from "@/lib/utils/upload-photo";
import { isWithinRadius, formatDistance } from "@/lib/utils/geo";
import { Camera, MapPin, ArrowLeft, CheckCircle, AlertCircle, Navigation } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
}

function CheckinContent() {
  const { employee } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // ข้อมูลสาขาและการตรวจรัศมี
  const [branch, setBranch] = useState<Branch | null>(null);
  const [radiusCheck, setRadiusCheck] = useState<{ inRadius: boolean; distance: number } | null>(null);
  
  // ช่วงเวลาที่อนุญาต
  const [allowedTime, setAllowedTime] = useState({ checkinStart: "06:00", checkinEnd: "12:00" });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    startCamera();
    getLocation();
    fetchBranchAndSettings();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // เช็ครัศมีเมื่อมี location และ branch
  useEffect(() => {
    if (location && branch) {
      const result = isWithinRadius(
        location.lat,
        location.lng,
        branch.gps_lat,
        branch.gps_lng,
        branch.radius_meters
      );
      setRadiusCheck(result);
    }
  }, [location, branch]);

  const fetchBranchAndSettings = async () => {
    if (!employee?.branch_id) return;

    // ดึงข้อมูลสาขาและ settings พร้อมกัน
    const [branchRes, settingsRes] = await Promise.all([
      supabase
        .from("branches")
        .select("id, name, gps_lat, gps_lng, radius_meters")
        .eq("id", employee.branch_id)
        .single(),
      supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["checkin_time_start", "checkin_time_end"])
    ]);

    if (branchRes.data) {
      setBranch(branchRes.data);
    }
    
    if (settingsRes.data) {
      const settings: Record<string, string> = {};
      settingsRes.data.forEach((s: any) => {
        settings[s.setting_key] = s.setting_value;
      });
      setAllowedTime({
        checkinStart: settings.checkin_time_start || "06:00",
        checkinEnd: settings.checkin_time_end || "12:00",
      });
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

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setError("ไม่สามารถเข้าถึงตำแหน่งได้")
      );
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    setPhoto(canvas.toDataURL("image/jpeg", 0.8));
  };

  const handleCheckin = async () => {
    if (!photo || !location || !employee) return;

    // ตรวจสอบว่ามีสาขาหรือไม่
    if (!branch) {
      setError("คุณยังไม่ได้กำหนดสาขา กรุณาติดต่อ Admin");
      return;
    }

    // ตรวจสอบเวลาที่อนุญาต
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    const [startHour, startMinute] = allowedTime.checkinStart.split(":").map(Number);
    const [endHour, endMinute] = allowedTime.checkinEnd.split(":").map(Number);
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;
    
    if (currentTimeInMinutes < startTimeInMinutes || currentTimeInMinutes > endTimeInMinutes) {
      setError(
        `⚠️ ไม่สามารถเช็คอินนอกเวลาได้\n\n` +
        `เวลาที่อนุญาต: ${allowedTime.checkinStart} - ${allowedTime.checkinEnd} น.\n` +
        `หากต้องการทำงานนอกเวลา กรุณาขอ OT ก่อน`
      );
      return;
    }

    // บังคับตรวจสอบรัศมี
    if (radiusCheck && !radiusCheck.inRadius) {
      setError(`คุณอยู่นอกรัศมีที่อนุญาต (ห่าง ${formatDistance(radiusCheck.distance)} จากสาขา ${branch.name})`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const today = new Date().toISOString().split("T")[0];

      // Check if already checked in
      const { data: existing } = await supabase
        .from("attendance_logs")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("work_date", today)
        .single();

      if (existing) {
        setError("คุณได้เช็กอินวันนี้แล้ว");
        setLoading(false);
        return;
      }

      // อัปโหลดรูปภาพไปที่ Supabase Storage
      const photoUrl = await uploadAttendancePhoto(photo, employee.id, "checkin");
      if (!photoUrl) {
        setError("ไม่สามารถอัปโหลดรูปภาพได้");
        setLoading(false);
        return;
      }

      // ดึงค่า work_start_time และ late_threshold_minutes จาก settings
      const { data: settingsData } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["work_start_time", "late_threshold_minutes"]);

      const settingsMap: Record<string, string> = {};
      settingsData?.forEach((item: any) => {
        settingsMap[item.setting_key] = item.setting_value;
      });

      const workStartTime = settingsMap.work_start_time || "09:00";
      const lateThresholdMinutes = parseInt(settingsMap.late_threshold_minutes || "0");
      const [workStartHour, workStartMinute] = workStartTime.split(":").map(Number);

      // คำนวณสาย
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const workStartMinutes = workStartHour * 60 + workStartMinute;
      
      // สายต่อเมื่อเกิน threshold ที่กำหนด
      const minutesLate = currentMinutes - workStartMinutes;
      const isLate = minutesLate > lateThresholdMinutes;
      const lateMinutes = isLate ? minutesLate : 0;

      const { error: insertError } = await supabase
        .from("attendance_logs")
        .insert({
          employee_id: employee.id,
          work_date: today,
          clock_in_time: now.toISOString(),
          clock_in_gps_lat: location.lat,
          clock_in_gps_lng: location.lng,
          clock_in_photo_url: photoUrl,
          is_late: isLate,
          late_minutes: lateMinutes,
        });

      if (insertError) throw insertError;

      // ส่งแจ้งเตือน LINE (ไม่บล็อก UI)
      try {
        fetch("/api/checkin-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeName: employee.name,
            time: now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }),
            location: branch?.name || "สำนักงาน",
            isLate,
          }),
        }).catch((err) => console.error("Failed to send check-in notification:", err));
      } catch (notifyError) {
        console.error("Notification error:", notifyError);
      }

      setSuccess(true);
      stopCamera();
      setTimeout(() => router.push("/"), 2000);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 bg-[#34c759] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-2">
            เช็กอินสำเร็จ
          </h2>
          <p className="text-[17px] text-[#86868b]">
            บันทึกเวลาเข้างานเรียบร้อยแล้ว
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      {/* Header */}
      <header className="sticky top-0 z-50 apple-glass border-b border-[#d2d2d7]/30">
        <div className="max-w-[600px] mx-auto px-6 h-12 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-[#0071e3]">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[15px]">กลับ</span>
          </Link>
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-6 py-8">
        {/* Time Display */}
        <div className="text-center mb-8">
          <p className="text-[56px] font-light text-[#1d1d1f] tracking-tight">
            {currentTime.toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </p>
          <p className="text-[17px] text-[#86868b]">
            {currentTime.toLocaleDateString("th-TH", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Camera */}
        <Card elevated className="overflow-hidden mb-6">
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
                <div className="w-48 h-48 border-2 border-white/50 rounded-full" />
              </div>
            )}
          </div>
        </Card>

        {/* Status */}
        <div className="space-y-3 mb-6">
          {/* GPS Status */}
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#e8e8ed]">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  location ? "bg-[#34c759]/10" : "bg-[#ff9500]/10"
                }`}
              >
                <MapPin className={`w-5 h-5 ${location ? "text-[#34c759]" : "text-[#ff9500]"}`} />
              </div>
              <div>
                <p className="text-[15px] font-medium text-[#1d1d1f]">
                  {location ? "พบตำแหน่ง GPS" : "กำลังหาตำแหน่ง..."}
                </p>
                {location && (
                  <p className="text-[13px] text-[#86868b]">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
            <div
              className={`w-3 h-3 rounded-full ${location ? "bg-[#34c759]" : "bg-[#ff9500] animate-pulse"}`}
            />
          </div>

          {/* Radius Check Status */}
          {branch && radiusCheck && (
            <div
              className={`flex items-center justify-between p-4 rounded-xl border ${
                radiusCheck.inRadius
                  ? "bg-[#34c759]/10 border-[#34c759]/30"
                  : "bg-[#ff3b30]/10 border-[#ff3b30]/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    radiusCheck.inRadius ? "bg-[#34c759]/20" : "bg-[#ff3b30]/20"
                  }`}
                >
                  <Navigation
                    className={`w-5 h-5 ${radiusCheck.inRadius ? "text-[#34c759]" : "text-[#ff3b30]"}`}
                  />
                </div>
                <div>
                  <p
                    className={`text-[15px] font-medium ${
                      radiusCheck.inRadius ? "text-[#34c759]" : "text-[#ff3b30]"
                    }`}
                  >
                    {radiusCheck.inRadius ? "อยู่ในรัศมีที่อนุญาต ✓" : "อยู่นอกรัศมีที่อนุญาต ✗"}
                  </p>
                  <p className="text-[13px] text-[#86868b]">
                    📍 {branch.name} • ห่าง {formatDistance(radiusCheck.distance)} (รัศมี {branch.radius_meters} ม.)
                  </p>
                </div>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${
                  radiusCheck.inRadius ? "bg-[#34c759]" : "bg-[#ff3b30]"
                }`}
              />
            </div>
          )}

          {/* No Branch Warning */}
          {!branch && employee?.branch_id === null && (
            <div className="flex items-center gap-3 p-4 bg-[#ff9500]/10 rounded-xl border border-[#ff9500]/30">
              <AlertCircle className="w-5 h-5 text-[#ff9500]" />
              <div>
                <p className="text-[15px] font-medium text-[#ff9500]">ไม่ได้กำหนดสาขา</p>
                <p className="text-[13px] text-[#86868b]">
                  กรุณาติดต่อ Admin เพื่อกำหนดสาขาของคุณ
                </p>
              </div>
            </div>
          )}

          {/* Camera Status */}
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#e8e8ed]">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  stream ? "bg-[#34c759]/10" : "bg-[#ff9500]/10"
                }`}
              >
                <Camera className={`w-5 h-5 ${stream ? "text-[#34c759]" : "text-[#ff9500]"}`} />
              </div>
              <p className="text-[15px] font-medium text-[#1d1d1f]">
                {stream ? "กล้องพร้อมใช้งาน" : "กำลังเปิดกล้อง..."}
              </p>
            </div>
            <div
              className={`w-3 h-3 rounded-full ${stream ? "bg-[#34c759]" : "bg-[#ff9500] animate-pulse"}`}
            />
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
                onClick={handleCheckin}
                loading={loading}
                disabled={!location || !branch || (radiusCheck !== null && !radiusCheck.inRadius)}
                size="lg"
              >
                <CheckCircle className="w-5 h-5" />
                ยืนยันเช็กอิน
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

export default function CheckinPage() {
  return (
    <ProtectedRoute>
      <CheckinContent />
    </ProtectedRoute>
  );
}
