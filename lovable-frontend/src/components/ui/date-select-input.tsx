import * as React from "react";
import { cn } from "@/lib/utils";

interface DateSelectInputProps {
  date: string | undefined; // YYYY-MM-DD
  onDateChange: (date: string | undefined) => void;
  className?: string;
  disabled?: boolean;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  defaultYear?: number;
}

const MONTHS = [
  { value: "01", label: "JAN" },
  { value: "02", label: "FEB" },
  { value: "03", label: "MAR" },
  { value: "04", label: "APR" },
  { value: "05", label: "MAY" },
  { value: "06", label: "JUN" },
  { value: "07", label: "JUL" },
  { value: "08", label: "AUG" },
  { value: "09", label: "SEP" },
  { value: "10", label: "OCT" },
  { value: "11", label: "NOV" },
  { value: "12", label: "DEC" },
];

const parseYMD = (ymd?: string): { y: number; m: number; d: number } | null => {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
};

const daysInMonth = (year: number, month1to12: number) => {
  return new Date(year, month1to12, 0).getDate();
};

export function DateSelectInput({
  date,
  onDateChange,
  className,
  disabled = false,
  minDate,
  maxDate,
  defaultYear,
}: DateSelectInputProps) {
  const [year, setYear] = React.useState<string>(defaultYear ? String(defaultYear) : "");
  const [month, setMonth] = React.useState<string>("");
  const [day, setDay] = React.useState<string>("");

  const min = React.useMemo(() => parseYMD(minDate), [minDate]);
  const max = React.useMemo(() => parseYMD(maxDate), [maxDate]);

  // Sync internal state with external date prop.
  React.useEffect(() => {
    const parsed = parseYMD(date);
    if (parsed) {
      setYear(String(parsed.y));
      setMonth(String(parsed.m).padStart(2, "0"));
      setDay(String(parsed.d).padStart(2, "0"));
    } else {
      setYear(defaultYear ? String(defaultYear) : "");
      setMonth("");
      setDay("");
    }
  }, [date, defaultYear]);

  const currentYear = new Date().getFullYear();
  const minYear = min ? min.y : 1900;
  const maxYear = max ? max.y : Math.max(currentYear + 20, minYear + 20);

  const years = React.useMemo(() => {
    const ys: number[] = [];
    for (let y = minYear; y <= maxYear; y++) ys.push(y);

    // Match Zanzibar behavior:
    // - DOB-like pickers typically pass maxDate and minDate="1900-01-01" → descending (current/max year → 1900)
    // - Travel dates use minDate (optionally with a maxDate range) → ascending
    const isDobStylePastPicker = !!max && (!minDate || minDate === "1900-01-01");
    return isDobStylePastPicker ? ys.reverse() : ys;
  }, [minYear, maxYear, minDate, max]);

  const selectedYearNum = year ? parseInt(year, 10) : NaN;
  const selectedMonthNum = month ? parseInt(month, 10) : NaN;

  const monthRange = React.useMemo(() => {
    let start = 1;
    let end = 12;
    if (min && year && selectedYearNum === min.y) start = Math.max(start, min.m);
    if (max && year && selectedYearNum === max.y) end = Math.min(end, max.m);
    return { start, end };
  }, [min, max, year, selectedYearNum]);

  const dayRange = React.useMemo(() => {
    let start = 1;
    let end = 31;

    if (year && month && !Number.isNaN(selectedYearNum) && !Number.isNaN(selectedMonthNum)) {
      end = daysInMonth(selectedYearNum, selectedMonthNum);
    }

    if (min && year && month && selectedYearNum === min.y && selectedMonthNum === min.m) {
      start = Math.max(start, min.d);
    }

    if (max && year && month && selectedYearNum === max.y && selectedMonthNum === max.m) {
      end = Math.min(end, max.d);
    }

    return { start, end };
  }, [min, max, year, month, selectedYearNum, selectedMonthNum]);

  // If year changes and current month/day become invalid, reset them.
  React.useEffect(() => {
    if (!year) return;
    if (month) {
      const m = parseInt(month, 10);
      if (m < monthRange.start || m > monthRange.end) {
        setMonth("");
        setDay("");
      }
    }
  }, [year, month, monthRange.start, monthRange.end]);

  React.useEffect(() => {
    if (!year || !month || !day) return;
    const d = parseInt(day, 10);
    if (d < dayRange.start) setDay(String(dayRange.start).padStart(2, "0"));
    else if (d > dayRange.end) setDay(String(dayRange.end).padStart(2, "0"));
  }, [year, month, day, dayRange.start, dayRange.end]);

  // Emit combined YYYY-MM-DD when complete and within min/max.
  React.useEffect(() => {
    if (year && month && day) {
      const y = year.trim();
      const m = month.trim().padStart(2, "0");
      const d = day.trim().padStart(2, "0");
      const dateString = `${y}-${m}-${d}`;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return;
      if (minDate && dateString < minDate) return;
      if (maxDate && dateString > maxDate) return;

      onDateChange(dateString);
    } else if (!year && !month && !day) {
      onDateChange(undefined);
    } else {
      // Incomplete date -> clear value so validation catches it
      onDateChange(undefined);
    }
  }, [year, month, day, minDate, maxDate, onDateChange]);

  const baseSelectClass =
    "h-12 w-full rounded-md border-2 border-gray-200 bg-background px-2 py-2 text-sm ring-offset-background hover:border-primary focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className={cn("flex flex-nowrap gap-2 w-full", className)}>
      {/* Day */}
      <select
        value={day}
        onChange={(e) => setDay(e.target.value)}
        disabled={disabled}
        className={cn(baseSelectClass, "min-w-0 flex-1")}
      >
        <option value="" disabled>
          Day
        </option>
        {Array.from({ length: dayRange.end - dayRange.start + 1 }, (_, i) => {
          const v = dayRange.start + i;
          return (
            <option key={v} value={String(v).padStart(2, "0")}>
              {v}
            </option>
          );
        })}
      </select>

      {/* Month */}
      <select
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        disabled={disabled}
        className={cn(baseSelectClass, "min-w-0 flex-1")}
      >
        <option value="" disabled>
          Month
        </option>
        {MONTHS.filter((m) => {
          const mNum = parseInt(m.value, 10);
          return mNum >= monthRange.start && mNum <= monthRange.end;
        }).map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      {/* Year */}
      <select
        value={year}
        onChange={(e) => setYear(e.target.value)}
        disabled={disabled}
        className={cn(baseSelectClass, "min-w-0 flex-1")}
      >
        <option value="" disabled>
          Year
        </option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
