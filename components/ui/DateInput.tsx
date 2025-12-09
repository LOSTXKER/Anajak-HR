"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parse, isValid, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay } from "date-fns";
import { th } from "date-fns/locale";

interface DateInputProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * DateInput component ที่แสดงวันที่ในรูปแบบ DD/MM/YYYY
 */
export function DateInput({
  value,
  onChange,
  label,
  placeholder = "วว/ดด/ปปปป",
  min,
  max,
  className = "",
  disabled = false,
}: DateInputProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [displayValue, setDisplayValue] = useState("");
  const [viewDate, setViewDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  useEffect(() => {
    if (value) {
      const date = parse(value, "yyyy-MM-dd", new Date());
      if (isValid(date)) {
        setDisplayValue(format(date, "dd/MM/yyyy"));
        setViewDate(date);
      }
    } else {
      setDisplayValue("");
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/[^\d]/g, "");
    
    // Auto-format as user types
    if (input.length >= 2) {
      input = input.slice(0, 2) + "/" + input.slice(2);
    }
    if (input.length >= 5) {
      input = input.slice(0, 5) + "/" + input.slice(5, 9);
    }
    
    setDisplayValue(input);

    // Parse complete date
    if (input.length === 10) {
      const parsed = parse(input, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        const isoDate = format(parsed, "yyyy-MM-dd");
        
        // Check min/max constraints
        if (min && isoDate < min) return;
        if (max && isoDate > max) return;
        
        onChange(isoDate);
        setViewDate(parsed);
      }
    }
  };

  const handleBlur = () => {
    // On blur, validate and reformat
    if (displayValue.length === 10) {
      const parsed = parse(displayValue, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        setDisplayValue(format(parsed, "dd/MM/yyyy"));
      } else {
        setDisplayValue("");
        onChange("");
      }
    } else if (displayValue.length > 0) {
      // Invalid partial input
      if (value) {
        const date = parse(value, "yyyy-MM-dd", new Date());
        setDisplayValue(format(date, "dd/MM/yyyy"));
      } else {
        setDisplayValue("");
      }
    }
  };

  const handleDateSelect = (date: Date) => {
    const isoDate = format(date, "yyyy-MM-dd");
    
    // Check min/max constraints
    if (min && isoDate < min) return;
    if (max && isoDate > max) return;
    
    onChange(isoDate);
    setDisplayValue(format(date, "dd/MM/yyyy"));
    setShowCalendar(false);
  };

  const isDateDisabled = (date: Date) => {
    const isoDate = format(date, "yyyy-MM-dd");
    if (min && isoDate < min) return true;
    if (max && isoDate > max) return true;
    return false;
  };

  // Generate calendar days
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart); // 0 = Sunday

  const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : null;

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => setShowCalendar(true)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={10}
          className={`
            w-full px-4 py-2.5 pr-10 rounded-xl border border-[#d2d2d7] 
            focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10
            outline-none text-[15px] transition-all
            disabled:bg-[#f5f5f7] disabled:text-[#86868b]
          `}
        />
        <button
          type="button"
          onClick={() => !disabled && setShowCalendar(!showCalendar)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] transition-colors"
        >
          <Calendar className="w-5 h-5" />
        </button>

        {/* Calendar Popup */}
        {showCalendar && !disabled && (
          <div className="absolute z-50 mt-2 p-4 bg-white rounded-2xl shadow-xl border border-[#e8e8ed] min-w-[280px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setViewDate(subMonths(viewDate, 1))}
                className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-[#6e6e73]" />
              </button>
              <span className="text-[15px] font-semibold text-[#1d1d1f]">
                {format(viewDate, "MMMM yyyy", { locale: th })}
              </span>
              <button
                type="button"
                onClick={() => setViewDate(addMonths(viewDate, 1))}
                className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-[#6e6e73]" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => (
                <div
                  key={day}
                  className="text-center text-[12px] font-medium text-[#86868b] py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month start */}
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              
              {days.map((day) => {
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const isDisabled = isDateDisabled(day);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => !isDisabled && handleDateSelect(day)}
                    disabled={isDisabled}
                    className={`
                      w-9 h-9 rounded-full text-[14px] transition-all
                      ${isSelected
                        ? "bg-[#0071e3] text-white font-medium"
                        : isToday
                        ? "bg-[#0071e3]/10 text-[#0071e3] font-medium"
                        : isDisabled
                        ? "text-[#d2d2d7] cursor-not-allowed"
                        : "text-[#1d1d1f] hover:bg-[#f5f5f7]"
                      }
                    `}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            {/* Today button */}
            <div className="mt-4 pt-4 border-t border-[#e8e8ed]">
              <button
                type="button"
                onClick={() => handleDateSelect(new Date())}
                className="w-full py-2 text-[14px] font-medium text-[#0071e3] hover:bg-[#0071e3]/10 rounded-lg transition-colors"
              >
                วันนี้
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

