"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { uploadAttendancePhoto } from "@/lib/utils/upload-photo";
import { formatDistance } from "@/lib/utils/geo";
import { useCamera } from "@/lib/hooks/use-camera";
import { useLocation, BranchInfo } from "@/lib/hooks/use-location";
import { TIME_CONSTANTS, UI_DELAYS } from "@/lib/constants";
import {
  Camera, MapPin, ArrowLeft, CheckCircle, AlertCircle,
  Navigation, Calendar, Timer, RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { getDayType } from "@/lib/services/holiday.service";
import { processCheckinGamification } from "@/lib/services/gamification.service";

function CheckinContent() {
  const { employee } = useAuth();
  const router = useRouter();

  const { stream, photo, cameraError, startCamera, stopCamera, capturePhoto, clearPhoto, videoRef } = useCamera();
  const { location, gpsLoading, locationError, radiusCheck, getLocation, checkRadius } = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [allowedTime, setAllowedTime] = useState({ checkinStart: "06:00", checkinEnd: "12:00" });
  const [isRestDay, setIsRestDay] = useState(false);
  const [restDayName, setRestDayName] = useState("");
  const [hasApprovedOT, setHasApprovedOT] = useState(false);
  const [hasFieldWork, setHasFieldWork] = useState(false);
  const [hasWFH, setHasWFH] = useState(false);

  // Redirect admin accounts to admin panel
  useEffect(() => {
    if (employee?.role === "admin") {
      router.replace("/admin");
    }
  }, [employee, router]);

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), TIME_CONSTANTS.CLOCK_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  // Initialise camera, GPS and branch data
  useEffect(() => {
    startCamera();
    getLocation();
    fetchBranchAndSettings();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run radius check whenever location or branch changes
  useEffect(() => {
    if (location && branch) {
      checkRadius(location, branch);
    }
  }, [location, branch, checkRadius]);

  // Propagate camera errors into the shared error state
  useEffect(() => {
    if (cameraError) setError(cameraError);
  }, [cameraError]);

  // Propagate GPS errors into the shared error state
  useEffect(() => {
    if (locationError) setError(locationError);
  }, [locationError]);

  const fetchBranchAndSettings = async () => {
    if (!employee?.branch_id) return;
    const today = format(new Date(), "yyyy-MM-dd");

    const [branchRes, settingsRes, dayTypeRes, otRes, fieldWorkRes, wfhRes] = await Promise.all([
      supabase
        .from("branches")
        .select("id, name, gps_lat, gps_lng, radius_meters")
        .eq("id", employee.branch_id)
        .maybeSingle(),
      supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["checkin_time_start", "checkin_time_end"]),
      getDayType(today, employee.branch_id),
      supabase
        .from("ot_requests")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("request_date", today)
        .eq("status", "approved"),
      supabase
        .from("field_work_requests")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("date", today)
        .eq("status", "approved")
        .maybeSingle(),
      supabase
        .from("wfh_requests")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("date", today)
        .eq("status", "approved")
        .maybeSingle(),
    ]);

    if (branchRes.data) setBranch(branchRes.data);

    if (settingsRes.data) {
      const settings: Record<string, string> = {};
      settingsRes.data.forEach((s: any) => { settings[s.setting_key] = s.setting_value; });
      setAllowedTime({
        checkinStart: settings.checkin_time_start || "06:00",
        checkinEnd: settings.checkin_time_end || "12:00",
      });
    }

    if (dayTypeRes.type === "holiday") {
      setIsRestDay(true);
      setRestDayName(dayTypeRes.holidayName || "วันหยุดนักขัตฤกษ์");
    } else if (dayTypeRes.type === "weekend") {
      setIsRestDay(true);
      setRestDayName("วันหยุดสุดสัปดาห์");
    }

    if (otRes.data && otRes.data.length > 0) setHasApprovedOT(true);
    if (fieldWorkRes.data) setHasFieldWork(true);
    if (wfhRes.data) setHasWFH(true);
  };

  const handleCheckin = async () => {
    if (!photo || !location || !employee) return;

    if (!branch) {
      setError("คุณยังไม่ได้กำหนดสาขา กรุณาติดต่อ Admin");
      return;
    }

    // Validate allowed time window (Bangkok timezone)
    const now = new Date();
    const bangkokNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const currentTimeInMinutes = bangkokNow.getHours() * 60 + bangkokNow.getMinutes();
    const [startHour, startMinute] = allowedTime.checkinStart.split(":").map(Number);
    const [endHour, endMinute] = allowedTime.checkinEnd.split(":").map(Number);
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    if (currentTimeInMinutes < startTimeInMinutes || currentTimeInMinutes > endTimeInMinutes) {
      setError(
        `ไม่สามารถเช็คอินนอกเวลาได้\n\n` +
        `เวลาที่อนุญาต: ${allowedTime.checkinStart} - ${allowedTime.checkinEnd} น.\n` +
        `หากต้องการทำงานนอกเวลา กรุณาขอ OT ก่อน`
      );
      return;
    }

    const today = format(new Date(), "yyyy-MM-dd");

    if (!hasFieldWork && !hasWFH && radiusCheck && !radiusCheck.inRadius) {
      setError(`คุณอยู่นอกรัศมีที่อนุญาต (ห่าง ${formatDistance(radiusCheck.distance)} จากสาขา ${branch.name})`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const photoUrl = await uploadAttendancePhoto(photo, employee.id, "checkin");
      if (!photoUrl) {
        setError("ไม่สามารถอัปโหลดรูปภาพได้");
        return;
      }

      const { data: settingsData } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["work_start_time", "late_threshold_minutes"]);

      const settingsMap: Record<string, string> = {};
      settingsData?.forEach((item: any) => { settingsMap[item.setting_key] = item.setting_value; });

      const workStartTime = settingsMap.work_start_time || "09:00";
      const lateThresholdMinutes = parseInt(settingsMap.late_threshold_minutes || "0");
      const [workStartHour, workStartMinute] = workStartTime.split(":").map(Number);

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const workStartMinutes = workStartHour * 60 + workStartMinute;
      const minutesLate = currentMinutes - workStartMinutes;
      const isLate = minutesLate > lateThresholdMinutes;
      const lateMinutes = isLate ? Math.max(0, minutesLate - lateThresholdMinutes) : 0;

      const { data: insertedLog, error: insertError } = await supabase
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
          work_mode: hasFieldWork ? "field" : hasWFH ? "wfh" : "onsite",
          status: "present",
        })
        .select("id")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          setError("คุณได้เช็กอินวันนี้แล้ว");
          return;
        }
        throw insertError;
      }

      // Send LINE notification (fire-and-forget)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        fetch("/api/checkin-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
          },
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

      // Gamification (fire-and-forget)
      processCheckinGamification(employee.id, isLate, now, insertedLog?.id)
        .catch((err) => console.error("Gamification error:", err));

      setSuccess(true);
      stopCamera();
      setTimeout(() => router.push("/"), UI_DELAYS.SUCCESS_REDIRECT);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  // Rest day block
  if (isRestDay && !hasApprovedOT) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-[#ff9500]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-[#ff9500]" strokeWidth={2} />
          </div>
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-2">วันหยุด</h2>
          <p className="text-[17px] text-[#86868b] mb-2">{restDayName}</p>
          <p className="text-[15px] text-[#86868b] mb-8">ต้องขอ OT ก่อนถึงจะเช็คอินได้</p>
          <div className="space-y-3">
            <Link href="/ot/request">
              <button className="w-full py-3.5 bg-[#ff9500] hover:bg-[#ff8000] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                <Timer className="w-5 h-5" />
                ขอทำ OT
              </button>
            </Link>
            <Link href="/">
              <button className="w-full py-3.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] font-semibold rounded-xl transition-all">
                กลับหน้าแรก
              </button>
            </Link>
          </div>
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
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-2">เช็กอินสำเร็จ</h2>
          <p className="text-[17px] text-[#86868b]">บันทึกเวลาเข้างานเรียบร้อยแล้ว</p>
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
            href="/"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-[#86868b]" />
          </Link>
          <h1 className="text-[28px] font-bold text-[#1d1d1f]">เช็คอิน</h1>
        </div>

        {/* Clock */}
        <div className="text-center mb-6">
          <p className="text-[56px] font-light text-[#1d1d1f] tracking-tight">
            {currentTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })}
          </p>
          <p className="text-[17px] text-[#86868b]">
            {currentTime.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Camera */}
        <Card elevated className="overflow-hidden mb-6">
          <div className="aspect-[4/3] bg-black relative">
            {photo ? (
              <img src={photo} alt="Captured" className="w-full h-full object-cover" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
            {!photo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/50 rounded-full" />
              </div>
            )}
          </div>
        </Card>

        {/* Status items */}
        <div className="space-y-3 mb-6">
          {/* GPS */}
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#e8e8ed]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${location ? "bg-[#34c759]/10" : "bg-[#ff9500]/10"}`}>
                {gpsLoading ? (
                  <div className="w-5 h-5 border-2 border-[#ff9500] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MapPin className={`w-5 h-5 ${location ? "text-[#34c759]" : "text-[#ff9500]"}`} />
                )}
              </div>
              <div>
                <p className="text-[15px] font-medium text-[#1d1d1f]">
                  {location ? "พบตำแหน่ง GPS" : gpsLoading ? "กำลังหาตำแหน่ง..." : "ไม่พบตำแหน่ง"}
                </p>
                {location && (
                  <p className="text-[13px] text-[#86868b]">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
            {!location && !gpsLoading ? (
              <button
                onClick={getLocation}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/15 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                ลองใหม่
              </button>
            ) : (
              <div className={`w-3 h-3 rounded-full ${location ? "bg-[#34c759]" : "bg-[#ff9500] animate-pulse"}`} />
            )}
          </div>

          {/* Radius check */}
          {branch && radiusCheck && (
            <div className={`flex items-center justify-between p-4 rounded-xl border ${radiusCheck.inRadius ? "bg-[#34c759]/10 border-[#34c759]/30" : "bg-[#ff3b30]/10 border-[#ff3b30]/30"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${radiusCheck.inRadius ? "bg-[#34c759]/20" : "bg-[#ff3b30]/20"}`}>
                  <Navigation className={`w-5 h-5 ${radiusCheck.inRadius ? "text-[#34c759]" : "text-[#ff3b30]"}`} />
                </div>
                <div>
                  <p className={`text-[15px] font-medium ${radiusCheck.inRadius ? "text-[#34c759]" : "text-[#ff3b30]"}`}>
                    {radiusCheck.inRadius ? "อยู่ในรัศมีที่อนุญาต ✓" : "อยู่นอกรัศมีที่อนุญาต ✗"}
                  </p>
                  <p className="text-[13px] text-[#86868b] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {branch.name} • ห่าง {formatDistance(radiusCheck.distance)} (รัศมี {branch.radius_meters} ม.)
                  </p>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${radiusCheck.inRadius ? "bg-[#34c759]" : "bg-[#ff3b30]"}`} />
            </div>
          )}

          {/* WFH badge */}
          {hasWFH && (
            <div className="flex items-center gap-3 p-4 bg-[#0071e3]/10 rounded-xl border border-[#0071e3]/30">
              <div className="w-10 h-10 rounded-full bg-[#0071e3]/20 flex items-center justify-center">
                <span className="text-[18px]">🏠</span>
              </div>
              <div>
                <p className="text-[15px] font-medium text-[#0071e3]">ทำงานจากบ้าน (WFH)</p>
                <p className="text-[13px] text-[#86868b]">ไม่ต้องอยู่ในรัศมีสาขา</p>
              </div>
            </div>
          )}

          {/* No branch warning */}
          {!branch && employee?.branch_id === null && (
            <div className="flex items-center gap-3 p-4 bg-[#ff9500]/10 rounded-xl border border-[#ff9500]/30">
              <AlertCircle className="w-5 h-5 text-[#ff9500]" />
              <div>
                <p className="text-[15px] font-medium text-[#ff9500]">ไม่ได้กำหนดสาขา</p>
                <p className="text-[13px] text-[#86868b]">กรุณาติดต่อ Admin เพื่อกำหนดสาขาของคุณ</p>
              </div>
            </div>
          )}

          {/* Camera status */}
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
            <Button fullWidth onClick={capturePhoto} disabled={!stream} size="lg">
              <Camera className="w-5 h-5" />
              ถ่ายรูป
            </Button>
          ) : (
            <>
              <Button
                fullWidth
                onClick={handleCheckin}
                loading={loading}
                disabled={!location || !branch || (!hasFieldWork && !hasWFH && radiusCheck !== null && !radiusCheck.inRadius)}
                size="lg"
              >
                <CheckCircle className="w-5 h-5" />
                ยืนยันเช็กอิน
              </Button>
              <Button fullWidth variant="secondary" onClick={clearPhoto} size="lg">
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
