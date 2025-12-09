"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ children, content, position = "bottom" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = 0;
    let left = 0;

    switch (position) {
      case "top":
        top = rect.top + scrollY - 8;
        left = rect.left + scrollX + rect.width / 2;
        break;
      case "bottom":
        top = rect.bottom + scrollY + 8;
        left = rect.left + scrollX + rect.width / 2;
        break;
      case "left":
        top = rect.top + scrollY + rect.height / 2;
        left = rect.left + scrollX - 8;
        break;
      case "right":
        top = rect.top + scrollY + rect.height / 2;
        left = rect.right + scrollX + 8;
        break;
    }

    setCoords({ top, left });
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const getTransformOrigin = () => {
    switch (position) {
      case "top":
        return "translateX(-50%) translateY(-100%)";
      case "bottom":
        return "translateX(-50%)";
      case "left":
        return "translateX(-100%) translateY(-50%)";
      case "right":
        return "translateY(-50%)";
    }
  };

  const getArrowStyles = () => {
    const base = "absolute w-0 h-0 border-4 border-transparent";
    switch (position) {
      case "top":
        return `${base} border-t-[#1d1d1f] top-full left-1/2 -translate-x-1/2`;
      case "bottom":
        return `${base} border-b-[#1d1d1f] bottom-full left-1/2 -translate-x-1/2`;
      case "left":
        return `${base} border-l-[#1d1d1f] left-full top-1/2 -translate-y-1/2`;
      case "right":
        return `${base} border-r-[#1d1d1f] right-full top-1/2 -translate-y-1/2`;
    }
  };

  const tooltipContent = isVisible && mounted && (
    <div
      className="fixed z-[9999] px-3 py-2 bg-[#1d1d1f] text-white text-[12px] rounded-lg shadow-xl whitespace-nowrap pointer-events-none"
      style={{
        top: coords.top,
        left: coords.left,
        transform: getTransformOrigin(),
      }}
    >
      {content}
      <div className={getArrowStyles()} />
    </div>
  );

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="inline-flex"
    >
      {children}
      {mounted && createPortal(tooltipContent, document.body)}
    </div>
  );
}

