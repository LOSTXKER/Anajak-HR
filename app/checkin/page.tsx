"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { uploadAttendancePhoto } from "@/lib/utils/upload-photo";
import { formatDistance } from "@/lib/utils/geo";
import { useAttendanceFlow } from "@/lib/hooks/use-attendance-flow";
import { UI_DELAYS } from "@/lib/constants";
import {
  Camera, ArrowLeft, CheckCircle, Calendar, Timer,
} from "lucide-react";
import { getTodayTH, getNowTH } from "@/lib/utils/date";
import { getDayType } from "@/lib/services/holiday.service";
import { checkIn } from "@/lib/services/attendance.service";
import { processCheckinGamification } from "@/lib/services/gamification.service";
import { authFetch } from "@/lib/utils/auth-fetch";
import {
  GPSStatus, RadiusStatus, WFHBadge, NoBranchWarning,
  CameraStatus, ErrorBanner,
} from "@/components/attendance/StatusPanel";

function CheckinContent() {
  const flow = useAttendanceFlow();
  const {
    employee, router, camera, location, gpsLoading, getLocation,
    radiusCheck, loading, setLoading, error, setError, success, setSuccess,
    currentTime, branch, hasFieldWork, isWFH, isPermanentWFH,
    initCameraAndLocation, fetchCommonData,
  } = flow;

  const [allowedTime, setAllowedTime] = useState({ checkinStart: "06:00", checkinEnd: "12:00" });
  const [isRestDay, setIsRestDay] = useState(false);
  const [restDayName, setRestDayName] = useState("");
  const [hasApprovedOT, setHasApprovedOT] = useState(false);

  useEffect(() => {
    const cleanup = initCameraAndLocation();
    fetchCheckinData();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCheckinData = async () => {
    if (!employee?.branch_id) return;
    const today = getTodayTH();

    await fetchCommonData(employee.branch_id, employee.id);

    const [settingsRes, dayTypeRes, otRes] = await Promise.all([
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
    ]);

    if (settingsRes.data) {
      const settings: Record<string, string> = {};
      settingsRes.data.forEach((s: { setting_key: string; setting_value: string }) => {
        settings[s.setting_key] = s.setting_value;
      });
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
  };

  const handleCheckin = async () => {
    if (!camera.photo || !location || !employee) return;

    if (!branch) {
      setError("คุณยังไม่ได้กำหนดสาขา กรุณาติดต่อ Admin");
      return;
    }

    const bangkokNow = getNowTH();
    const currentTimeInMinutes = bangkokNow.getHours() * 60 + bangkokNow.getMinutes();
    const [startHour, startMinute] = allowedTime.checkinStart.split(":").map(Number);
    const [endHour, endMinute] = allowedTime.checkinEnd.split(":").map(Number);
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    if (!hasApprovedOT && (currentTimeInMinutes < startTimeInMinutes || currentTimeInMinutes > endTimeInMinutes)) {
      setError(
        `ไม่สามารถเช็คอินนอกเวลาได้\n\n` +
        `เวลาที่อนุญาต: ${allowedTime.checkinStart} - ${allowedTime.checkinEnd} น.\n` +
        `หากต้องการทำงานนอกเวลา กรุณาขอ OT ก่อน`
      );
      return;
    }

    if (!hasFieldWork && !isWFH && radiusCheck && !radiusCheck.inRadius) {
      setError(`คุณอยู่นอกรัศมีที่อนุญาต (ห่าง ${formatDistance(radiusCheck.distance)} จากสาขา ${branch.name})`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const photoUrl = await uploadAttendancePhoto(camera.photo, employee.id, "checkin");
      if (!photoUrl) {
        setError("ไม่สามารถอัปโหลดรูปภาพได้");
        return;
      }

      const workMode = hasFieldWork ? "field" as const : isWFH ? "wfh" as const : "onsite" as const;

      const result = await checkIn({
        employeeId: employee.id,
        location,
        photoUrl,
        workMode,
      });

      if (!result.success) {
        const errMsg = result.error;
        if (errMsg?.includes("already") || errMsg?.includes("duplicate")) {
          setError("คุณได้เช็กอินวันนี้แล้ว");
        } else {
          setError(errMsg || "เกิดข้อผิดพลาด");
        }
        return;
      }

      const { attendance, isLate } = result.data;
      const now = new Date();

      authFetch("/api/checkin-notification", {
        method: "POST",
        body: JSON.stringify({
          employeeName: employee.name,
          time: now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }),
          location: branch?.name || "สำนักงาน",
          isLate,
          photoUrl,
        }),
      }).catch((err) => console.error("Failed to send check-in notification:", err));

      processCheckinGamification(employee.id, isLate, now, attendance?.id)
        .catch((err) => console.error("Gamification error:", err));

      setSuccess(true);
      camera.stopCamera();
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
            {camera.photo ? (
              <img src={camera.photo} alt="Captured" className="w-full h-full object-cover" />
            ) : (
              <video ref={camera.videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
            {!camera.photo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/50 rounded-full" />
              </div>
            )}
          </div>
        </Card>

        {/* Status items */}
        <div className="space-y-3 mb-6">
          <GPSStatus location={location} gpsLoading={gpsLoading} onRetry={getLocation} />
          {branch && radiusCheck && (
            <RadiusStatus branch={branch} radiusCheck={radiusCheck} variant="checkin" />
          )}
          {isWFH && <WFHBadge isPermanent={isPermanentWFH} />}
          {!branch && employee?.branch_id === null && <NoBranchWarning />}
          <CameraStatus isReady={!!camera.stream} />
        </div>

        <ErrorBanner message={error} />

        {/* Actions */}
        <div className="space-y-3">
          {!camera.photo ? (
            <Button fullWidth onClick={camera.capturePhoto} disabled={!camera.stream} size="lg">
              <Camera className="w-5 h-5" />
              ถ่ายรูป
            </Button>
          ) : (
            <>
              <Button
                fullWidth
                onClick={handleCheckin}
                loading={loading}
                disabled={!location || !branch || (!hasFieldWork && !isWFH && radiusCheck !== null && !radiusCheck.inRadius)}
                size="lg"
              >
                <CheckCircle className="w-5 h-5" />
                ยืนยันเช็กอิน
              </Button>
              <Button fullWidth variant="secondary" onClick={camera.clearPhoto} size="lg">
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
