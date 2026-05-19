import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../utils";

type AnimatedHeightProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  reduceMotion?: boolean;
  deps?: readonly unknown[];
};

/** Smooth height transition when children change size (e.g. login / welcome mode switch). */
export function AnimatedHeight({
  children,
  className,
  innerClassName,
  reduceMotion = false,
  deps = [],
}: AnimatedHeightProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const measure = () => {
      setHeight(el.scrollHeight);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- explicit deps for mode switches
  }, [reduceMotion, ...deps]);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn("overflow-hidden transition-[height] duration-300 ease-in-out", className)}
      style={{ height: height ?? "auto" }}
    >
      <div ref={innerRef} className={innerClassName}>
        {children}
      </div>
    </div>
  );
}
