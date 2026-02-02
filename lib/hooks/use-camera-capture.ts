/**
 * Camera Capture Hook
 * =============================================
 * Hook for camera functionality in check-in/check-out pages
 */

import { useState, useRef, useEffect, useCallback } from "react";

interface UseCameraCaptureOptions {
  autoStart?: boolean;
  facingMode?: "user" | "environment";
}

interface UseCameraCaptureReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  photo: string | null;
  isReady: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => string | null;
  resetPhoto: () => void;
}

/**
 * Hook for managing camera capture functionality
 * @param options - Configuration options
 */
export function useCameraCapture(
  options: UseCameraCaptureOptions = {}
): UseCameraCaptureReturn {
  const { autoStart = false, facingMode = "user" } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setIsReady(true);
      }
      setStream(mediaStream);
    } catch (err: any) {
      console.error("Error starting camera:", err);
      if (err.name === "NotAllowedError") {
        setError("กรุณาอนุญาตการเข้าถึงกล้อง");
      } else if (err.name === "NotFoundError") {
        setError("ไม่พบกล้องในอุปกรณ์นี้");
      } else {
        setError("ไม่สามารถเปิดกล้องได้");
      }
      setIsReady(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsReady(false);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !isReady) {
      setError("กล้องยังไม่พร้อม");
      return null;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("ไม่สามารถสร้างภาพได้");
        return null;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setPhoto(dataUrl);
      return dataUrl;
    } catch (err) {
      console.error("Error capturing photo:", err);
      setError("ไม่สามารถถ่ายภาพได้");
      return null;
    }
  }, [isReady]);

  const resetPhoto = useCallback(() => {
    setPhoto(null);
    setError(null);
  }, []);

  // Auto-start camera if enabled
  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return {
    videoRef,
    stream,
    photo,
    isReady,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
    resetPhoto,
  };
}
