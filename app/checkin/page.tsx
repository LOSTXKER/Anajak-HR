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
import { Camera, MapPin, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    startCamera();
    getLocation();
    return () => stopCamera();
  }, []);

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

      // Check late (after 9:00 AM)
      const now = new Date();
      const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);

      const { error: insertError } = await supabase
        .from("attendance_logs")
        .insert({
          employee_id: employee.id,
          work_date: today,
          clock_in_time: now.toISOString(),
          clock_in_gps_lat: location.lat,
          clock_in_gps_lng: location.lng,
          clock_in_photo_url: photoUrl, // ใช้ URL แทน base64
          is_late: isLate,
        });

      if (insertError) throw insertError;

      // ส่งแจ้งเตือน LINE (ไม่บล็อก UI)
      try {
        fetch("/api/checkin-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeName: employee.name,
            time: now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
            location: "สำนักงาน", // TODO: ดึงชื่อสาขาจาก branch_id
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
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                location ? "bg-[#34c759]" : "bg-[#ff9500]"
              }`}
            />
            <span className="text-[14px] text-[#6e6e73]">
              <MapPin className="w-4 h-4 inline mr-1" />
              {location ? "พบตำแหน่ง" : "กำลังหา..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                stream ? "bg-[#34c759]" : "bg-[#ff9500]"
              }`}
            />
            <span className="text-[14px] text-[#6e6e73]">
              <Camera className="w-4 h-4 inline mr-1" />
              {stream ? "กล้องพร้อม" : "กำลังเปิด..."}
            </span>
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
                disabled={!location}
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
