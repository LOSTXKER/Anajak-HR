"use client";

import React, { useState, useEffect } from "react";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number | string;
  className?: string;
  disabled?: boolean;
  suffix?: string;
  prefix?: string;
}

/**
 * NumberInput component ที่อนุญาตให้ลบเลข 0 ได้
 * เก็บค่าเป็น string ระหว่าง input และแปลงเป็น number เมื่อ blur หรือ submit
 */
export function NumberInput({
  value,
  onChange,
  label,
  placeholder = "0",
  min,
  max,
  step = 1,
  className = "",
  disabled = false,
  suffix,
  prefix,
}: NumberInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(
    value === 0 ? "" : String(value)
  );

  // Sync with external value changes
  useEffect(() => {
    setDisplayValue(value === 0 ? "" : String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Allow empty string
    if (rawValue === "") {
      setDisplayValue("");
      onChange(0);
      return;
    }

    // Allow valid number input (including decimals and negatives)
    if (/^-?\d*\.?\d*$/.test(rawValue)) {
      setDisplayValue(rawValue);
      const numValue = parseFloat(rawValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      }
    }
  };

  const handleBlur = () => {
    // On blur, format the value properly
    if (displayValue === "" || displayValue === "-" || displayValue === ".") {
      setDisplayValue("");
      onChange(0);
      return;
    }

    let numValue = parseFloat(displayValue);
    
    // Apply min/max constraints
    if (min !== undefined && numValue < min) {
      numValue = min;
    }
    if (max !== undefined && numValue > max) {
      numValue = max;
    }

    setDisplayValue(numValue === 0 ? "" : String(numValue));
    onChange(numValue);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b] text-[14px]">
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-2.5 rounded-xl border border-[#d2d2d7] 
            focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10
            outline-none text-[15px] transition-all
            disabled:bg-[#f5f5f7] disabled:text-[#86868b]
            ${prefix ? "pl-8" : ""}
            ${suffix ? "pr-12" : ""}
          `}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#86868b] text-[14px]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

