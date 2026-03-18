"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Lock, Eye, EyeOff, Copy, Check } from "lucide-react";
import { authFetch } from "@/lib/utils/auth-fetch";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

function generateRandomPassword(length = 8): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const pw = generateRandomPassword();
    setNewPassword(pw);
    setShowPassword(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);

    try {
      const response = await authFetch("/api/admin/reset-password", {
        method: "POST",
        body: JSON.stringify({ employeeId, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword("");
    setShowPassword(false);
    setError("");
    setSuccess(false);
    setCopied(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="รีเซ็ตรหัสผ่าน" size="sm">
      {success ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-[#34c759]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-[#34c759]" />
          </div>
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
            รีเซ็ตรหัสผ่านสำเร็จ
          </h3>
          <p className="text-[15px] text-[#86868b] mb-4">
            รหัสผ่านใหม่ของ {employeeName} คือ
          </p>
          <div className="flex items-center justify-center gap-2 bg-[#f5f5f7] rounded-xl py-3 px-4 mb-6">
            <code className="text-[18px] font-mono font-semibold text-[#1d1d1f] select-all">
              {newPassword}
            </code>
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-[#e8e8ed] rounded-lg transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-[#34c759]" />
              ) : (
                <Copy className="w-4 h-4 text-[#86868b]" />
              )}
            </button>
          </div>
          <p className="text-[13px] text-[#ff9500] mb-6">
            กรุณาบันทึกรหัสผ่านนี้ไว้ และส่งให้พนักงานทราบ
          </p>
          <Button onClick={handleClose} fullWidth>
            เสร็จสิ้น
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="text-[15px] text-[#86868b] mb-5">
            ตั้งรหัสผ่านใหม่ให้ <span className="font-medium text-[#1d1d1f]">{employeeName}</span>
          </p>

          <div className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={<Lock className="w-5 h-5" />}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <Button
              type="button"
              variant="secondary"
              fullWidth
              size="sm"
              onClick={handleGenerate}
            >
              สุ่มรหัสผ่านอัตโนมัติ
            </Button>

            {error && (
              <div className="text-center py-2 px-4 bg-[#ff3b30]/10 rounded-xl">
                <p className="text-[14px] text-[#ff3b30]">{error}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              รีเซ็ตรหัสผ่าน
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
