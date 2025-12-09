"use client";

import { forwardRef, useState, useEffect } from "react";

interface TimeInputProps {
  label?: string;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  ({ label, error, value = "", onChange, className = "", disabled, placeholder = "HH:MM" }, ref) => {
    const [displayValue, setDisplayValue] = useState(value || "");

    useEffect(() => {
      setDisplayValue(value || "");
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;
      
      // Remove non-numeric characters except colon
      newValue = newValue.replace(/[^\d:]/g, '');
      
      // Auto-format as HH:MM
      if (newValue.length === 2 && !newValue.includes(':')) {
        newValue = newValue + ':';
      }
      
      // Limit to HH:MM format
      if (newValue.length > 5) {
        newValue = newValue.slice(0, 5);
      }

      setDisplayValue(newValue);

      // Validate and call onChange with valid time
      if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newValue)) {
        // Normalize to HH:MM format
        const [hours, minutes] = newValue.split(':');
        const normalizedTime = `${hours.padStart(2, '0')}:${minutes}`;
        onChange?.(normalizedTime);
      }
    };

    const handleBlur = () => {
      // On blur, try to normalize the value
      if (displayValue && /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(displayValue)) {
        const [hours, minutes] = displayValue.split(':');
        const normalizedTime = `${hours.padStart(2, '0')}:${minutes}`;
        setDisplayValue(normalizedTime);
        onChange?.(normalizedTime);
      }
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
            type="text"
            inputMode="numeric"
            placeholder={placeholder}
            maxLength={5}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            className={`
              w-full px-4 py-3 text-[15px] text-center font-medium
              bg-[#f5f5f7] rounded-xl
              border-0
              placeholder:text-[#86868b]
              focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20
              transition-all duration-200
              ${error ? "ring-2 ring-[#ff3b30]" : ""}
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              ${className}
            `}
          />
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[#86868b] text-[13px]">
            น.
          </div>
        </div>
        {error && (
          <p className="text-sm text-[#ff3b30]">{error}</p>
        )}
      </div>
    );
  }
);

TimeInput.displayName = "TimeInput";

