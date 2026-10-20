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
  User,
} from "lucide-react";
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
  size = "md",
  className,
}: {
  isAdmin: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const config = {
    sm: { avatar: "w-9 h-19", icon: "w-6 h-6" },
    md: { avatar: "w-11 h-11", icon: "w-8 h-8" },
    lg: { avatar: "w-12 h-12", icon: "w-8 h-8" },
  }[size];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        isAdmin ? "bg-orange-500/15 dark:bg-orange-500/20" : "bg-primary/15 text-primary",
        config.avatar,
        className,
      )}
      aria-hidden="true"
    >
      <User
        className={cn(
          "shrink-0",
          config.icon,
          isAdmin ? "text-orange-500 dark:text-orange-400" : "text-primary",
        )}
        strokeWidth={2}
      />
    </div>
  );
}
