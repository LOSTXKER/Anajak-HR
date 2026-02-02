"use client";

import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";

export type SuccessScreenVariant = "success" | "error" | "warning" | "pending";

interface SuccessScreenProps {
  /**
   * The variant determines the icon and color scheme
   */
  variant?: SuccessScreenVariant;
  /**
   * Main title text
   */
  title: string;
  /**
   * Subtitle/description text
   */
  subtitle?: string;
  /**
   * Additional content to render below the subtitle
   */
  children?: React.ReactNode;
  /**
   * Custom icon to use instead of the default
   */
  icon?: React.ReactNode;
  /**
   * Custom background color for the icon circle
   */
  iconBgColor?: string;
}

const variantConfig: Record<
  SuccessScreenVariant,
  { Icon: typeof CheckCircle; bgColor: string }
> = {
  success: {
    Icon: CheckCircle,
    bgColor: "bg-[#34c759]",
  },
  error: {
    Icon: XCircle,
    bgColor: "bg-[#ff3b30]",
  },
  warning: {
    Icon: AlertCircle,
    bgColor: "bg-[#ff9500]",
  },
  pending: {
    Icon: Clock,
    bgColor: "bg-[#0071e3]",
  },
};

/**
 * SuccessScreen Component
 * A reusable full-screen success/error/warning message display
 */
export function SuccessScreen({
  variant = "success",
  title,
  subtitle,
  children,
  icon,
  iconBgColor,
}: SuccessScreenProps) {
  const config = variantConfig[variant];
  const Icon = config.Icon;
  const bgColor = iconBgColor || config.bgColor;

  return (
    <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-6">
      <div className="text-center animate-scale-in">
        <div
          className={`w-20 h-20 ${bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}
        >
          {icon || <Icon className="w-10 h-10 text-white" strokeWidth={2.5} />}
        </div>
        <h2 className="text-[28px] font-semibold text-[#1d1d1f] mb-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[17px] text-[#86868b]">{subtitle}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}

// Pre-configured variants for common use cases

export function CheckinSuccessScreen() {
  return (
    <SuccessScreen
      variant="success"
      title="เช็คอินสำเร็จ"
      subtitle="บันทึกเวลาเข้างานเรียบร้อยแล้ว"
    />
  );
}

export function CheckoutSuccessScreen() {
  return (
    <SuccessScreen
      variant="success"
      title="เช็คเอาท์สำเร็จ"
      subtitle="บันทึกเวลาออกงานเรียบร้อยแล้ว"
    />
  );
}

export function OTRequestSuccessScreen({ isAutoApproved }: { isAutoApproved?: boolean }) {
  return (
    <SuccessScreen
      variant={isAutoApproved ? "success" : "pending"}
      title={isAutoApproved ? "อนุมัติอัตโนมัติ" : "ส่งคำขอสำเร็จ"}
      subtitle={
        isAutoApproved
          ? "คำขอทำงานล่วงเวลาได้รับการอนุมัติแล้ว"
          : "รอการอนุมัติจากหัวหน้างาน"
      }
    />
  );
}

export function LeaveRequestSuccessScreen({ isAutoApproved }: { isAutoApproved?: boolean }) {
  return (
    <SuccessScreen
      variant={isAutoApproved ? "success" : "pending"}
      title={isAutoApproved ? "อนุมัติอัตโนมัติ" : "ส่งคำขอสำเร็จ"}
      subtitle={
        isAutoApproved
          ? "คำขอของคุณได้รับการอนุมัติทันที"
          : "รอการอนุมัติจากหัวหน้างาน"
      }
    />
  );
}

export function WFHRequestSuccessScreen({ isAutoApproved }: { isAutoApproved?: boolean }) {
  return (
    <SuccessScreen
      variant={isAutoApproved ? "success" : "pending"}
      title={isAutoApproved ? "อนุมัติอัตโนมัติ" : "ส่งคำขอสำเร็จ"}
      subtitle={
        isAutoApproved
          ? "คำขอ WFH ได้รับการอนุมัติแล้ว"
          : "รอการอนุมัติจากหัวหน้างาน"
      }
    />
  );
}

export function FieldWorkRequestSuccessScreen({ isAutoApproved }: { isAutoApproved?: boolean }) {
  return (
    <SuccessScreen
      variant={isAutoApproved ? "success" : "pending"}
      title={isAutoApproved ? "อนุมัติอัตโนมัติ" : "ส่งคำขอสำเร็จ"}
      subtitle={
        isAutoApproved
          ? "คำขอปฏิบัติงานนอกสถานที่ได้รับการอนุมัติแล้ว"
          : "รอการอนุมัติจากหัวหน้างาน"
      }
    />
  );
}

export function OTStartSuccessScreen() {
  return (
    <SuccessScreen
      variant="success"
      title="เริ่มทำ OT สำเร็จ"
      subtitle="บันทึกเวลาเริ่มทำงานล่วงเวลาแล้ว"
    />
  );
}

export function OTEndSuccessScreen({ hours }: { hours?: number }) {
  return (
    <SuccessScreen
      variant="success"
      title="สิ้นสุด OT สำเร็จ"
      subtitle={hours ? `ทำงานล่วงเวลารวม ${hours.toFixed(1)} ชั่วโมง` : "บันทึกเวลาสิ้นสุดแล้ว"}
    />
  );
}
