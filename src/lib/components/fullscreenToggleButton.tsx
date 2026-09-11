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

async function readIsFullscreen(): Promise<boolean> {
  if (window.api?.app?.isFullScreen) {
    return Boolean(await window.api.app.isFullScreen());
  }
  return Boolean(document.fullscreenElement);
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

  useEffect(() => {
    void readIsFullscreen().then(setIsFullscreen);

    const handleHtmlFullscreenChange = () => {
      void readIsFullscreen().then(setIsFullscreen);
    };
    document.addEventListener("fullscreenchange", handleHtmlFullscreenChange);

    const unsubscribe = window.api?.app?.onFullscreenChanged?.((next) => {
      setIsFullscreen(next);
    });

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleHtmlFullscreenChange,
      );
      unsubscribe?.();
    };
  }, []);

  const toggleFullscreen = () => {
    if (window.api?.app?.toggleFullScreen) {
      void window.api.app.toggleFullScreen().then(setIsFullscreen);
      return;
    }

    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
    } else {
      void document.exitFullscreen();
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
