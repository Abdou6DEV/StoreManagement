import React from "react";
import { Button } from "./button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../utils";

interface ThemeToggleButtonProps {
  className?: string;
  variant?: "default" | "ghost" | "outline" | "secondary" | "destructive" | "link";
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

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("flex items-center justify-between w-full", className)}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <div className="flex items-center gap-2">
        {theme === "light" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
        {showText && (
          <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
        )}
      </div>
      
      {/* Animated switch */}
      <div className="relative inline-flex items-center">
        <div className="w-10 h-5 flex items-center rounded-full bg-red-400 p-0.5">
          <div
            className={cn(
              "bg-primary rounded-full h-4 w-4 transform transition-transform duration-300 ease-in-out",
              theme === "dark" ? "translate-x-5" : "translate-x-0"
            )}
          />
        </div>
      </div>
    </Button>
  );
};