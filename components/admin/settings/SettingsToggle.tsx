"use client";

import { ReactNode } from "react";

interface SettingsToggleProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}

export function SettingsToggle({
  label,
  description,
  icon,
  enabled,
  onChange,
  disabled = false,
}: SettingsToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl">
      <div className={icon ? "flex items-center gap-3" : ""}>
        {icon}
        <div>
          <span className="text-[14px] text-[#1d1d1f] block">{label}</span>
          {description && (
            <span className="text-[11px] text-[#86868b]">{description}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`
          relative w-12 h-7 rounded-full transition-colors flex-shrink-0
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${enabled ? "bg-[#34c759]" : "bg-[#d2d2d7]"}
        `}
      >
        <span
          className={`
            absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm
            ${enabled ? "right-1" : "left-1"}
          `}
        />
      </button>
    </div>
  );
}
