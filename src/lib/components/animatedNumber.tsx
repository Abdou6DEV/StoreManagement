import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../utils";

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return prefersReducedMotion;
}

export type UseAnimatedNumberOptions = {
  /** Animation length in ms. Default 900. */
  duration?: number;
  /** When false, value updates instantly. Default true. */
  enabled?: boolean;
};

/** Returns a smoothly interpolated number that eases toward `target`. */
export function useAnimatedNumber(
  target: number,
  options?: UseAnimatedNumberOptions,
): number {
  const { duration = 900, enabled = true } = options ?? {};
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);
  const displayRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const safeTarget = Number.isFinite(target) ? target : 0;

    if (!enabled || prefersReducedMotion) {
      displayRef.current = safeTarget;
      setDisplayValue(safeTarget);
      return;
    }

    const from = displayRef.current;
    const to = safeTarget;
    if (from === to) return;

    let startTime: number | null = null;

    const tick = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const next = from + (to - from) * eased;
      displayRef.current = next;
      setDisplayValue(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        displayRef.current = to;
        setDisplayValue(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, enabled, prefersReducedMotion]);

  return displayValue;
}

export type AnimatedNumberProps = {
  value: number;
  className?: string;
  duration?: number;
  enabled?: boolean;
  locale?: string;
  /** Custom formatter receives the rounded animated value. */
  format?: (value: number) => ReactNode;
  /** Round during animation for integer count-up. Default true. */
  round?: boolean;
};

/** Animated count-up number for dashboards, stats, and KPIs. */
export function AnimatedNumber({
  value,
  className,
  duration = 900,
  enabled = true,
  locale,
  format,
  round = true,
}: AnimatedNumberProps) {
  const animated = useAnimatedNumber(value, { duration, enabled });
  const display = round ? Math.round(animated) : animated;
  const content = format ? format(display) : display.toLocaleString(locale);

  return <span className={cn("tabular-nums", className)}>{content}</span>;
}
