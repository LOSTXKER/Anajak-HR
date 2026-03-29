"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useCamera } from "./use-camera";
import { useLocation, BranchInfo } from "./use-location";
import { TIME_CONSTANTS } from "@/lib/constants";
import { getTodayTH } from "@/lib/utils/date";

interface UseAttendanceFlowOptions {
  redirectAdmins?: boolean;
}

export function useAttendanceFlow(options: UseAttendanceFlowOptions = {}) {
  const { redirectAdmins = true } = options;
  const { employee } = useAuth();
  const router = useRouter();

  const camera = useCamera();
  const locationHook = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [hasFieldWork, setHasFieldWork] = useState(false);
  const [hasWFH, setHasWFH] = useState(false);

  const isPermanentWFH = employee?.work_arrangement === "wfh";
  const isWFH = hasWFH || isPermanentWFH;

  useEffect(() => {
    if (redirectAdmins && employee?.role === "admin") {
      router.replace("/admin");
    }
  }, [employee, router, redirectAdmins]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), TIME_CONSTANTS.CLOCK_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (camera.cameraError) setError(camera.cameraError);
  }, [camera.cameraError]);

  useEffect(() => {
    if (locationHook.locationError) setError(locationHook.locationError);
  }, [locationHook.locationError]);

  useEffect(() => {
    if (locationHook.location && branch) {
      locationHook.checkRadius(locationHook.location, branch);
    }
  }, [locationHook.location, branch, locationHook.checkRadius]);

  const initCameraAndLocation = useCallback(() => {
    camera.startCamera();
    locationHook.getLocation();
    return () => camera.stopCamera();
    // camera and locationHook are stable refs from their respective hooks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.startCamera, camera.stopCamera, locationHook.getLocation]);

  const fetchCommonData = useCallback(async (branchId: string | null, employeeId: string) => {
    if (!branchId) return;
    const today = getTodayTH();

    const [branchRes, fieldWorkRes, wfhRes] = await Promise.all([
      supabase
        .from("branches")
        .select("id, name, gps_lat, gps_lng, radius_meters")
        .eq("id", branchId)
        .maybeSingle(),
      supabase
        .from("field_work_requests")
        .select("id")
        .eq("employee_id", employeeId)
        .eq("date", today)
        .eq("status", "approved")
        .maybeSingle(),
      supabase
        .from("wfh_requests")
        .select("id")
        .eq("employee_id", employeeId)
        .eq("date", today)
        .eq("status", "approved")
        .maybeSingle(),
    ]);

    if (branchRes.data) setBranch(branchRes.data);
    if (fieldWorkRes.data) setHasFieldWork(true);
    if (wfhRes.data) setHasWFH(true);
  }, []);

  return {
    employee,
    router,
    camera,
    location: locationHook.location,
    gpsLoading: locationHook.gpsLoading,
    getLocation: locationHook.getLocation,
    radiusCheck: locationHook.radiusCheck,
    loading, setLoading,
    error, setError,
    success, setSuccess,
    currentTime,
    branch, setBranch,
    hasFieldWork, setHasFieldWork,
    hasWFH, setHasWFH,
    isPermanentWFH,
    isWFH,
    initCameraAndLocation,
    fetchCommonData,
  };
}
