"use client";

import { SelectHTMLAttributes, ReactNode } from "react";

interface NativeSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function NativeSelect({
  label,
  error,
  children,
  className = "",
  ...props
}: NativeSelectProps) {
  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          {...props}
          className={`
            w-full px-4 py-3 bg-[#f5f5f7] rounded-xl
            text-[15px] text-[#1d1d1f]
            border border-transparent
            transition-all duration-200
            appearance-none cursor-pointer
            focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-[#ff3b30] focus:ring-[#ff3b30]/20" : ""}
          `}
        >
          {children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-5 h-5 text-[#86868b]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-[13px] text-[#ff3b30]">{error}</p>
      )}
    </div>
  );
}

