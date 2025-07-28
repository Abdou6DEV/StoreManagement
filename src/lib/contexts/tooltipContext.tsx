import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { TooltipContextType } from "../../types";

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

interface TooltipProviderProps {
  children: ReactNode;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  const [showTooltips, setShowTooltips] = useState<boolean>(() => {
    // Check localStorage first
    const savedTooltipPreference = localStorage.getItem("showTooltips");
    if (savedTooltipPreference !== null) {
      return savedTooltipPreference === "true";
    }

    // Default to true if no preference is saved
    return true;
  });

  const toggleTooltips = () => {
    setShowTooltips((prevShowTooltips) => !prevShowTooltips);
  };

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem("showTooltips", showTooltips.toString());
  }, [showTooltips]);

  return (
    <TooltipContext.Provider value={{ showTooltips, toggleTooltips }}>
      {children}
    </TooltipContext.Provider>
  );
};

export const useTooltip = () => {
  const context = useContext(TooltipContext);
  if (context === undefined) {
    throw new Error("useTooltip must be used within a TooltipProvider");
  }
  return context;
}; 