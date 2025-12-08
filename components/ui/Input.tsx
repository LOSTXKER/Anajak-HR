import { InputHTMLAttributes, ReactNode, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-[17px] font-medium text-[#1d1d1f]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-[#86868b]">{icon}</span>
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-4 py-3.5 text-[17px]
              bg-[#f5f5f7] rounded-xl
              border-0
              placeholder:text-[#86868b]
              focus:bg-white focus:ring-4 focus:ring-[#0071e3]/20
              transition-all duration-200
              ${icon ? "pl-12" : ""}
              ${error ? "ring-2 ring-[#ff3b30]" : ""}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-[#ff3b30]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
