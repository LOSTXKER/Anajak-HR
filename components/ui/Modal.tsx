"use client";

import { ReactNode, useEffect } from "react";
import { X, AlertTriangle, Info, CheckCircle, HelpCircle } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`
          relative w-full ${sizes[size]}
          bg-white rounded-2xl
          shadow-[0_8px_32px_rgba(0,0,0,0.16)]
          animate-scale-in
        `}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8ed]">
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Confirm Dialog Component
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: "danger" | "warning" | "info" | "success";
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "warning",
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const icons = {
    danger: <AlertTriangle className="w-12 h-12 text-[#ff3b30]" />,
    warning: <AlertTriangle className="w-12 h-12 text-[#ff9500]" />,
    info: <Info className="w-12 h-12 text-[#0071e3]" />,
    success: <CheckCircle className="w-12 h-12 text-[#34c759]" />,
  };

  const iconBg = {
    danger: "bg-[#ff3b30]/10",
    warning: "bg-[#ff9500]/10",
    info: "bg-[#0071e3]/10",
    success: "bg-[#34c759]/10",
  };

  const confirmVariant = type === "danger" ? "danger" : "primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.16)] animate-scale-in">
        <div className="p-6 text-center">
          <div className={`w-20 h-20 ${iconBg[type]} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {icons[type]}
          </div>
          <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-2">{title}</h3>
          <p className="text-[15px] text-[#86868b] mb-6">{message}</p>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} fullWidth disabled={loading}>
              {cancelText}
            </Button>
            <Button variant={confirmVariant} onClick={onConfirm} fullWidth loading={loading}>
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


