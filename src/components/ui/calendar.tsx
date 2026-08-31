'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarProps {
  /** Currently chosen date, if any - gets highlighted in the grid. */
  selected?: Date;
  /** Fires with the clicked date (always at local midnight). */
  onSelect?: (date: Date) => void;
  /** Return true to gray out and disable a given date (e.g. past dates). */
  disabled?: (date: Date) => boolean;
  className?: string;
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * A real shadcn project normally wraps `react-day-picker` here for things
 * like range selection and locale support. This hand-rolled version covers
 * the single-date case (which is all we need for scheduling a pickup) using
 * nothing but native Date math, so there's no extra dependency to version-
 * match against your Tailwind/React versions.
 */
export default function Calendar({ selected, onSelect, disabled, className }: CalendarProps) {
  // Which month is currently displayed - defaults to the selected date's
  // month, or today's month if nothing is selected yet.
  const [viewDate, setViewDate] = useState(() => selected || new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay(); // 0 = Sunday

  // Build a flat array of cells: `null` for the blank leading days, then
  // one Date object per day of the month.
  const cells: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const goToPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className={cn('select-none', className)}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={goToPrevMonth}
          aria-label="Previous month"
          className="rounded-lg p-1 text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-paper-dim)] hover:text-[color:var(--color-ink)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-[color:var(--color-ink)]">
          {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={goToNextMonth}
          aria-label="Next month"
          className="rounded-lg p-1 text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-paper-dim)] hover:text-[color:var(--color-ink)]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1 text-xs font-medium text-[color:var(--color-ink-soft)]">
            {label}
          </div>
        ))}

        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;

          const isSelected = selected && sameDay(date, selected);
          const isToday = sameDay(date, new Date());
          const isDisabled = disabled?.(date) ?? false;

          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect?.(date)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors',
                isSelected
                  ? 'bg-[color:var(--color-brand)] font-semibold text-white'
                  : isToday
                    ? 'font-semibold text-[color:var(--color-brand)]'
                    : 'text-[color:var(--color-ink)] hover:bg-[color:var(--color-paper-dim)]',
                isDisabled && 'cursor-not-allowed text-[color:var(--color-ink-soft)] opacity-40 hover:bg-transparent',
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
