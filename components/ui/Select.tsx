"use client";

import { useState, useRef, useEffect, ReactNode, useId } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

// Store the currently open select ID globally
let currentOpenSelectId: string | null = null;
const listeners = new Set<(id: string | null) => void>();

function setGlobalOpenSelect(id: string | null) {
  currentOpenSelectId = id;
  listeners.forEach((listener) => listener(id));
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "เลือก...",
  label,
  disabled = false,
  className = "",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectId = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Subscribe to global state changes
  useEffect(() => {
    const handleGlobalChange = (openId: string | null) => {
      if (openId !== selectId) {
        setIsOpen(false);
      }
    };

    listeners.add(handleGlobalChange);
    return () => {
      listeners.delete(handleGlobalChange);
    };
  }, [selectId]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (currentOpenSelectId === selectId) {
          setGlobalOpenSelect(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, selectId]);

  // Update dropdown position
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const dropdownHeight = Math.min(options.length * 44 + 8, 220); // Estimate height
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const openUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

        setDropdownPosition({
          top: openUp ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          openUp,
        });
      }
    };

    updatePosition();

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, options.length]);

  const handleToggle = () => {
    if (disabled) return;

    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);

    if (newIsOpen) {
      setGlobalOpenSelect(selectId);
    } else {
      setGlobalOpenSelect(null);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setGlobalOpenSelect(null);
  };

  const dropdownContent = isOpen && mounted && (
    <div
      className="
        fixed z-[9999]
        bg-white rounded-xl
        shadow-[0_4px_24px_rgba(0,0,0,0.15)]
        border border-[#e8e8ed]
        py-1 
        max-h-[200px] overflow-y-auto
        animate-scale-in
      "
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        minWidth: '120px',
      }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleSelect(option.value)}
          className={`
            w-full flex items-center justify-between
            px-4 py-2.5 text-left text-[15px]
            transition-colors
            ${
              option.value === value
                ? "bg-[#0071e3]/10 text-[#0071e3]"
                : "text-[#1d1d1f] hover:bg-[#f5f5f7]"
            }
          `}
        >
          <span className="flex items-center gap-2 truncate">
            {option.icon}
            <span className="truncate">{option.label}</span>
          </span>
          {option.value === value && (
            <Check className="w-4 h-4 text-[#0071e3] flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && (
        <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2
          px-4 py-3 bg-[#f5f5f7] rounded-xl
          text-left text-[15px]
          transition-all duration-200
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-[#e8e8ed] cursor-pointer"}
          ${isOpen ? "bg-white ring-4 ring-[#0071e3]/20" : ""}
        `}
      >
        <span className={`truncate ${selectedOption ? "text-[#1d1d1f]" : "text-[#86868b]"}`}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.icon}
              <span className="truncate">{selectedOption.label}</span>
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-[#86868b] transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu - Render via Portal */}
      {mounted && isOpen && createPortal(dropdownContent, document.body)}
    </div>
  );
}
