"use client";

import { MapPin, Navigation, RotateCcw, Camera, AlertCircle } from "lucide-react";
import { formatDistance } from "@/lib/utils/geo";
import type { BranchInfo } from "@/lib/hooks/use-location";

interface GPSStatusProps {
  location: { lat: number; lng: number } | null;
  gpsLoading: boolean;
  onRetry: () => void;
}

export function GPSStatus({ location, gpsLoading, onRetry }: GPSStatusProps) {
  return (
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
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#0071e3] bg-[#0071e3]/10 rounded-lg hover:bg-[#0071e3]/15 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          ลองใหม่
        </button>
      ) : (
        <div className={`w-3 h-3 rounded-full ${location ? "bg-[#34c759]" : "bg-[#ff9500] animate-pulse"}`} />
      )}
    </div>
  );
}

interface RadiusStatusProps {
  branch: BranchInfo;
  radiusCheck: { inRadius: boolean; distance: number };
  variant?: "checkin" | "checkout";
}

export function RadiusStatus({ branch, radiusCheck, variant = "checkin" }: RadiusStatusProps) {
  const outColor = variant === "checkin" ? "#ff3b30" : "#ff9500";
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${
      radiusCheck.inRadius
        ? "bg-[#34c759]/10 border-[#34c759]/30"
        : `bg-[${outColor}]/10 border-[${outColor}]/30`
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          radiusCheck.inRadius ? "bg-[#34c759]/20" : `bg-[${outColor}]/20`
        }`}>
          <Navigation className={`w-5 h-5 ${radiusCheck.inRadius ? "text-[#34c759]" : `text-[${outColor}]`}`} />
        </div>
        <div>
          <p className={`text-[15px] font-medium ${radiusCheck.inRadius ? "text-[#34c759]" : `text-[${outColor}]`}`}>
            {radiusCheck.inRadius
              ? (variant === "checkin" ? "อยู่ในรัศมีที่อนุญาต ✓" : "อยู่ในรัศมีสาขา ✓")
              : (variant === "checkin" ? "อยู่นอกรัศมีที่อนุญาต ✗" : "อยู่นอกรัศมีสาขา")
            }
          </p>
          <p className="text-[13px] text-[#86868b] flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {branch.name} • ห่าง {formatDistance(radiusCheck.distance)}
            {variant === "checkin" && ` (รัศมี ${branch.radius_meters} ม.)`}
          </p>
        </div>
      </div>
      {variant === "checkin" && (
        <div className={`w-3 h-3 rounded-full ${radiusCheck.inRadius ? "bg-[#34c759]" : `bg-[${outColor}]`}`} />
      )}
    </div>
  );
}

interface WFHBadgeProps {
  isPermanent: boolean;
}

export function WFHBadge({ isPermanent }: WFHBadgeProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-[#0071e3]/10 rounded-xl border border-[#0071e3]/30">
      <div className="w-10 h-10 rounded-full bg-[#0071e3]/20 flex items-center justify-center">
        <span className="text-[18px]">🏠</span>
      </div>
      <div>
        <p className="text-[15px] font-medium text-[#0071e3]">
          {isPermanent ? "WFH ถาวร" : "ทำงานจากบ้าน (WFH)"}
        </p>
        <p className="text-[13px] text-[#86868b]">ไม่ต้องอยู่ในรัศมีสาขา</p>
      </div>
    </div>
  );
}

interface NoBranchWarningProps {}

export function NoBranchWarning(_props: NoBranchWarningProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-[#ff9500]/10 rounded-xl border border-[#ff9500]/30">
      <AlertCircle className="w-5 h-5 text-[#ff9500]" />
      <div>
        <p className="text-[15px] font-medium text-[#ff9500]">ไม่ได้กำหนดสาขา</p>
        <p className="text-[13px] text-[#86868b]">กรุณาติดต่อ Admin เพื่อกำหนดสาขาของคุณ</p>
      </div>
    </div>
  );
}

interface CameraStatusProps {
  isReady: boolean;
}

export function CameraStatus({ isReady }: CameraStatusProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#e8e8ed]">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isReady ? "bg-[#34c759]/10" : "bg-[#ff9500]/10"}`}>
          <Camera className={`w-5 h-5 ${isReady ? "text-[#34c759]" : "text-[#ff9500]"}`} />
        </div>
        <p className="text-[15px] font-medium text-[#1d1d1f]">
          {isReady ? "กล้องพร้อมใช้งาน" : "กำลังเปิดกล้อง..."}
        </p>
      </div>
      <div className={`w-3 h-3 rounded-full ${isReady ? "bg-[#34c759]" : "bg-[#ff9500] animate-pulse"}`} />
    </div>
  );
}

interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-3 p-4 bg-[#ff3b30]/10 rounded-xl mb-6">
      <AlertCircle className="w-5 h-5 text-[#ff3b30] shrink-0" />
      <span className="text-[15px] text-[#ff3b30]">{message}</span>
    </div>
  );
}
