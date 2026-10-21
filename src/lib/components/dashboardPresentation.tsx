import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../utils";

export const DASHBOARD_CHART_COLORS = {
  light: {
    grid: "#eef2f7",
    barStart: "#22c55e",
    barEnd: "#16a34a",
    line: "#16a34a",
  },
  dark: {
    grid: "#2a2a33",
    barStart: "#34d399",
    barEnd: "#059669",
    line: "#34d399",
  },
} as const;

export const DASHBOARD_SERIES_COLORS: string[] = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

export function DashboardPanel({
  children,
  className,
  stats = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { stats?: boolean }) {
  return (
    <div
      className={cn(
        "w-full p-8 bg-card rounded-xl shadow-md border flex flex-col hover:shadow-lg transition-shadow duration-300 relative",
        stats && "space-y-3 min-h-[280px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DashboardMetric({
  label,
  children,
  className,
  labelClassName,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5 text-center", className)}>
      <span
        className={cn(
          "text-sm md:text-base font-medium text-muted-foreground uppercase tracking-wide leading-none",
          labelClassName,
        )}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
