import React from "react";
import { Button } from "./button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils";

interface ThemeToggleButtonProps {
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

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  className,
  variant = "ghost",
  size = "default",
  showText = true,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("flex items-center justify-between w-full", className)}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <div className="flex items-center gap-2">
        {showText && <span>{isDark ? "Dark Mode" : "Light Mode"}</span>}
      </div>

      {/* Animated switch with neutral icons */}
      <div className="relative inline-flex items-center">
        <div className="w-10 h-5 flex items-center rounded-full bg-gray-300 dark:bg-gray-600 p-0.5 transition-colors duration-300">
          <div
            className={cn(
              "rounded-full h-5 w-5 flex items-center justify-center transform transition-transform duration-300 ease-in-out",
              isDark
                ? "translate-x-5 bg-black text-gray"
                : "-translate-x-1 bg-gray-50 text-gray",
            )}
          >
            {isDark ? (
              <Moon className="w-1 h-1 text-sky-400" />
            ) : (
              <Sun className="w-1 h-1 text-yellow-400" />
            )}
          </div>
        </div>
      </div>
    </Button>
  );
};
