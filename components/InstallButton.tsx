"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // ตรวจสอบว่าแอปถูกติดตั้งแล้วหรือไม่
    const checkIfInstalled = () => {
      // ตรวจสอบว่าเปิดจาก standalone mode (ติดตั้งแล้ว)
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setIsInstalled(true);
        return true;
      }
      // ตรวจสอบจาก localStorage
      if (localStorage.getItem("pwa-installed") === "true") {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    if (checkIfInstalled()) return;

    // จับ event เมื่อเบราว์เซอร์พร้อมให้ติดตั้ง PWA
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // จับ event เมื่อติดตั้งสำเร็จ
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem("pwa-installed", "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      // แสดง install prompt
      await deferredPrompt.prompt();

      // รอผลการตัดสินใจของผู้ใช้
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
        localStorage.setItem("pwa-installed", "true");
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error("Error during installation:", error);
    } finally {
      setIsInstalling(false);
    }
  };

  // ไม่แสดงปุ่มถ้า:
  // 1. ติดตั้งแล้ว
  // 2. ไม่มี install prompt (เบราว์เซอร์ไม่รองรับหรือเงื่อนไขไม่ครบ)
  if (isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <Button
      fullWidth
      variant="primary"
      onClick={handleInstallClick}
      disabled={isInstalling}
      size="lg"
      className="mb-4"
    >
      <Download className="w-5 h-5" />
      {isInstalling ? "กำลังติดตั้ง..." : "ติดตั้งแอป"}
    </Button>
  );
}

