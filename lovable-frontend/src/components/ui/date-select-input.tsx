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

/** Clamp day to valid range for given year/month and min/max constraints */
const clampDay = (
  day: number,
  year: number,
  month: number,
  min: { y: number; m: number; d: number } | null,
  max: { y: number; m: number; d: number } | null
): number => {
  if (!year || !month) return day;
  const maxDay = daysInMonth(year, month);
  let lo = 1;
  let hi = maxDay;
  if (min && year === min.y && month === min.m) lo = Math.max(lo, min.d);
  if (max && year === max.y && month === max.m) hi = Math.min(hi, max.d);
  return Math.max(lo, Math.min(hi, day));
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

  // Stable ref for onDateChange to avoid stale closures
  const onDateChangeRef = React.useRef(onDateChange);
  onDateChangeRef.current = onDateChange;

  // Track last emitted value to deduplicate
  const lastEmittedRef = React.useRef(date);

  // Emit helper — only calls onDateChange if the value actually changed
  const emit = React.useCallback(
    (y: string, m: string, d: string) => {
      if (y && m && d) {
        const yStr = y.trim();
        const mStr = m.trim().padStart(2, "0");
        const dStr = d.trim().padStart(2, "0");
        const dateString = `${yStr}-${mStr}-${dStr}`;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return;
        if (minDate && dateString < minDate) return;
        if (maxDate && dateString > maxDate) return;

        if (lastEmittedRef.current !== dateString) {
          lastEmittedRef.current = dateString;
          onDateChangeRef.current(dateString);
        }
      } else {
        if (lastEmittedRef.current !== undefined) {
          lastEmittedRef.current = undefined;
          onDateChangeRef.current(undefined);
        }
      }
    },
    [minDate, maxDate]
  );

  // Sync internal state with external date prop (one-way, from parent).
  React.useEffect(() => {
    const parsed = parseYMD(date);
    if (parsed) {
      const yStr = String(parsed.y);
      const mStr = String(parsed.m).padStart(2, "0");
      const dStr = String(parsed.d).padStart(2, "0");
      setYear(yStr);
      setMonth(mStr);
      setDay(dStr);
      lastEmittedRef.current = date;
    } else if (!date) {
      setYear(defaultYear ? String(defaultYear) : "");
      setMonth("");
      setDay("");
      lastEmittedRef.current = undefined;
    }
  }, [date, defaultYear]);

  const currentYear = new Date().getFullYear();
  const minYear = min ? min.y : 1900;
  const maxYear = max ? max.y : Math.max(currentYear + 20, minYear + 20);

  const years = React.useMemo(() => {
    const ys: number[] = [];
    for (let y = minYear; y <= maxYear; y++) ys.push(y);
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

  // --- onChange handlers that clamp first, then emit ---

  const handleYearChange = (newYear: string) => {
    const yNum = parseInt(newYear, 10);
    setYear(newYear);

    // Check if current month is still valid for new year
    let newMonth = month;
    if (month) {
      const mNum = parseInt(month, 10);
      let mStart = 1;
      let mEnd = 12;
      if (min && yNum === min.y) mStart = Math.max(mStart, min.m);
      if (max && yNum === max.y) mEnd = Math.min(mEnd, max.m);
      if (mNum < mStart || mNum > mEnd) {
        newMonth = "";
        setMonth("");
        setDay("");
        emit(newYear, "", "");
        return;
      }
    }

    // Clamp day
    let newDay = day;
    if (newMonth && day) {
      const mNum = parseInt(newMonth, 10);
      const dNum = parseInt(day, 10);
      const clamped = clampDay(dNum, yNum, mNum, min, max);
      newDay = String(clamped).padStart(2, "0");
      if (newDay !== day) setDay(newDay);
    }

    emit(newYear, newMonth, newDay);
  };

  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);

    let newDay = day;
    if (year && day) {
      const yNum = parseInt(year, 10);
      const mNum = parseInt(newMonth, 10);
      const dNum = parseInt(day, 10);
      const clamped = clampDay(dNum, yNum, mNum, min, max);
      newDay = String(clamped).padStart(2, "0");
      if (newDay !== day) setDay(newDay);
    }

    emit(year, newMonth, newDay);
  };

  const handleDayChange = (newDay: string) => {
    setDay(newDay);
    emit(year, month, newDay);
  };

  const baseSelectClass =
    "h-12 w-full rounded-md border-2 border-gray-200 bg-background px-2 py-2 text-sm ring-offset-background hover:border-primary focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className={cn("flex flex-nowrap gap-2 w-full", className)}>
      {/* Day */}
      <select
        value={day}
        onChange={(e) => handleDayChange(e.target.value)}
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
        onChange={(e) => handleMonthChange(e.target.value)}
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
        onChange={(e) => handleYearChange(e.target.value)}
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
