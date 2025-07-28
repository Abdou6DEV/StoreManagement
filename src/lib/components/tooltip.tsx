import React, { ReactNode, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
  position?: "top" | "bottom" | "left" | "right";
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  className,
  delay = 300,
  position = "top",
}) => {
  const [visible, setVisible] = useState(false);
  const [tooltipCoords, setTooltipCoords] = useState({ x: -1000, y: -1000 });
  const timeoutRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = () => {
    // Calculate position immediately
    updatePosition();
    
    // Start animation after a small delay to ensure positioning is complete
    timeoutRef.current = window.setTimeout(() => {
      setVisible(true);
    }, 50);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    
    let x = rect.left + rect.width / 2;
    let y = rect.top + rect.height / 2;

    switch (position) {
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
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {createPortal(
        <div
          className={cn(
            "fixed z-[9999] px-2 py-1 rounded bg-black text-white text-xs whitespace-nowrap shadow-lg pointer-events-none",
            "opacity-0 scale-90 transition-all duration-200 ease-out",
            visible && "opacity-100 scale-100",
            className
          )}
          style={{
            left: `${tooltipCoords.x}px`,
            top: `${tooltipCoords.y}px`,
            transform: position === "top" ? "translate(-50%, -100%)" : 
                       position === "bottom" ? "translate(-50%, 0)" :
                       position === "left" ? "translate(-100%, -50%)" :
                       "translate(0, -50%)",
            visibility: visible ? 'visible' : 'hidden',
          }}
          role="tooltip"
        >
          {content}
        </div>,
        document.body
      )}
    </span>
  );
};

export default Tooltip;

export type { TooltipProps };
