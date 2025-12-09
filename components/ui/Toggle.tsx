"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  size = "md",
}: ToggleProps) {
  const sizes = {
    sm: { toggle: "w-9 h-5", dot: "w-4 h-4", translate: "translate-x-4" },
    md: { toggle: "w-11 h-6", dot: "w-5 h-5", translate: "translate-x-5" },
    lg: { toggle: "w-14 h-7", dot: "w-6 h-6", translate: "translate-x-7" },
  };

  const s = sizes[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        ${s.toggle}
        relative inline-flex shrink-0 cursor-pointer items-center rounded-full
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:ring-offset-2
        ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : ""
        }
        ${
          checked
            ? "bg-[#0071e3]"
            : "bg-[#d2d2d7]"
        }
      `}
    >
      {label && <span className="sr-only">{label}</span>}
      <span
        className={`
          ${s.dot}
          pointer-events-none inline-block rounded-full bg-white shadow-lg
          ring-0 transition duration-200 ease-in-out
          ${
            checked
              ? s.translate
              : "translate-x-0.5"
          }
        `}
      />
    </button>
  );
}

