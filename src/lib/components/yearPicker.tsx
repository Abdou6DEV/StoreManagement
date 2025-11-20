import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "../utils";
import { useTranslation } from "react-i18next";

interface YearPickerProps {
  value?: string; // Format: "YYYY"
  onChange?: (date: string) => void; // Format: "YYYY"
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: string; // Format: "YYYY"
  max?: string; // Format: "YYYY"
  availableDates?: string[]; // Array of years in YYYY format that have data
}

export function YearPicker({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  min,
  max,
  availableDates,
}: YearPickerProps) {
  const { t } = useTranslation();
  const defaultPlaceholder = t("datePicker.selectYear");
  const [isOpen, setIsOpen] = useState(false);
  const [currentDecade, setCurrentDecade] = useState(() => {
    if (value) {
      const year = parseInt(value);
      return Math.floor(year / 10) * 10;
    }
    const currentYear = new Date().getFullYear();
    return Math.floor(currentYear / 10) * 10;
  });
  const [selectedYear, setSelectedYear] = useState<number | null>(
    value ? parseInt(value) : null
  );

  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (value) {
      const year = parseInt(value);
      setSelectedYear(year);
      setCurrentDecade(Math.floor(year / 10) * 10);
    }
  }, [value]);

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    onChange?.(year.toString());
    setIsOpen(false);
  };

  const goToPreviousDecade = () => {
    setCurrentDecade(currentDecade - 10);
  };

  const goToNextDecade = () => {
    setCurrentDecade(currentDecade + 10);
  };

  const isYearDisabled = (year: number) => {
    const yearStr = year.toString();
    
    // Only apply min/max constraints if they are provided and valid
    if (min && yearStr < min) return true;
    if (max && yearStr > max) return true;
    
    // If availableDates is provided, only enable years in that list
    if (availableDates && availableDates.length > 0) {
      return !availableDates.includes(yearStr);
    }
    
    return false;
  };

  const isCurrentYear = (year: number) => {
    const today = new Date();
    return year === today.getFullYear();
  };

  const isSelected = (year: number) => {
    return selectedYear === year;
  };

  const renderYears = () => {
    const years = [];
    for (let i = 0; i < 10; i++) {
      const year = currentDecade + i;
      const disabled = isYearDisabled(year);
      const current = isCurrentYear(year);
      const selected = isSelected(year);
      
      years.push(
        <button
          key={year}
          onClick={() => !disabled && handleYearSelect(year)}
          disabled={disabled}
          className={cn(
            "h-10 w-16 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            disabled && "text-muted-foreground cursor-not-allowed",
            !disabled && "hover:bg-accent hover:text-accent-foreground",
            current && "bg-primary text-primary-foreground",
            selected && !current && "bg-ring text-ring-foreground",
            !selected && !current && !disabled && "text-foreground"
          )}
        >
          {year}
        </button>
      );
    }
    return years;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedYear && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {selectedYear ? selectedYear.toString() : (placeholder || defaultPlaceholder)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="rounded-md border bg-popover p-3 shadow-md">
          {/* Header */}
          <div className="flex items-center justify-between pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousDecade}
              className="h-7 w-7 p-0"
              aria-label={t("datePicker.previousDecade")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              {currentDecade} - {currentDecade + 9}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextDecade}
              className="h-7 w-7 p-0"
              aria-label={t("datePicker.nextDecade")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Years grid */}
          <div className="grid grid-cols-5 gap-1">
            {renderYears()}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
