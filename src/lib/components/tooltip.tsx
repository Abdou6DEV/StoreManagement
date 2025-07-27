import React, { ReactNode, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  portal?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  className,
  position = "top",
  delay = 300,
  portal = true,
}) => {
  const [visible, setVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = () => {
    timeoutRef.current = window.setTimeout(() => {
      setVisible(true);
      updatePosition();
    }, delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      let x = rect.left + rect.width / 2;
      let y = rect.top;

      switch (position) {
        case "top":
          y = rect.top - 8;
          break;
        case "bottom":
          y = rect.bottom + 8;
          break;
        case "left":
          x = rect.left - 8;
          y = rect.top + rect.height / 2;
          break;
        case "right":
          x = rect.right + 8;
          y = rect.top + rect.height / 2;
          break;
      }

      setTooltipPosition({ x, y });
    }
  };

  useEffect(() => {
    if (visible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [visible, position]);

  const getPositionClasses = () => {
    switch (position) {
      case "top":
        return "left-1/2 -translate-x-1/2 -translate-y-full";
      case "bottom":
        return "left-1/2 -translate-x-1/2 top-full mt-2";
      case "left":
        return "top-1/2 -translate-y-1/2 -translate-x-full";
      case "right":
        return "top-1/2 -translate-y-1/2 left-full ml-2";
      default:
        return "left-1/2 -translate-x-1/2 -translate-y-full";
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case "top":
        return "top-full left-1/2 -translate-x-1/2 border-t-gray-900";
      case "bottom":
        return "bottom-full left-1/2 -translate-x-1/2 border-b-gray-900";
      case "left":
        return "left-full top-1/2 -translate-y-1/2 border-l-gray-900";
      case "right":
        return "right-full top-1/2 -translate-y-1/2 border-r-gray-900";
      default:
        return "top-full left-1/2 -translate-x-1/2 border-t-gray-900";
    }
  };

  const tooltipElement = (
    <div
      className={cn(
        "pointer-events-none fixed z-[99999] whitespace-nowrap px-2 py-1 rounded",
        "bg-black text-white text-xs",
        "opacity-0 scale-90 transition-all duration-150 ease-out",
        visible && "opacity-100 scale-100",
        getPositionClasses(),
        className
      )}
      style={{
        left: tooltipPosition.x,
        top: tooltipPosition.y,
      }}
      role="tooltip"
    >
      {content}
    </div>
  );

  return (
    <span
      ref={triggerRef}
      className="relative block w-full"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {portal && createPortal(tooltipElement, document.body)}
      {!portal && tooltipElement}
    </span>
  );
};

export default Tooltip;

// TypeScript module declaration for import resolution
export type { TooltipProps };
