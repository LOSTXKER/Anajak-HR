"use client";

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  S: { bg: "bg-[#bf5af2]/10", text: "text-[#bf5af2]" },
  A: { bg: "bg-[#30d158]/10", text: "text-[#30d158]" },
  "B+": { bg: "bg-[#0071e3]/10", text: "text-[#0071e3]" },
  B: { bg: "bg-[#007aff]/10", text: "text-[#007aff]" },
  "C+": { bg: "bg-[#ff9f0a]/10", text: "text-[#ff9f0a]" },
  C: { bg: "bg-[#ff9f0a]/10", text: "text-[#ff9f0a]" },
  D: { bg: "bg-[#ff3b30]/10", text: "text-[#ff3b30]" },
};

interface GradeBadgeProps {
  grade: string | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const GRADE_LABELS: Record<string, string> = {
  S: "Outstanding",
  A: "Excellent",
  "B+": "Very Good",
  B: "Good",
  "C+": "Fair",
  C: "Needs Improvement",
  D: "Poor",
};

export function GradeBadge({ grade, size = "md", showLabel = false }: GradeBadgeProps) {
  if (!grade) return <span className="text-[#86868b] text-[13px]">-</span>;

  const colors = GRADE_COLORS[grade] || GRADE_COLORS.D;
  const sizeClasses = {
    sm: "text-[12px] px-2 py-0.5",
    md: "text-[14px] px-3 py-1",
    lg: "text-[18px] px-4 py-1.5 font-bold",
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${colors.bg} ${colors.text} ${sizeClasses[size]} font-semibold rounded-lg`}>
        {grade}
      </span>
      {showLabel && (
        <span className="text-[13px] text-[#86868b]">{GRADE_LABELS[grade]}</span>
      )}
    </span>
  );
}
