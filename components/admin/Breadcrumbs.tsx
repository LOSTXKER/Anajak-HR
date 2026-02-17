"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const pathLabels: Record<string, string> = {
  admin: "Dashboard",
  employees: "พนักงาน",
  attendance: "การเข้างาน",
  requests: "คำขอ",
  approvals: "อนุมัติ",
  monitor: "Monitor",
  payroll: "เงินเดือน",
  reports: "รายงาน",
  settings: "ตั้งค่า",
  announcements: "ประกาศ",
  branches: "สาขา",
  holidays: "วันหยุด",
  tools: "เครื่องมือ",
  "quick-fix": "Quick Fix",
  "work-time": "เวลาทำงาน",
  "ot-payroll": "OT & เงินเดือน",
  "leave-quota": "โควต้าวันลา",
  "auto-approve": "อนุมัติอัตโนมัติ",
  notifications: "การแจ้งเตือน",
  line: "LINE",
  "push-test": "ทดสอบ Push",
  create: "สร้าง",
  edit: "แก้ไข",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  const breadcrumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = pathLabels[segment] || segment;
    const isLast = index === segments.length - 1;
    const isUUID = /^[0-9a-f-]{36}$/i.test(segment);

    if (isUUID) return null;

    return { href, label, isLast };
  }).filter(Boolean) as { href: string; label: string; isLast: boolean }[];

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 text-[13px] mb-2">
      {breadcrumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#c7c7cc]" />}
          {crumb.isLast ? (
            <span className="text-[#86868b]">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-[#0071e3] hover:underline"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
