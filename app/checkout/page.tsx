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
  Clock, Navigation, RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { getTodayTH } from "@/lib/utils/date";
import { processCheckoutGamification } from "@/lib/services/gamification.service";
import { authFetch } from "@/lib/utils/auth-fetch";

function CheckoutContent() {
  const { employee } = useAuth();
  const router = useRouter();

  const { stream, photo, cameraError, startCamera, stopCamera, capturePhoto, clearPhoto, videoRef } = useCamera();
  const { location, gpsLoading, locationError, radiusCheck, getLocation, checkRadius } = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayLog, setTodayLog] = useState<any>(null);
  const [todayLogLoading, setTodayLogLoading] = useState(true);

  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [allowedTime, setAllowedTime] = useState({ checkoutStart: "15:00", checkoutEnd: "22:00" });
  const [hasFieldWork, setHasFieldWork] = useState(false);
  const [hasWFH, setHasWFH] = useState(false);
  const [allowRemoteCheckout, setAllowRemoteCheckout] = useState(false);

  const isPermanentWFH = employee?.work_arrangement === "wfh";
  const isWFH = hasWFH || isPermanentWFH;
  const [workEndTime, setWorkEndTime] = useState("18:00");

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

  // Initialise camera, GPS, today's log and branch data
  useEffect(() => {
    startCamera();
    getLocation();
    checkTodayLog();
    fetchBranch();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee]);

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

  const fetchBranch = async () => {
    if (!employee?.branch_id) return;
    const today = getTodayTH();

    const [branchRes, settingsRes, fieldWorkRes, wfhRes] = await Promise.all([
      supabase
        .from("branches")
        .select("id, name, gps_lat, gps_lng, radius_meters")
        .eq("id", employee.branch_id)
        .maybeSingle(),
      supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["checkout_time_start", "checkout_time_end", "allow_remote_checkout_after_hours", "work_end_time"]),
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
        checkoutStart: settings.checkout_time_start || "15:00",
        checkoutEnd: settings.checkout_time_end || "22:00",
      });
      setAllowRemoteCheckout(settings.allow_remote_checkout_after_hours === "true");
      setWorkEndTime(settings.work_end_time || "18:00");
    }

    if (fieldWorkRes.data) setHasFieldWork(true);
    if (wfhRes.data) setHasWFH(true);
  };

  const checkTodayLog = async () => {
    if (!employee) return;
    setTodayLogLoading(true);
    const today = getTodayTH();
    const { data } = await supabase
      .from("attendance_logs")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("work_date", today)
      .maybeSingle();
    setTodayLog(data);
    setTodayLogLoading(false);
  };

  const isAfterWorkEnd = (): boolean => {
    const now = new Date();
    const bangkokNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const [endHour, endMinute] = workEndTime.split(":").map(Number);
    const nowMinutes = bangkokNow.getHours() * 60 + bangkokNow.getMinutes();
    return nowMinutes >= endHour * 60 + endMinute;
  };

  const hasRemoteCheckoutBypass = allowRemoteCheckout && isAfterWorkEnd();

  const handleCheckout = async () => {
    if (!photo || !location || !employee || !todayLog) return;

    if (!hasFieldWork && !isWFH && !hasRemoteCheckoutBypass && radiusCheck && !radiusCheck.inRadius) {
      setError(`คุณอยู่นอกรัศมีที่อนุญาต (ห่าง ${formatDistance(radiusCheck.distance)} จากสาขา ${branch?.name || "สาขา"})`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (todayLog.clock_out_time) {
        setError("คุณได้เช็คเอาท์วันนี้แล้ว");
        return;
      }

      // Validate allowed time window (Bangkok timezone)
      const now = new Date();
      const bangkokNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
      const currentTimeInMinutes = bangkokNow.getHours() * 60 + bangkokNow.getMinutes();
      const [startHour, startMinute] = allowedTime.checkoutStart.split(":").map(Number);
      const [endHour, endMinute] = allowedTime.checkoutEnd.split(":").map(Number);
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;
      const isEarlyCheckout = currentTimeInMinutes < startTimeInMinutes;

      if (currentTimeInMinutes > endTimeInMinutes) {
        setError(
          `ไม่สามารถเช็คเอาท์ได้\n\n` +
          `เวลาที่อนุญาต: ${allowedTime.checkoutStart} - ${allowedTime.checkoutEnd} น.\n` +
          `หากต้องการทำงานนอกเวลา กรุณาขอ OT ก่อน`
        );
        return;
      }

      const photoUrl = await uploadAttendancePhoto(photo, employee.id, "checkout");
      if (!photoUrl) {
        setError("ไม่สามารถอัปโหลดรูปภาพได้");
        return;
      }

      const clockIn = new Date(todayLog.clock_in_time);
      const totalHours = (now.getTime() - clockIn.getTime()) / TIME_CONSTANTS.MS_PER_HOUR;

      const { data: updateData, error: updateError } = await supabase
        .from("attendance_logs")
        .update({
          clock_out_time: now.toISOString(),
          clock_out_gps_lat: location.lat,
          clock_out_gps_lng: location.lng,
          clock_out_photo_url: photoUrl,
          total_hours: totalHours,
        })
        .eq("id", todayLog.id)
        .is("clock_out_time", null)
        .select("id");

      if (updateError) throw updateError;

      if (!updateData || updateData.length === 0) {
        setError("คุณได้เช็คเอาท์ไปแล้ว กรุณารีเฟรชหน้า");
        return;
      }

      // Early checkout: record anomaly and notify admin
      if (isEarlyCheckout) {
        await supabase.from("attendance_anomalies").insert({
          attendance_id: todayLog.id,
          employee_id: todayLog.employee_id,
          date: format(new Date(), "yyyy-MM-dd"),
          anomaly_type: "early_checkout",
          description: `พนักงานเช็คเอาท์ก่อนเวลา (${now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })}) เวลาปกติ ${allowedTime.checkoutStart} น.`,
          status: "pending",
        });

        try {
          authFetch("/api/notifications", {
            method: "POST",
            body: JSON.stringify({
              type: "early_checkout",
              data: {
                employeeName: employee.name,
                time: now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }),
                totalHours,
                expectedTime: allowedTime.checkoutStart,
                location: branch?.name || "สำนักงาน",
              },
            }),
          }).catch((err) => console.error("Failed to send early checkout notification:", err));
        } catch (notifyError) {
          console.error("Early checkout notification error:", notifyError);
        }
      }

      // Regular checkout notification (fire-and-forget)
      try {
        authFetch("/api/checkout-notification", {
          method: "POST",
          body: JSON.stringify({
            employeeName: employee.name,
            time: now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }),
            totalHours,
            location: branch?.name || "สำนักงาน",
            photoUrl,
          }),
        }).catch((err) => console.error("Failed to send check-out notification:", err));
      } catch (notifyError) {
        console.error("Notification error:", notifyError);
      }

      // Gamification (fire-and-forget)
      processCheckoutGamification(employee.id, todayLog.id)
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

  if (success) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 bg-[#ff3b30] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-2">เช็กเอาท์สำเร็จ</h2>
          <p className="text-[17px] text-[#86868b]">บันทึกเวลาออกงานเรียบร้อยแล้ว</p>
        </div>
      </div>
    );
  }

  if (todayLogLoading) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-[15px] text-[#86868b]">กำลังโหลด...</p>
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
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-2">ยังไม่ได้เช็กอิน</h2>
          <p className="text-[17px] text-[#86868b] mb-8">กรุณาเช็กอินก่อนเช็กเอาท์</p>
          <Button onClick={() => router.push("/checkin")}>ไปหน้าเช็กอิน</Button>
        </div>
      </div>
    );
  }

  if (todayLog.clock_out_time) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#34c759]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#34c759]" />
          </div>
          <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-2">เช็กเอาท์แล้ววันนี้</h2>
          <p className="text-[17px] text-[#86868b] mb-2">
            เช็กเอาท์เมื่อ{" "}
            {new Date(todayLog.clock_out_time).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })} น.
          </p>
          <p className="text-[15px] text-[#86868b] mb-8">
            ทำงานรวม {todayLog.total_hours?.toFixed(1) || 0} ชั่วโมง
          </p>
          <Button onClick={() => router.push("/")}>กลับหน้าหลัก</Button>
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
          <h1 className="text-[28px] font-bold text-[#1d1d1f]">เช็คเอาท์</h1>
        </div>

        {/* Clock */}
        <div className="text-center mb-4">
          <p className="text-[56px] font-light text-[#1d1d1f] tracking-tight">
            {currentTime.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })}
          </p>
          <p className="text-[17px] text-[#86868b]">
            {currentTime.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Check-in time info */}
        <Card elevated className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#34c759]/20 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <p className="text-[13px] text-[#86868b]">เช็กอินเมื่อ</p>
              <p className="text-[17px] font-medium text-[#1d1d1f]">
                {new Date(todayLog.clock_in_time).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })} น.
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
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
          </div>
        </Card>

        {/* Status items */}
        <div className="space-y-3 mb-6">
          {/* WFH badge */}
          {isWFH && (
            <div className="flex items-center gap-3 p-4 bg-[#0071e3]/10 rounded-xl border border-[#0071e3]/30">
              <div className="w-10 h-10 rounded-full bg-[#0071e3]/20 flex items-center justify-center">
                <span className="text-[18px]">🏠</span>
              </div>
              <div>
                <p className="text-[15px] font-medium text-[#0071e3]">
                  {isPermanentWFH ? "WFH ถาวร" : "ทำงานจากบ้าน (WFH)"}
                </p>
                <p className="text-[13px] text-[#86868b]">ไม่ต้องอยู่ในรัศมีสาขา</p>
              </div>
            </div>
          )}

          {/* Remote checkout badge */}
          {hasRemoteCheckoutBypass && !isWFH && !hasFieldWork && (
            <div className="flex items-center gap-3 p-4 bg-[#ff9500]/10 rounded-xl border border-[#ff9500]/30">
              <div className="w-10 h-10 rounded-full bg-[#ff9500]/20 flex items-center justify-center">
                <span className="text-[18px]">📍</span>
              </div>
              <div>
                <p className="text-[15px] font-medium text-[#ff9500]">เช็คเอาท์จากระยะไกล</p>
                <p className="text-[13px] text-[#86868b]">หลังเวลาเลิกงาน ({workEndTime} น.) สามารถเช็คเอาท์จากที่ไหนก็ได้</p>
              </div>
            </div>
          )}

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
            <div className={`flex items-center justify-between p-4 rounded-xl border ${radiusCheck.inRadius ? "bg-[#34c759]/10 border-[#34c759]/30" : "bg-[#ff9500]/10 border-[#ff9500]/30"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${radiusCheck.inRadius ? "bg-[#34c759]/20" : "bg-[#ff9500]/20"}`}>
                  <Navigation className={`w-5 h-5 ${radiusCheck.inRadius ? "text-[#34c759]" : "text-[#ff9500]"}`} />
                </div>
                <div>
                  <p className={`text-[15px] font-medium ${radiusCheck.inRadius ? "text-[#34c759]" : "text-[#ff9500]"}`}>
                    {radiusCheck.inRadius ? "อยู่ในรัศมีสาขา ✓" : "อยู่นอกรัศมีสาขา"}
                  </p>
                  <p className="text-[13px] text-[#86868b] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {branch.name} • ห่าง {formatDistance(radiusCheck.distance)}
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
            <Button fullWidth variant="danger" onClick={capturePhoto} disabled={!stream} size="lg">
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
                disabled={!location || (!hasFieldWork && !isWFH && !hasRemoteCheckoutBypass && radiusCheck !== null && !radiusCheck.inRadius)}
                size="lg"
              >
                <CheckCircle className="w-5 h-5" />
                ยืนยันเช็กเอาท์
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

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutContent />
    </ProtectedRoute>
  );
}
