import React, { ReactNode, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils";
import { useTooltip } from "../contexts/tooltipContext";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  /** Classes for the hover target wrapper (default: inline-block) */
  triggerClassName?: string;
  delay?: number;
  position?: "top" | "bottom" | "left" | "right";
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  className,
  triggerClassName,
  delay = 200,
  position = "top",
}) => {
  const { showTooltips } = useTooltip();
  const [visible, setVisible] = useState(false);
  const [tooltipCoords, setTooltipCoords] = useState({ x: -1000, y: -1000 });
  const timeoutRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = () => {
    if (!showTooltips) return;

    // Cancel any pending hide-from-leave so a quick re-enter doesn't glitch
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Calculate position immediately
    updatePosition();

    // Start animation after the configured delay
    const id = window.setTimeout(() => {
      setVisible(true);
      timeoutRef.current = null;
    }, delay);
    timeoutRef.current = id;
  };

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 8;

    // Get the effective position considering RTL
    const isRTL = document.documentElement.getAttribute("dir") === "rtl";
    const effectivePosition =
      isRTL && (position === "left" || position === "right")
        ? position === "left"
          ? "right"
          : "left"
        : position;

    let x = rect.left + rect.width / 2;
    let y = rect.top + rect.height / 2;

    switch (effectivePosition) {
      case "top":
        y = rect.top - margin;
        break;
      case "bottom":
        y = rect.bottom + margin;
        break;
      case "left":
        x = rect.left - margin;
        break;
      case "right":
        x = rect.right + margin;
        break;
    }

    setTooltipCoords({ x, y });
  };

  return (
    <span
      ref={triggerRef}
      className={cn("relative", triggerClassName ?? "inline-block")}
      onMouseEnter={show}
      onMouseLeave={hide}
      onPointerEnter={show}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {createPortal(
        <div
          className={cn(
            "fixed z-[9999] px-2 py-1 rounded text-xs shadow-lg pointer-events-none",
            "bg-black text-white dark:bg-white dark:text-black",
            "opacity-0 scale-90 transition-all duration-200 ease-out",
            visible && "opacity-100 scale-100",
            "whitespace-nowrap",
            className,
          )}
          style={{
            left: `${tooltipCoords.x}px`,
            top: `${tooltipCoords.y}px`,
            transform: (() => {
              const isRTL =
                document.documentElement.getAttribute("dir") === "rtl";
              const effectivePosition =
                isRTL && (position === "left" || position === "right")
                  ? position === "left"
                    ? "right"
                    : "left"
                  : position;

              switch (effectivePosition) {
                case "top":
                  return "translate(-50%, -100%)";
                case "bottom":
                  return "translate(-50%, 0)";
                case "left":
                  return "translate(-100%, -50%)";
                case "right":
                  return "translate(0, -50%)";
                default:
                  return "translate(-50%, -100%)";
              }
            })(),
            visibility: visible ? "visible" : "hidden",
          }}
          role="tooltip"
        >
          {content}
        </div>,
        document.body,
      )}
    </span>
  );
};

export default Tooltip;

export type { TooltipProps };
