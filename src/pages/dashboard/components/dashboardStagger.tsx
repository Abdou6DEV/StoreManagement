import * as React from "react";
import { cn } from "../../../lib/utils";

/** Delay between each stacked dashboard section (ms). */
export const DASHBOARD_STAGGER_STEP_MS = 90;

type DashboardStaggerItemProps = {
  step: number;
  children: React.ReactNode;
  className?: string;
};

/**
 * Fade-up entrance with staggered delay. Respects prefers-reduced-motion via global CSS.
 */
export function DashboardStaggerItem({ step, children, className }: DashboardStaggerItemProps) {
  return (
    <div
      className={cn("dashboard-stagger-in", className)}
      style={
        {
          "--stagger-delay": `${step * DASHBOARD_STAGGER_STEP_MS}ms`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
