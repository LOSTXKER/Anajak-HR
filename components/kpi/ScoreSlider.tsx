"use client";

const SCORE_LABELS: Record<number, string> = {
  1: "ต้องปรับปรุง",
  2: "ต่ำกว่ามาตรฐาน",
  3: "ตามมาตรฐาน",
  4: "ดี",
  5: "ดีเยี่ยม",
};

const SCORE_COLORS: Record<number, string> = {
  1: "#ff3b30",
  2: "#ff9f0a",
  3: "#ffcc00",
  4: "#30d158",
  5: "#0071e3",
};

interface ScoreSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function ScoreSlider({ value, onChange, min = 1, max = 5, disabled = false }: ScoreSliderProps) {
  const scores = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {scores.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => !disabled && onChange(score)}
            disabled={disabled}
            className={`
              flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200
              ${value === score
                ? "text-white shadow-sm scale-105"
                : disabled
                  ? "bg-[#f5f5f7] text-[#86868b] cursor-not-allowed"
                  : "bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#e8e8ed]"
              }
            `}
            style={value === score ? { backgroundColor: SCORE_COLORS[score] } : undefined}
          >
            {score}
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-[13px] text-center font-medium" style={{ color: SCORE_COLORS[value] }}>
          {SCORE_LABELS[value]}
        </p>
      )}
    </div>
  );
}
