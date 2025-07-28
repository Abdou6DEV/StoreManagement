import React, { useState, useEffect } from "react";
import { Button } from "./button";
import { Monitor, MonitorOff } from "lucide-react";
import { cn } from "../utils";
import { useTranslation } from "react-i18next";

interface FullscreenToggleButtonProps {
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

export const FullscreenToggleButton: React.FC<FullscreenToggleButtonProps> = ({
  className,
  variant = "ghost",
  size = "default",
  showText = true,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(
    !!document.fullscreenElement,
  );
  const { t } = useTranslation();

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("flex items-center justify-between w-full", className)}
      onClick={toggleFullscreen}
      aria-label={`Switch to ${isFullscreen ? "exit" : "enter"} fullscreen mode`}
    >
      <div className="flex items-center gap-2 rtl:flex-row-reverse">
        {showText && (
          <span>
            {isFullscreen
              ? t("navigation.exitFullscreen", "Exit Fullscreen")
              : t("navigation.fullscreen", "Fullscreen")}
          </span>
        )}
      </div>

      {/* Fullscreen icons */}
      <div className="flex items-center rtl:order-first">
        {isFullscreen ? (
          <MonitorOff className="w-4 h-4 text-red-400" />
        ) : (
          <Monitor className="w-4 h-4 text-blue-400" />
        )}
      </div>
    </Button>
  );
};
