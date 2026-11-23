"use client";

import {
  Progress as ArkProgress,
  useProgress as useArkProgress,
  useProgressContext as useArkProgressContext,
} from "@ark-ui/react/progress";
import type React from "react";
import { cn } from "@/lib/utils";

export const useCircularProgress = useArkProgress;
export const useCircularProgressContext = useArkProgressContext;
export const CircularProgressContext = ArkProgress.Context;

const DEFAULT_SIZE = 32;
const DEFAULT_THICKNESS = 4;

interface CircularProgressSizeProps {
  /**
   * Width and height of the circle, in pixels.
   *
   * @default 32
   */
  size?: number;
  /**
   * Stroke width of the circle, in pixels.
   *
   * @default 4
   */
  thickness?: number;
}

const circularProgressRootClassName = cn(
  "group/circular-progress",
  "relative",
  "inline-flex flex-col items-center justify-center"
);

const sizeStyle = (size: number, thickness: number) =>
  ({
    "--size": `${size}px`,
    "--thickness": `${thickness}px`,
  }) as React.CSSProperties;

// zag throws when the first value falls outside `min` and `max`, and passes a
// later one through as it is (a ring at "120%"): keep it inside.
const clampValue = (value: number | null | undefined, min = 0, max = 100) =>
  value === null || value === undefined
    ? value
    : Math.min(max, Math.max(min, value));

export const CircularProgress = (
  props: React.ComponentProps<typeof ArkProgress.Root> &
    CircularProgressSizeProps & {
      /**
       * Shows indeterminate progress (`value={null}`).
       *
       * @default false
       */
      indeterminate?: boolean;
    }
) => {
  // The circle is the element with the `progressbar` role, so a name passed
  // to `CircularProgress` goes to it, not to the root.
  const {
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    defaultValue,
    max,
    min,
    value,
    indeterminate = false,
    size = DEFAULT_SIZE,
    thickness = DEFAULT_THICKNESS,
    className,
    style,
    children,
    ...rest
  } = props;

  return (
    <ArkProgress.Root
      className={cn(circularProgressRootClassName, className)}
      data-slot="circular-progress"
      defaultValue={clampValue(defaultValue, min, max)}
      max={max}
      min={min}
      style={{ ...sizeStyle(size, thickness), ...style }}
      value={indeterminate ? null : clampValue(value, min, max)}
      {...rest}
    >
      {children}
      <CircularProgressTrack
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        size={size}
        thickness={thickness}
      />
    </ArkProgress.Root>
  );
};

export const CircularProgressRootProvider = (
  props: React.ComponentProps<typeof ArkProgress.RootProvider> &
    CircularProgressSizeProps
) => {
  const {
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    size = DEFAULT_SIZE,
    thickness = DEFAULT_THICKNESS,
    className,
    style,
    children,
    ...rest
  } = props;

  return (
    <ArkProgress.RootProvider
      className={cn(circularProgressRootClassName, className)}
      data-slot="circular-progress"
      style={{ ...sizeStyle(size, thickness), ...style }}
      {...rest}
    >
      {children}
      <CircularProgressTrack
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        size={size}
        thickness={thickness}
      />
    </ArkProgress.RootProvider>
  );
};

export const CircularProgressTrack = (
  props: React.ComponentProps<typeof ArkProgress.Circle> &
    CircularProgressSizeProps
) => {
  const {
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    size = DEFAULT_SIZE,
    thickness = DEFAULT_THICKNESS,
    className,
    style,
    ...rest
  } = props;
  const progress = useArkProgressContext();
  // zag names the ring by its value text ("42%"). Point it at the
  // `CircularProgressLabel` instead: with no label rendered, the reference
  // finds nothing and the value text names the ring again. A name passed in
  // takes over. Only the keys in use are passed, since an `undefined` one
  // would clear zag's value text on Vue.
  const name =
    ariaLabel === undefined && ariaLabelledBy === undefined
      ? { "aria-labelledby": progress.getLabelProps().id }
      : { "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy };

  return (
    <ArkProgress.Circle
      className={cn(
        "block",
        "pointer-events-none",
        "overflow-visible",
        "motion-reduce:animate-none!",
        // `motion-safe:`, since the group variant outranks the line above
        // and would keep the ring turning under reduced motion.
        "motion-safe:group-data-[state=indeterminate]/circular-progress:animate-spin!",
        className
      )}
      data-slot="circular-progress-circle"
      style={{ ...sizeStyle(size, thickness), ...style }}
      {...name}
      {...rest}
    >
      <ArkProgress.CircleTrack
        className="stroke-border/30"
        data-slot="circular-progress-track"
      />
      <ArkProgress.CircleRange
        className={cn(
          "stroke-green-500",
          "[stroke-linecap:round]",
          "transition-[stroke-dashoffset] duration-1400 ease-out",
          "motion-reduce:transition-none!",
          "data-[state=indeterminate]:[stroke-dasharray:calc(var(--circumference)*0.3)_var(--circumference)]"
        )}
        data-slot="circular-progress-range"
      />
    </ArkProgress.Circle>
  );
};

export const CircularProgressValue = (
  props: React.ComponentProps<typeof ArkProgress.ValueText>
) => {
  const { className, ...rest } = props;

  return (
    <ArkProgress.ValueText
      className={cn(
        "absolute bottom-0",
        "flex size-(--size) items-center justify-center",
        "font-medium text-xs tabular-nums",
        "pointer-events-none",
        className
      )}
      data-slot="circular-progress-value"
      {...rest}
    />
  );
};

export const CircularProgressLabel = (
  props: React.ComponentProps<typeof ArkProgress.Label>
) => {
  const { className, ...rest } = props;

  return (
    <ArkProgress.Label
      className={cn("font-medium text-sm", className)}
      data-slot="circular-progress-label"
      {...rest}
    />
  );
};

export const CircularProgressView = (
  props: React.ComponentProps<typeof ArkProgress.View>
) => {
  const { className, ...rest } = props;

  return (
    <ArkProgress.View
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="circular-progress-view"
      {...rest}
    />
  );
};
