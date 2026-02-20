"use client";

import { useState, useCallback } from "react";
import { isWithinRadius } from "@/lib/utils/geo";
import { TIME_CONSTANTS } from "@/lib/constants";

export interface GpsCoords {
  lat: number;
  lng: number;
}

export interface RadiusCheckResult {
  inRadius: boolean;
  distance: number;
}

export interface BranchInfo {
  id: string;
  name: string;
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
}

interface UseLocationReturn {
  /** Current GPS coordinates, or null if not yet obtained */
  location: GpsCoords | null;
  /** True while navigator.geolocation is working */
  gpsLoading: boolean;
  /** Error message if geolocation failed */
  locationError: string;
  /** Result of the branch radius check, or null if branch/location not available */
  radiusCheck: RadiusCheckResult | null;
  /** Trigger a fresh geolocation request */
  getLocation: () => void;
  /** Run the radius check against a given branch */
  checkRadius: (coords: GpsCoords, branch: BranchInfo) => RadiusCheckResult;
  /** Clear the location error */
  clearLocationError: () => void;
}

/**
 * Manages GPS location retrieval and branch-radius checking.
 * Both checkin and checkout pages contain identical geolocation code – this
 * hook centralises it.
 */
export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<GpsCoords | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [radiusCheck, setRadiusCheck] = useState<RadiusCheckResult | null>(null);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("อุปกรณ์ไม่รองรับ GPS");
      return;
    }
    setGpsLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("กรุณาเปิดการเข้าถึงตำแหน่งในการตั้งค่า");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError("ไม่สามารถหาตำแหน่งได้ ลองออกไปที่โล่งแล้วกดลองใหม่");
        } else {
          setLocationError("หาตำแหน่ง GPS หมดเวลา กดลองใหม่");
        }
      },
      { enableHighAccuracy: true, timeout: TIME_CONSTANTS.GPS_TIMEOUT, maximumAge: 0 }
    );
  }, []);

  const checkRadius = useCallback((coords: GpsCoords, branch: BranchInfo): RadiusCheckResult => {
    const result = isWithinRadius(
      coords.lat,
      coords.lng,
      branch.gps_lat,
      branch.gps_lng,
      branch.radius_meters
    );
    setRadiusCheck(result);
    return result;
  }, []);

  const clearLocationError = useCallback(() => setLocationError(""), []);

  return { location, gpsLoading, locationError, radiusCheck, getLocation, checkRadius, clearLocationError };
}
