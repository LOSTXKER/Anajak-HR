"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseCameraReturn {
  /** Live MediaStream – truthy when camera is active */
  stream: MediaStream | null;
  /** Base-64 JPEG data-URL of the captured frame, or null */
  photo: string | null;
  /** Error message if camera access failed */
  cameraError: string;
  /** Start the camera stream */
  startCamera: () => Promise<void>;
  /** Stop all tracks and release the camera */
  stopCamera: () => void;
  /** Capture a JPEG still from the current video frame */
  capturePhoto: () => void;
  /** Clear the captured photo so the live preview is shown again */
  clearPhoto: () => void;
  /** Ref to attach to the <video> element */
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

/**
 * Manages camera stream, capture and cleanup.
 * Both checkin and checkout pages share identical camera logic – this hook
 * eliminates that duplication.
 */
export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState("");

  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setCameraError("กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่าเบราว์เซอร์");
      } else if (err.name === "NotFoundError") {
        setCameraError("ไม่พบกล้องบนอุปกรณ์นี้");
      } else {
        setCameraError("ไม่สามารถเข้าถึงกล้องได้ กรุณาลองใหม่");
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    setPhoto(canvas.toDataURL("image/jpeg", 0.8));
  }, []);

  const clearPhoto = useCallback(() => setPhoto(null), []);

  // Sync videoRef.srcObject when stream changes (e.g. React StrictMode double-mount)
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return { stream, photo, cameraError, startCamera, stopCamera, capturePhoto, clearPhoto, videoRef };
}
