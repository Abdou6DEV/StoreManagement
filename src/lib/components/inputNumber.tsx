import React from "react";

interface StyledNumberInputProps {
  value: number | "";
  onChange: (value: number | "") => void;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  [key: string]: any; // Allow additional props like data-field, etc.
}

const StyledNumberInput = React.forwardRef<HTMLInputElement, StyledNumberInputProps>(({
  value,
  onChange,
  min = 0,
  max = 2_147_483_647,
  placeholder = "",
  disabled = false,
  onFocus,
  onKeyDown,
  ...restProps
}, ref) => {
  return (
    <div className="relative w-full">
      <input
        ref={ref}
        type="number"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "") {
            onChange("");
          } else {
            onChange(Number(val));
          }
        }}
        onFocus={(e) => {
          onFocus?.();
          if (value === 0) {
            e.target.select(); // 👈 select the "0" so typing replaces it
          }

          // Add wheel event listener to prevent value changes
          const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            event.stopPropagation();
          };

          e.target.addEventListener("wheel", handleWheel, { passive: false });

          // Clean up the event listener when focus is lost
          const handleBlur = () => {
            e.target.removeEventListener("wheel", handleWheel);
            e.target.removeEventListener("blur", handleBlur);
          };

          e.target.addEventListener("blur", handleBlur);
        }}
        onKeyDown={onKeyDown}
        className="w-full px-4 py-3 pr-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/50"
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
        {...restProps}
      />
    </div>
  );
});

StyledNumberInput.displayName = "StyledNumberInput";

export default StyledNumberInput;
