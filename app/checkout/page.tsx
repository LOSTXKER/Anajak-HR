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
import { Camera, MapPin, ArrowLeft, CheckCircle, AlertCircle, Clock, Navigation } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
}

function CheckoutContent() {
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
  const [todayLog, setTodayLog] = useState<any>(null);
  
  // ข้อมูลสาขาและการตรวจรัศมี
  const [branch, setBranch] = useState<Branch | null>(null);
  const [radiusCheck, setRadiusCheck] = useState<{ inRadius: boolean; distance: number } | null>(null);
  
  // ช่วงเวลาที่อนุญาต
  const [allowedTime, setAllowedTime] = useState({ checkoutStart: "15:00", checkoutEnd: "22:00" });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    startCamera();
    getLocation();
    checkTodayLog();
    fetchBranch();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee]);

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

  const fetchBranch = async () => {
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
        .in("setting_key", ["checkout_time_start", "checkout_time_end"])
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
        checkoutStart: settings.checkout_time_start || "15:00",
        checkoutEnd: settings.checkout_time_end || "22:00",
      });
    }
  };

  const checkTodayLog = async () => {
    if (!employee) return;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("attendance_logs")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("work_date", today)
      .single();
    setTodayLog(data);
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

  const handleCheckout = async () => {
    if (!photo || !location || !employee || !todayLog) return;

    setLoading(true);
    setError("");

    try {
      // ตรวจสอบว่าเช็คเอาท์แล้วหรือยัง
      if (todayLog.clock_out_time) {
        setError("คุณได้เช็คเอาท์วันนี้แล้ว");
        setLoading(false);
        return;
      }
      
      // ตรวจสอบเวลาที่อนุญาต
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      
      const [startHour, startMinute] = allowedTime.checkoutStart.split(":").map(Number);
      const [endHour, endMinute] = allowedTime.checkoutEnd.split(":").map(Number);
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;
      
      // ตรวจสอบว่าเป็น early checkout หรือไม่ (ก่อนเวลาปกติ)
      const isEarlyCheckout = currentTimeInMinutes < startTimeInMinutes;
      
      // ป้องกันการ checkout หลังเวลาที่กำหนด (เกินเวลาไป)
      if (currentTimeInMinutes > endTimeInMinutes) {
        setError(
          `⚠️ ไม่สามารถเช็คเอาท์ได้\n\n` +
          `เวลาที่อนุญาต: ${allowedTime.checkoutStart} - ${allowedTime.checkoutEnd} น.\n` +
          `หากต้องการทำงานนอกเวลา กรุณาขอ OT ก่อน`
        );
        setLoading(false);
        return;
      }

      // อัปโหลดรูปภาพไปที่ Supabase Storage
      const photoUrl = await uploadAttendancePhoto(photo, employee.id, "checkout");
      if (!photoUrl) {
        setError("ไม่สามารถอัปโหลดรูปภาพได้");
        setLoading(false);
        return;
      }

      // คำนวณชั่วโมงทำงาน (ใช้ now จากข้างบน)
      const clockIn = new Date(todayLog.clock_in_time);
      const totalHours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

      const { error: updateError } = await supabase
        .from("attendance_logs")
        .update({
          clock_out_time: now.toISOString(),
          clock_out_gps_lat: location.lat,
          clock_out_gps_lng: location.lng,
          clock_out_photo_url: photoUrl,
          total_hours: totalHours,
        })
        .eq("id", todayLog.id);

      if (updateError) throw updateError;

      // ถ้าเป็น Early Checkout → บันทึก anomaly และแจ้งเตือนแอดมิน
      if (isEarlyCheckout) {
        // บันทึก anomaly
        await supabase.from("attendance_anomalies").insert({
          attendance_log_id: todayLog.id,
          anomaly_type: "early_checkout",
          description: `พนักงานเช็คเอาท์ก่อนเวลา (${now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })}) เวลาปกติ ${allowedTime.checkoutStart} น.`,
          detected_at: now.toISOString(),
          original_value: allowedTime.checkoutStart,
          resolved: false,
        });

        // แจ้งเตือนแอดมินผ่าน LINE
        try {
          fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "early_checkout",
              data: {
                employeeName: employee.name,
                time: now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }),
                totalHours: totalHours,
                expectedTime: allowedTime.checkoutStart,
                location: branch?.name || "สำนักงาน",
              },
            }),
          }).catch((err) => console.error("Failed to send early checkout notification:", err));
        } catch (notifyError) {
          console.error("Early checkout notification error:", notifyError);
        }
      }

      // ส่งแจ้งเตือน LINE ปกติ (ไม่บล็อก UI)
      try {
        fetch("/api/checkout-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeName: employee.name,
            time: now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }),
            totalHours: totalHours,
            location: branch?.name || "สำนักงาน",
          }),
        }).catch((err) => console.error("Failed to send check-out notification:", err));
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
          <div className="w-20 h-20 bg-[#ff3b30] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-2">
            เช็กเอาท์สำเร็จ
          </h2>
          <p className="text-[17px] text-[#86868b]">
            บันทึกเวลาออกงานเรียบร้อยแล้ว
          </p>
        </div>
      </div>
    );
  }

  if (!todayLog) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#ff9500]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-[#ff9500]" />
          </div>
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-2">
            ยังไม่ได้เช็กอิน
          </h2>
          <p className="text-[17px] text-[#86868b] mb-8">
            กรุณาเช็กอินก่อนเช็กเอาท์
          </p>
          <Button onClick={() => router.push("/checkin")}>
            ไปหน้าเช็กอิน
          </Button>
        </div>
      </div>
    );
  }

  // ตรวจสอบว่าเช็คเอาท์แล้วหรือยัง
  if (todayLog.clock_out_time) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#34c759]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#34c759]" />
          </div>
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-2">
            เช็กเอาท์แล้ววันนี้
          </h2>
          <p className="text-[17px] text-[#86868b] mb-2">
            เช็กเอาท์เมื่อ {new Date(todayLog.clock_out_time).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })} น.
          </p>
          <p className="text-[15px] text-[#86868b] mb-8">
            ทำงานรวม {todayLog.total_hours?.toFixed(1) || 0} ชั่วโมง
          </p>
          <Button onClick={() => router.push("/")}>
            กลับหน้าหลัก
          </Button>
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
        <div className="text-center mb-6">
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
            })}
          </p>
        </div>

        {/* Check-in Info */}
        <Card elevated className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#34c759]/20 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <p className="text-[13px] text-[#86868b]">เช็กอินเมื่อ</p>
              <p className="text-[17px] font-medium text-[#1d1d1f]">
                {new Date(todayLog.clock_in_time).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })} น.
              </p>
            </div>
          </div>
        </Card>

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
                  : "bg-[#ff9500]/10 border-[#ff9500]/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    radiusCheck.inRadius ? "bg-[#34c759]/20" : "bg-[#ff9500]/20"
                  }`}
                >
                  <Navigation
                    className={`w-5 h-5 ${radiusCheck.inRadius ? "text-[#34c759]" : "text-[#ff9500]"}`}
                  />
                </div>
                <div>
                  <p
                    className={`text-[15px] font-medium ${
                      radiusCheck.inRadius ? "text-[#34c759]" : "text-[#ff9500]"
                    }`}
                  >
                    {radiusCheck.inRadius ? "อยู่ในรัศมีสาขา ✓" : "อยู่นอกรัศมีสาขา"}
                  </p>
                  <p className="text-[13px] text-[#86868b]">
                    📍 {branch.name} • ห่าง {formatDistance(radiusCheck.distance)}
                  </p>
                </div>
              </div>
            </div>
          )}
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
              variant="danger"
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
                variant="danger"
                onClick={handleCheckout}
                loading={loading}
                disabled={!location}
                size="lg"
              >
                <CheckCircle className="w-5 h-5" />
                ยืนยันเช็กเอาท์
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

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutContent />
    </ProtectedRoute>
  );
}
