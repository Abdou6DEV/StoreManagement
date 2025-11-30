import { useTranslation } from "react-i18next";
import { ChartLine } from "lucide-react";
import { cn } from "../utils";

interface LoadingStateProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconSize?: string;
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
  dotColor = "bg-green-500",
  dotSize = "w-2 h-2",
  minHeight = "min-h-[60vh]",
  className,
  showDots = true,
  showIcon = true,
  titleClassName,
  descriptionClassName,
}: LoadingStateProps) {
  const { t } = useTranslation();

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
      
      {/* Loading Dots Animation */}
      {showDots && (
        <>
          <div className="flex gap-2">
            <div 
              className={cn(dotSize, dotColor, "rounded-full")}
              style={{ 
                animation: 'higherBounce 0.9s infinite',
                animationDelay: '0ms',
              }}
            ></div>
            <div 
              className={cn(dotSize, dotColor, "rounded-full")}
              style={{ 
                animation: 'higherBounce 0.9s infinite',
                animationDelay: '150ms',
              }}
            ></div>
            <div 
              className={cn(dotSize, dotColor, "rounded-full")}
              style={{ 
                animation: 'higherBounce 0.9s infinite',
                animationDelay: '300ms',
              }}
            ></div>
          </div>
          <style>{`
            @keyframes higherBounce {
              0%, 100% {
                transform: translateY(0);
                animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
              }
              50% {
                transform: translateY(-100%);
                animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
              }
            }
          `}</style>
        </>
      )}
    </div>
  );
}

