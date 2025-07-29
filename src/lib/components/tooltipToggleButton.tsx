import React from "react";
import { Button } from "./button";
import { MessageSquare, MessageSquareOff } from "lucide-react";
import { useTooltip } from "../contexts/tooltipContext";
import { cn } from "../utils";
import { useTranslation } from "react-i18next";

interface TooltipToggleButtonProps {
  className?: string;
  variant?:
    | "default"
    | "ghost"
    | "outline"
    | "secondary"
    | "destructive"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
}

export const TooltipToggleButton: React.FC<TooltipToggleButtonProps> = ({
  className,
  variant = "ghost",
  size = "default",
  showText = true,
}) => {
  const { showTooltips, toggleTooltips } = useTooltip();
  const { t } = useTranslation();

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("flex items-center justify-between w-full", className)}
      onClick={toggleTooltips}
      aria-label={`${showTooltips ? "Disable" : "Enable"} tooltips`}
    >
      <div className="flex items-center gap-2 rtl:flex-row-reverse">
        {showText && (
          <span>
            {showTooltips
              ? t("navigation.tooltipsOn")
              : t("navigation.tooltipsOff")}
          </span>
        )}
      </div>

      {/* Animated switch with tooltip icons */}
      <div className="relative inline-flex items-center rtl:order-first">
        <div className="w-10 h-5 flex items-center rounded-full bg-gray-300 dark:bg-gray-600 p-0.5 transition-colors duration-300">
          <div
            className={cn(
              "rounded-full h-5 w-5 flex items-center justify-center transform transition-transform duration-300 ease-in-out",
              showTooltips
                ? "translate-x-5 bg-green-500 text-white"
                : "-translate-x-1 bg-gray-50 text-gray-500",
            )}
          >
            {showTooltips ? (
              <MessageSquare className="w-1 h-1" />
            ) : (
              <MessageSquareOff className="w-1 h-1" />
            )}
          </div>
        </div>
      </div>
    </Button>
  );
};
