import { ChevronUp, ChevronDown } from "lucide-react";

interface StyledNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
}

export default function StyledNumberInput({
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  placeholder = "",
  disabled = false,
}: StyledNumberInputProps) {
  const handleStep = (dir: "up" | "down") => {
    if (disabled) return;
    const newValue = dir === "up" ? value + step : value - step;
    if (newValue >= min && newValue <= max) onChange(newValue);
  };

  return (
    <div className="relative w-full">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onFocus={(e) => {
          if (value === 0) {
            e.target.select(); // 👈 select the "0" so typing replaces it
          }
        }}
        className="w-full px-4 py-3 pr-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
      <div className="absolute right-1 top-1 flex flex-col">
        <button
          type="button"
          onClick={() => handleStep("up")}
          className="w-8 h-5 flex items-center justify-center rounded hover:bg-muted transition-colors"
          disabled={disabled}
        >
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={() => handleStep("down")}
          className="w-8 h-5 flex items-center justify-center rounded hover:bg-muted transition-colors"
          disabled={disabled}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
