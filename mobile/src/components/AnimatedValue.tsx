import { useEffect, useRef, useState } from "react";

type AnimatedValueProps = {
  value: number;
  locale?: string;
  duration?: number;
  enabled?: boolean;
  format?: (value: number) => string;
};

export function AnimatedValue({
  value,
  locale,
  duration = 900,
  enabled = true,
  format,
}: AnimatedValueProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const displayRef = useRef(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    if (!enabled || prefersReducedMotion || duration <= 0) {
      displayRef.current = target;
      setDisplayValue(target);
      return;
    }

    const from = displayRef.current;
    if (from === target) return;

    let startTime: number | null = null;
    let frame = 0;
    const tick = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (target - from) * eased;
      displayRef.current = progress < 1 ? next : target;
      setDisplayValue(displayRef.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, enabled, prefersReducedMotion]);

  const roundedValue = Math.round(displayValue);
  const content = format
    ? format(roundedValue)
    : new Intl.NumberFormat(locale).format(roundedValue);

  return <span className="tabular-nums">{content}</span>;
}
