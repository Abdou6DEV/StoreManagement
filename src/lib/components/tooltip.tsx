import React, { ReactNode, useState, useRef } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  className,
}) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const show = () => {
    timeoutRef.current = window.setTimeout(() => setVisible(true), 100);
  };
  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <span
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 z-50 whitespace-nowrap px-2 py-1 rounded bg-black text-white text-xs opacity-0 scale-95 transition-all duration-200 ${
          visible ? "opacity-100 scale-100 -translate-y-full" : ""
        } ${className || ""}`}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
};

export default Tooltip;

// TypeScript module declaration for import resolution
export type { TooltipProps };
