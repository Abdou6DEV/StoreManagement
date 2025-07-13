import { ChevronUp, ChevronDown } from "lucide-react";

interface StyledNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export default function StyledNumberInput({
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  placeholder = "",
}: StyledNumberInputProps) {
  const handleStep = (dir: "up" | "down") => {
    const newValue = dir === "up" ? value + step : value - step;
    if (newValue >= min && newValue <= max) onChange(newValue);
  };

  return (
    <div className="relative w-full">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-4 py-3 pr-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
      />
      <div className="absolute right-1 top-1 flex flex-col">
        <button
          type="button"
          onClick={() => handleStep("up")}
          className="w-8 h-4 flex items-center justify-center rounded hover:bg-muted transition-colors"
        >
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={() => handleStep("down")}
          className="w-8 h-4 flex items-center justify-center rounded hover:bg-muted transition-colors"
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
