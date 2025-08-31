import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "../utils";
import { useTranslation } from "react-i18next";

interface DatePickerProps {
  value?: string;
  onChange?: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  min,
  max,
}: DatePickerProps) {
  const { t } = useTranslation();
  const defaultPlaceholder = t("datePicker.selectDate");
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    try {
      if (value && isValidDate(value)) {
        return new Date(value);
      }
      return new Date();
    } catch (error) {
      console.error("Error initializing current date:", error);
      return new Date();
    }
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    try {
      if (value && isValidDate(value)) {
        return new Date(value);
      }
      return null;
    } catch (error) {
      console.error("Error initializing selected date:", error);
      return null;
    }
  });

  const triggerRef = useRef<HTMLButtonElement>(null);

  // Robust date validation
  function isValidDate(dateString: string): boolean {
    if (!dateString || typeof dateString !== 'string') return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  useEffect(() => {
    try {
      if (value && isValidDate(value)) {
        const newDate = new Date(value);
        setSelectedDate(newDate);
        setCurrentDate(newDate);
      }
    } catch (error) {
      console.error("Error updating date from value:", error);
    }
  }, [value]);

  const getDaysInMonth = (date: Date) => {
    try {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    } catch (error) {
      console.error("Error getting days in month:", error);
      return 30; // fallback
    }
  };

  const getFirstDayOfMonth = (date: Date) => {
    try {
      return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    } catch (error) {
      console.error("Error getting first day of month:", error);
      return 0; // fallback
    }
  };

  const formatDate = (date: Date) => {
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  const handleDateSelect = (day: number) => {
    try {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      if (!isNaN(newDate.getTime())) {
        setSelectedDate(newDate);
        setCurrentDate(newDate);
        const formattedDate = formatDate(newDate);
        if (formattedDate) {
          onChange?.(formattedDate);
        }
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Error selecting date:", error);
    }
  };

  const goToPreviousMonth = () => {
    try {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      if (!isNaN(newDate.getTime())) {
        setCurrentDate(newDate);
      }
    } catch (error) {
      console.error("Error going to previous month:", error);
    }
  };

  const goToNextMonth = () => {
    try {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      if (!isNaN(newDate.getTime())) {
        setCurrentDate(newDate);
      }
    } catch (error) {
      console.error("Error going to next month:", error);
    }
  };

  const goToYear = (year: number) => {
    try {
      const newDate = new Date(year, currentDate.getMonth(), 1);
      if (!isNaN(newDate.getTime())) {
        setCurrentDate(newDate);
      }
    } catch (error) {
      console.error("Error going to year:", error);
    }
  };

  const goToMonth = (month: number) => {
    try {
      const newDate = new Date(currentDate.getFullYear(), month, 1);
      if (!isNaN(newDate.getTime())) {
        setCurrentDate(newDate);
      }
    } catch (error) {
      console.error("Error going to month:", error);
    }
  };

  const isDateDisabled = (day: number) => {
    try {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = formatDate(date);

      // Only apply min/max constraints if they are provided and valid
      if (min && dateStr < min) return true;
      if (max && dateStr > max) return true;

      return false;
    } catch (error) {
      console.error("Error checking if date is disabled:", error);
      return false;
    }
  };

  const isToday = (day: number) => {
    try {
      const today = new Date();
      return (
        day === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear()
      );
    } catch (error) {
      console.error("Error checking if date is today:", error);
      return false;
    }
  };

  const isSelected = (day: number) => {
    try {
      if (!selectedDate) return false;
      return (
        day === selectedDate.getDate() &&
        currentDate.getMonth() === selectedDate.getMonth() &&
        currentDate.getFullYear() === selectedDate.getFullYear()
      );
    } catch (error) {
      console.error("Error checking if date is selected:", error);
      return false;
    }
  };

  const monthNames = [
    t("datePicker.monthNames.0"), t("datePicker.monthNames.1"), t("datePicker.monthNames.2"), t("datePicker.monthNames.3"),
    t("datePicker.monthNames.4"), t("datePicker.monthNames.5"), t("datePicker.monthNames.6"), t("datePicker.monthNames.7"),
    t("datePicker.monthNames.8"), t("datePicker.monthNames.9"), t("datePicker.monthNames.10"), t("datePicker.monthNames.11")
  ];

  const dayNames = [
    t("datePicker.dayNames.0"), t("datePicker.dayNames.1"), t("datePicker.dayNames.2"), t("datePicker.dayNames.3"),
    t("datePicker.dayNames.4"), t("datePicker.dayNames.5"), t("datePicker.dayNames.6")
  ];

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);

  const renderCalendarDays = () => {
    try {
      const days = [];

      // Add empty cells for days before the first day of the month
      for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<div key={`empty-${i}`} className="h-8" />);
      }

      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const disabled = isDateDisabled(day);
        const today = isToday(day);
        const selected = isSelected(day);

        days.push(
          <button
            key={day}
            onClick={() => !disabled && handleDateSelect(day)}
            disabled={disabled}
            className={cn(
              "h-8 w-8 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              disabled && "text-muted-foreground cursor-not-allowed",
              !disabled && "hover:bg-accent hover:text-accent-foreground",
              today && "bg-primary text-primary-foreground",
              selected && !today && "bg-ring text-ring-foreground",
              !selected && !today && !disabled && "text-foreground"
            )}
          >
            {day}
          </button>
        );
      }

      return days;
    } catch (error) {
      console.error("Error rendering calendar days:", error);
      return [];
    }
  };

  const displayValue = selectedDate ? formatDate(selectedDate) : "";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {displayValue || (placeholder || defaultPlaceholder)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="rounded-md border bg-popover p-3 shadow-md">
          {/* Header */}
          <div className="flex items-center justify-between pb-2">
            {/* Month Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousMonth}
                className="h-7 w-7 p-0"
                aria-label={t("datePicker.previousMonth")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium min-w-[60px] text-center">
                {monthNames[currentDate.getMonth()]}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextMonth}
                className="h-7 w-7 p-0"
                aria-label={t("datePicker.nextMonth")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Year Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToYear(currentDate.getFullYear() - 1)}
                className="h-7 w-7 p-0"
                aria-label={t("datePicker.previousYear")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium min-w-[50px] text-center">
                {currentDate.getFullYear()}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToYear(currentDate.getFullYear() + 1)}
                className="h-7 w-7 p-0"
                aria-label={t("datePicker.nextYear")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 pb-1">
            {dayNames.map((day) => (
              <div
                key={day}
                className="h-8 w-8 text-center text-xs font-medium text-muted-foreground flex items-center justify-center"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendarDays()}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
