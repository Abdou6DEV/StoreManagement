
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
    <div className="relative max-w-[220px]">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-1.5 pr-8 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring focus:ring-primary/30 transition"
        placeholder={placeholder}
      />
      <div className="absolute right-1.5 top-1.5 flex flex-col">
        <button
          type="button"
          onClick={() => handleStep("up")}
          className="w-8 h-3 flex items-center rounded hover:bg-muted"
        >
          <ChevronUp className="w-8 h-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={() => handleStep("down")}
          className="w-8 h-3 flex items-center justify-center rounded hover:bg-muted"
        >
          <ChevronDown className="w-8 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
