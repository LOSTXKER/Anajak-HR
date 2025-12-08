import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const variants = {
    default: "bg-[#f5f5f7] text-[#6e6e73]",
    success: "bg-[#34c759]/10 text-[#248a3d]",
    warning: "bg-[#ff9500]/10 text-[#c93400]",
    danger: "bg-[#ff3b30]/10 text-[#d70015]",
    info: "bg-[#0071e3]/10 text-[#0071e3]",
  };

  return (
    <span
      className={`
        inline-flex items-center px-3 py-1
        text-sm font-medium rounded-full
        ${variants[variant]}
      `}
    >
      {children}
    </span>
  );
}
