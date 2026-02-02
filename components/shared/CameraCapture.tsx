"use client";

import { useRef, useState, useEffect, forwardRef } from "react";
import { Camera, RotateCcw, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CameraCaptureProps {
  /**
   * Callback when photo is captured
   */
  onCapture?: (photoDataUrl: string) => void;
  /**
   * Callback when capture is reset
   */
  onReset?: () => void;
  /**
   * Camera facing mode
   */
  facingMode?: "user" | "environment";
  /**
   * Whether to auto-start the camera
   */
  autoStart?: boolean;
  /**
   * Captured photo (controlled mode)
   */
  photo?: string | null;
  /**
   * Whether the camera is required
   */
  required?: boolean;
  /**
   * Label text
   */
  label?: string;
  /**
   * Custom class name for the container
   */
  className?: string;
  /**
   * Show capture button
   */
  showCaptureButton?: boolean;
  /**
   * Aspect ratio (default: 4/3)
   */
  aspectRatio?: string;
}

/**
 * CameraCapture Component
 * A reusable camera capture component for check-in/check-out flows
 */
export const CameraCapture = forwardRef<HTMLVideoElement, CameraCaptureProps>(
  function CameraCapture(
    {
      onCapture,
      onReset,
      facingMode = "user",
      autoStart = false,
      photo: controlledPhoto,
      required = false,
      label = "ถ่ายรูป",
      className = "",
      showCaptureButton = true,
      aspectRatio = "aspect-[4/3]",
    },
    forwardedRef
  ) {
    const internalVideoRef = useRef<HTMLVideoElement>(null);
    const videoRef = (forwardedRef as React.RefObject<HTMLVideoElement>) || internalVideoRef;
    
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [internalPhoto, setInternalPhoto] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const photo = controlledPhoto !== undefined ? controlledPhoto : internalPhoto;

    const startCamera = async () => {
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
    };

    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
        setIsReady(false);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const capturePhoto = (): string | null => {
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
        
        if (controlledPhoto === undefined) {
          setInternalPhoto(dataUrl);
        }
        
        onCapture?.(dataUrl);
        return dataUrl;
      } catch (err) {
        console.error("Error capturing photo:", err);
        setError("ไม่สามารถถ่ายภาพได้");
        return null;
      }
    };

    const resetPhoto = () => {
      if (controlledPhoto === undefined) {
        setInternalPhoto(null);
      }
      setError(null);
      onReset?.();
    };

    useEffect(() => {
      if (autoStart && !photo) {
        startCamera();
      }
      return () => {
        stopCamera();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStart]);

    // Restart camera when photo is cleared
    useEffect(() => {
      if (!photo && autoStart) {
        startCamera();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [photo]);

    return (
      <div className={`space-y-3 ${className}`}>
        {label && (
          <div className="flex items-center gap-2 text-[15px] font-medium text-[#1d1d1f]">
            <Camera className="w-4 h-4 text-[#86868b]" />
            {label}
            {required && <span className="text-[#ff3b30]">*</span>}
          </div>
        )}

        <div
          className={`relative bg-[#f5f5f7] rounded-2xl overflow-hidden ${aspectRatio}`}
        >
          {photo ? (
            // Show captured photo
            <div className="relative w-full h-full">
              <img
                src={photo}
                alt="Captured"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 w-8 h-8 bg-[#34c759] rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
            </div>
          ) : error ? (
            // Show error state
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <AlertCircle className="w-12 h-12 text-[#ff3b30] mb-3" />
              <p className="text-[15px] text-[#ff3b30]">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={startCamera}
              >
                ลองใหม่
              </Button>
            </div>
          ) : (
            // Show video stream
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {showCaptureButton && (
          <div className="flex gap-2">
            {photo ? (
              <Button
                type="button"
                variant="secondary"
                onClick={resetPhoto}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                ถ่ายใหม่
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={capturePhoto}
                disabled={!isReady}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                ถ่ายรูป
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);

CameraCapture.displayName = "CameraCapture";
