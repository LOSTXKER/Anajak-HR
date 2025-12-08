"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, title: string, message?: string) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Generate unique ID
let toastCounter = 0;
const generateId = () => `toast-${Date.now()}-${++toastCounter}-${Math.random().toString(36).slice(2, 9)}`;

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, type, title, message }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => {
    addToast("success", title, message);
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast("error", title, message);
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast("warning", title, message);
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast("info", title, message);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-[#34c759]" />,
    error: <XCircle className="w-5 h-5 text-[#ff3b30]" />,
    warning: <AlertCircle className="w-5 h-5 text-[#ff9500]" />,
    info: <Info className="w-5 h-5 text-[#0071e3]" />,
  };

  const colors = {
    success: "border-[#34c759]/20 bg-[#34c759]/5",
    error: "border-[#ff3b30]/20 bg-[#ff3b30]/5",
    warning: "border-[#ff9500]/20 bg-[#ff9500]/5",
    info: "border-[#0071e3]/20 bg-[#0071e3]/5",
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 pr-12
        bg-white rounded-xl
        shadow-[0_4px_24px_rgba(0,0,0,0.12)]
        border ${colors[toast.type]}
        min-w-[320px] max-w-[400px]
        animate-slide-in
        relative
      `}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-[#1d1d1f]">{toast.title}</p>
        {toast.message && (
          <p className="text-[13px] text-[#86868b] mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1 text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

