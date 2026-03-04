import { useLocation } from "react-router-dom";
import { cn } from "../utils";

export type PageTransitionEffect =
  | "fadeUp"      // default: fade + slide up
  | "fade"        // fade only
  | "slideRight"  // slide in from right
  | "slideLeft"   // slide in from left
  | "scale";      // subtle zoom in

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  /** Which transition effect to use. Default: "fadeUp" */
  effect?: PageTransitionEffect;
}

const effectClass: Record<PageTransitionEffect, string> = {
  fadeUp: "page-transition-enter",
  fade: "page-transition-fade",
  slideRight: "page-transition-slide-right",
  slideLeft: "page-transition-slide-left",
  scale: "page-transition-scale",
};

/**
 * Wraps route content so each navigation gets a smooth enter animation.
 * key={pathname} makes the new page mount and run the chosen effect.
 */
export default function PageTransition({
  children,
  className,
  effect = "fadeUp",
}: PageTransitionProps) {
  const location = useLocation();

  return (
    <div key={location.pathname} className={cn(effectClass[effect], className)}>
      {children}
    </div>
  );
}
