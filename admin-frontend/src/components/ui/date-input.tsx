import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateInputProps {
  date: string | undefined;
  onDateChange: (date: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: string; // YYYY-MM-DD format
  maxDate?: string; // YYYY-MM-DD format
}

export function DateInput({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
  minDate,
  maxDate,
}: DateInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setInputValue(date || "");
  }, [date]);

  const isDateValid = (dateString: string): boolean => {
    if (!dateString) return false;

    // Check format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return false;
    }

    // Check if it's a valid calendar date
    const [year, month, day] = dateString.split('-').map(Number);
    const testDate = new Date(year, month - 1, day);
    if (testDate.getFullYear() !== year || testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
      return false;
    }

    // Compare as strings (no timezone issues)
    if (minDate && dateString < minDate) {
      return false;
    }

    if (maxDate && dateString > maxDate) {
      return false;
    }

    return true;
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);

    if (value && isDateValid(value)) {
      onDateChange(value);
    } else if (!value) {
      onDateChange(undefined);
    }
  };

  const handleInputBlur = () => {
    if (!inputValue) {
      onDateChange(undefined);
      return;
    }

    if (isDateValid(inputValue)) {
      onDateChange(inputValue);
    } else {
      // Reset to previous valid date or empty
      setInputValue(date || "");
      if (!date) {
        onDateChange(undefined);
      }
    }
  };

  const handleContainerClick = () => {
    // Trigger the native date picker by clicking the input
    inputRef.current?.showPicker?.();
  };

  return (
    <div className={cn("relative w-full", className)} onClick={handleContainerClick}>
      <input
        ref={inputRef}
        type="date"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onBlur={handleInputBlur}
        placeholder="dd.mm.yyyy"
        disabled={disabled}
        className="flex h-12 w-full rounded-md border-2 border-gray-200 bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground hover:border-primary focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pr-10 cursor-pointer"
        style={{
          colorScheme: 'light',
          WebkitAppearance: 'none',
          MozAppearance: 'textfield',
        }}
        min={minDate}
        max={maxDate}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <CalendarIcon className="h-5 w-5 text-gray-500" />
      </div>
    </div>
  );
}
