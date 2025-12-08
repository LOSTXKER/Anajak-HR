"use client";

import { forwardRef } from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[15px] font-medium text-[#1d1d1f] mb-2">
            {label}
            {props.required && <span className="text-[#ff3b30] ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full px-4 py-3 
            bg-[#f5f5f7] rounded-xl 
            text-[15px] text-[#1d1d1f] 
            placeholder:text-[#86868b]
            border-2 border-transparent
            focus:bg-white focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10
            transition-all duration-200 outline-none
            resize-none
            ${error ? "border-[#ff3b30] focus:border-[#ff3b30] focus:ring-[#ff3b30]/10" : ""}
            ${props.disabled ? "opacity-50 cursor-not-allowed" : ""}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-2 text-[13px] text-[#ff3b30]">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-2 text-[13px] text-[#86868b]">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

