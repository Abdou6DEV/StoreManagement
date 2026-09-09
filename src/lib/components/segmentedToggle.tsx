import React from "react";
import { cn } from "../utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedAccent = "green" | "cyan";

type SegmentedToggleProps<T extends string> = {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  /** Stretch to fill the parent width (form grid cells). */
  fullWidth?: boolean;
  /** Page accent — stock uses green, services use cyan. */
  accent?: SegmentedAccent;
  /** Accessible name for the group */
  "aria-label"?: string;
};

const accentSelected: Record<SegmentedAccent, string> = {
  green: "bg-muted text-green-600 shadow-sm dark:text-green-400",
  cyan: "bg-muted text-cyan-600 shadow-sm dark:text-cyan-400",
};

const accentRing: Record<SegmentedAccent, string> = {
  green: "focus-visible:ring-green-500/50",
  cyan: "focus-visible:ring-cyan-500/50",
};

/** Matches form inputs using `px-4 py-3 text-sm` + border. */
export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  className,
  fullWidth = false,
  accent = "green",
  "aria-label": ariaLabel,
}: SegmentedToggleProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex h-11 shrink-0 items-stretch rounded-lg border border-border bg-background p-0.5",
        fullWidth && "flex w-full",
        disabled && "opacity-60",
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled && option.value !== value) onChange(option.value);
            }}
            className={cn(
              "inline-flex h-full items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
              fullWidth ? "flex-1" : "min-w-[5.5rem]",
              "focus-visible:outline-none focus-visible:ring-2",
              accentRing[accent],
              "disabled:cursor-not-allowed",
              selected
                ? accentSelected[accent]
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
