"use client";

import { forwardRef } from "react";

interface TimeInputProps {
  label?: string;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
}

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  ({ label, error, value = "", onChange, className = "", disabled, min, max }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-[14px] font-medium text-[#1d1d1f]">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type="time"
            value={value}
            onChange={handleChange}
            disabled={disabled}
            min={min}
            max={max}
            className={`
              w-full px-4 py-3 text-[15px] text-center font-medium
              bg-[#f5f5f7] rounded-xl
              border-0
              focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20
              transition-all duration-200
              ${error ? "ring-2 ring-[#ff3b30]" : ""}
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              ${className}
            `}
          />
        </div>
        {error && (
          <p className="text-sm text-[#ff3b30]">{error}</p>
        )}
      </div>
    );
  }
);

TimeInput.displayName = "TimeInput";
