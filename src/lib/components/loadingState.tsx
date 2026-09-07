import { useTranslation } from "react-i18next";
import { ChartLine } from "lucide-react";
import { cn } from "../utils";
import { Typing } from "./ui/typing";

interface LoadingStateProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconSize?: string;
  /** Text color class for dots; `bg-*` is mapped to `text-*`. */
  dotColor?: string;
  dotSize?: string;
  minHeight?: string;
  className?: string;
  showDots?: boolean;
  showIcon?: boolean;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function LoadingState({
  title,
  description,
  icon: Icon = ChartLine,
  iconColor = "text-green-500",
  iconSize = "w-20 h-20",
  dotColor = "text-green-500",
  minHeight = "min-h-[60vh]",
  className,
  showDots = true,
  showIcon = true,
  titleClassName,
  descriptionClassName,
}: LoadingStateProps) {
  const { t } = useTranslation();
  const typingColor = dotColor.startsWith("bg-")
    ? dotColor.replace(/^bg-/, "text-")
    : dotColor;

  return (
    <div className={cn("flex flex-col items-center justify-center gap-6", minHeight, className)}>
      {/* Animated Icon */}
      {showIcon && Icon && (
        <Icon className={cn(iconSize, iconColor, "animate-pulse")} />
      )}
      
      {/* Loading Text */}
      {(title || description) && (
        <div className="text-center space-y-2">
          {title && (
            <h3 className={cn("text-xl font-semibold text-foreground", titleClassName)}>
              {title}
            </h3>
          )}
          {description && (
            <p className={cn("text-sm text-muted-foreground", descriptionClassName)}>
              {description}
            </p>
          )}
        </div>
      )}
      
      {/* Same 3-dot animation as preload */}
      {showDots && (
        <Typing
          className={cn("h-2 w-8", typingColor)}
          label={title || t("dashboard.loading", "Loading")}
        />
      )}
    </div>
  );
}
