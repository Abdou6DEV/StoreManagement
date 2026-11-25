import { useEffect, useState } from "react";
import type { LucideProps } from "lucide-react";
import {
  Calculator,
  ChartLine,
  FileText,
  History,
  Home,
  Info,
  PackageSearch,
  Settings,
  ShoppingCart,
  Users,
  Wrench,
} from "lucide-react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { CircularProgress } from "./ui/circular-progress";
import { cn } from "../utils";

export const PAGE_PRESENTATION = {
  home: { Icon: Home, color: "text-primary" },
  dashboard: { Icon: ChartLine, color: "text-green-500" },
  clients: { Icon: Users, color: "text-red-500" },
  cashier: { Icon: ShoppingCart, color: "text-yellow-500" },
  stock: { Icon: PackageSearch, color: "text-green-600" },
  history: { Icon: History, color: "text-blue-500" },
  bills: { Icon: FileText, color: "text-purple-500" },
  services: { Icon: Wrench, color: "text-cyan-500" },
  zakat: { Icon: Calculator, color: "text-emerald-500" },
  administrator: { Icon: Settings, color: "text-orange-500" },
  about: { Icon: Info, color: "text-blue-500" },
} as const;

export type PresentationPage = keyof typeof PAGE_PRESENTATION;

export function HoverScale({
  whileHover,
  whileTap,
  transition,
  ...props
}: HTMLMotionProps<"div">) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      {...props}
      whileHover={reduceMotion ? undefined : whileHover}
      whileTap={reduceMotion ? undefined : whileTap}
      transition={transition ?? { type: "spring", stiffness: 340, damping: 20 }}
    />
  );
}

export function PageIcon({
  page,
  className,
  ...props
}: Omit<LucideProps, "className"> & {
  page: PresentationPage;
  className?: string;
}) {
  const { Icon, color } = PAGE_PRESENTATION[page];
  return <Icon className={cn(color, "shrink-0", className)} {...props} />;
}

export function MenuCardContent({
  page,
  title,
  compact = false,
}: {
  page: PresentationPage;
  title: string;
  compact?: boolean;
}) {
  const { Icon, color } = PAGE_PRESENTATION[page];
  return (
    <div className={cn("flex items-center gap-4 mb-3", compact && "mobile-menu-card-content")}>
      <Icon
        size={40}
        className={cn(color, "transition-colors duration-300 group-hover:text-red-400")}
        aria-hidden="true"
      />
      <h2 className="font-bold capitalize text-lg transition-colors duration-300 group-hover:text-primary">
        {title}
      </h2>
    </div>
  );
}

export function UserBadgeAvatar({
  isAdmin,
  username,
  size = "md",
  className,
  setupProgress,
  setupProgressAnimationKey,
}: {
  isAdmin: boolean;
  username: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  setupProgress?: number;
  setupProgressAnimationKey?: number;
}) {
  const config = {
    sm: { avatar: "w-9 h-9", initial: "text-base", ring: "w-11 h-11", ringSize: 44 },
    md: { avatar: "w-11 h-11", initial: "text-lg", ring: "w-[3.25rem] h-[3.25rem]", ringSize: 52 },
    lg: { avatar: "w-12 h-12", initial: "text-xl", ring: "w-[3.5rem] h-[3.5rem]", ringSize: 56 },
  }[size];
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    if (setupProgress === undefined) {
      setAnimatedProgress(0);
      return;
    }

    setAnimatedProgress(0);
    const frame = window.requestAnimationFrame(() => {
      setAnimatedProgress(setupProgress);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [setupProgress, setupProgressAnimationKey]);

  return (
    <HoverScale
      className={cn("relative flex shrink-0 items-center justify-center", config.ring, className)}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.96 }}
      aria-hidden="true"
    >
      {setupProgress !== undefined && (
        <CircularProgress
          value={Math.max(10, animatedProgress)}
          size={config.ringSize}
          thickness={8}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          aria-label="Setup progress"
        />
      )}
      <div
        className={cn(
          "relative z-10 flex shrink-0 items-center justify-center overflow-hidden rounded-full border font-semibold shadow-sm",
          isAdmin
            ? "border-orange-300/70 bg-gradient-to-br from-orange-400 via-orange-500 to-amber-700 text-white dark:border-orange-400/40"
            : "border-primary/20 bg-gradient-to-br from-primary/70 to-primary text-primary-foreground",
          config.avatar,
        )}
      >
        <span className={cn("select-none font-bold leading-none", config.initial)}>
          {username.trim().charAt(0).toLocaleUpperCase() || "?"}
        </span>
      </div>
    </HoverScale>
  );
}
