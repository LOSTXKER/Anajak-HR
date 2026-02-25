"use client";

import { forwardRef, useEffect, useState } from "react";

interface TimeInputProps {
  label?: string;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const TimeInput = forwardRef<HTMLDivElement, TimeInputProps>(
  ({ label, error, value = "", onChange, className = "", disabled }, ref) => {
    const [hours, setHours] = useState("00");
    const [minutes, setMinutes] = useState("00");

    useEffect(() => {
      if (value && value.includes(":")) {
        const [h, m] = value.split(":");
        setHours(h.padStart(2, "0"));
        setMinutes(m.substring(0, 2).padStart(2, "0"));
      }
    }, [value]);

    const emit = (h: string, m: string) => {
      onChange?.(`${h.padStart(2, "0")}:${m.padStart(2, "0")}`);
    };

    const handleHours = (raw: string) => {
      const digits = raw.replace(/\D/g, "").slice(-2);
      let n = parseInt(digits || "0", 10);
      if (n > 23) n = 23;
      const h = String(n).padStart(2, "0");
      setHours(h);
      emit(h, minutes);
    };

    const handleMinutes = (raw: string) => {
      const digits = raw.replace(/\D/g, "").slice(-2);
      let n = parseInt(digits || "0", 10);
      if (n > 59) n = 59;
      const m = String(n).padStart(2, "0");
      setMinutes(m);
      emit(hours, m);
    };

    const stepHours = (delta: number) => {
      let n = (parseInt(hours, 10) + delta + 24) % 24;
      const h = String(n).padStart(2, "0");
      setHours(h);
      emit(h, minutes);
    };

    const stepMinutes = (delta: number) => {
      let n = (parseInt(minutes, 10) + delta + 60) % 60;
      const m = String(n).padStart(2, "0");
      setMinutes(m);
      emit(hours, m);
    };

    const inputClass = `
      w-12 text-center text-[17px] font-semibold text-[#1d1d1f]
      bg-transparent border-0 outline-none
      focus:bg-white focus:rounded-lg
      ${disabled ? "opacity-50 cursor-not-allowed" : ""}
    `;

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-[14px] font-medium text-[#1d1d1f]">
            {label}
          </label>
        )}
        <div
          ref={ref}
          className={`
            flex items-center justify-center gap-1
            bg-[#f5f5f7] rounded-xl px-3 py-2
            ${error ? "ring-2 ring-[#ff3b30]" : ""}
            ${className}
          `}
        >
          {/* Hours */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => stepHours(1)}
              disabled={disabled}
              className="w-8 h-6 flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f] disabled:opacity-40 transition-colors text-lg leading-none"
            >
              ▲
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={hours}
              onChange={(e) => handleHours(e.target.value)}
              onFocus={(e) => e.target.select()}
              disabled={disabled}
              maxLength={2}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => stepHours(-1)}
              disabled={disabled}
              className="w-8 h-6 flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f] disabled:opacity-40 transition-colors text-lg leading-none"
            >
              ▼
            </button>
          </div>

          <span className="text-[22px] font-bold text-[#1d1d1f] mb-0.5 select-none">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => stepMinutes(1)}
              disabled={disabled}
              className="w-8 h-6 flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f] disabled:opacity-40 transition-colors text-lg leading-none"
            >
              ▲
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={minutes}
              onChange={(e) => handleMinutes(e.target.value)}
              onFocus={(e) => e.target.select()}
              disabled={disabled}
              maxLength={2}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => stepMinutes(-1)}
              disabled={disabled}
              className="w-8 h-6 flex items-center justify-center text-[#86868b] hover:text-[#1d1d1f] disabled:opacity-40 transition-colors text-lg leading-none"
            >
              ▼
            </button>
          </div>

          <span className="ml-2 text-[13px] font-medium text-[#86868b] select-none self-center">น.</span>
        </div>
        {error && <p className="text-sm text-[#ff3b30]">{error}</p>}
      </div>
    );
  }
);

TimeInput.displayName = "TimeInput";
