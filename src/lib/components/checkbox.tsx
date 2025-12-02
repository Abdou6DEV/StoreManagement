import React from "react";

type CheckboxColor = "cyan" | "orange" | "blue" | "green" | "red" | "purple" | "pink" | "yellow";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  color?: CheckboxColor;
}

const colorClasses: Record<CheckboxColor, { checked: string; hover: string }> = {
  cyan: {
    checked: "bg-cyan-600 border-cyan-600",
    hover: "hover:border-cyan-400 dark:hover:border-cyan-500",
  },
  orange: {
    checked: "bg-orange-600 border-orange-600",
    hover: "hover:border-orange-400 dark:hover:border-orange-500",
  },
  blue: {
    checked: "bg-blue-600 border-blue-600",
    hover: "hover:border-blue-400 dark:hover:border-blue-500",
  },
  green: {
    checked: "bg-green-600 border-green-600",
    hover: "hover:border-green-400 dark:hover:border-green-500",
  },
  red: {
    checked: "bg-red-600 border-red-600",
    hover: "hover:border-red-400 dark:hover:border-red-500",
  },
  purple: {
    checked: "bg-purple-600 border-purple-600",
    hover: "hover:border-purple-400 dark:hover:border-purple-500",
  },
  pink: {
    checked: "bg-pink-600 border-pink-600",
    hover: "hover:border-pink-400 dark:hover:border-pink-500",
  },
  yellow: {
    checked: "bg-yellow-600 border-yellow-600",
    hover: "hover:border-yellow-400 dark:hover:border-yellow-500",
  },
};

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = "",
  labelClassName = "",
  color = "cyan",
}) => {
  const colors = colorClasses[color];

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <label 
      className={`flex items-center space-x-2 cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      onClick={handleClick}
    >
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors pointer-events-none ${
          checked
            ? `${colors.checked} text-white`
            : `border-gray-300 ${colors.hover} dark:border-gray-600`
        } ${disabled ? "cursor-not-allowed" : ""}`}
      >
        {checked && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      {label && (
        <span className={`text-sm ${labelClassName}`}>{label}</span>
      )}
    </label>
  );
};

