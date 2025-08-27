import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "../utils";

interface MonthPickerProps {
  value?: string; // Format: "YYYY-MM"
  onChange?: (date: string) => void; // Format: "YYYY-MM"
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: string; // Format: "YYYY-MM"
  max?: string; // Format: "YYYY-MM"
}

export function MonthPicker({
  value,
  onChange,
  placeholder = "Select month",
  className,
  disabled = false,
  min,
  max,
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(() => {
    if (value) {
      const [year] = value.split("-");
      return parseInt(year);
    }
    return new Date().getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(
    value ? (() => {
      const [year, month] = value.split("-");
      return { year: parseInt(year), month: parseInt(month) };
    })() : null
  );

  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (value) {
      const [year, month] = value.split("-");
      setSelectedMonth({ year: parseInt(year), month: parseInt(month) });
      setCurrentYear(parseInt(year));
    }
  }, [value]);

  const formatMonth = (year: number, month: number) => {
    return `${year}-${String(month).padStart(2, '0')}`;
  };

  const handleMonthSelect = (month: number) => {
    const newSelection = { year: currentYear, month };
    setSelectedMonth(newSelection);
    onChange?.(formatMonth(currentYear, month));
    setIsOpen(false);
  };

  const goToPreviousYear = () => {
    setCurrentYear(currentYear - 1);
  };

  const goToNextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  const isMonthDisabled = (month: number) => {
    const monthStr = formatMonth(currentYear, month);
    
    // Only apply min/max constraints if they are provided and valid
    if (min && monthStr < min) return true;
    if (max && monthStr > max) return true;
    
    return false;
  };

  const isCurrentMonth = (month: number) => {
    const today = new Date();
    return month === today.getMonth() + 1 && currentYear === today.getFullYear();
  };

  const isSelected = (month: number) => {
    if (!selectedMonth) return false;
    return month === selectedMonth.month && currentYear === selectedMonth.year;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const renderMonths = () => {
    return monthNames.map((monthName, index) => {
      const monthNumber = index + 1;
      const disabled = isMonthDisabled(monthNumber);
      const current = isCurrentMonth(monthNumber);
      const selected = isSelected(monthNumber);
      
      return (
        <button
          key={monthNumber}
          onClick={() => !disabled && handleMonthSelect(monthNumber)}
          disabled={disabled}
          className={cn(
            "h-12 w-full rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            disabled && "text-muted-foreground cursor-not-allowed",
            !disabled && "hover:bg-accent hover:text-accent-foreground",
            current && "bg-primary text-primary-foreground",
            selected && !current && "bg-ring text-ring-foreground",
            !selected && !current && !disabled && "text-foreground"
          )}
        >
          {monthName}
        </button>
      );
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedMonth && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {selectedMonth 
            ? `${monthNames[selectedMonth.month - 1]} ${selectedMonth.year}`
            : placeholder
          }
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="rounded-md border bg-popover p-3 shadow-md">
          {/* Header */}
          <div className="flex items-center justify-between pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousYear}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              {currentYear}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextYear}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Months grid */}
          <div className="grid grid-cols-3 gap-1">
            {renderMonths()}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
