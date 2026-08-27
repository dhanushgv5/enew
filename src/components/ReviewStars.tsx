'use client';

import { Star } from 'lucide-react';

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  interactive?: boolean;
}

// Renders 5 stars. Pass `onChange` + `interactive` to use as a rating input;
// omit them to use as a read-only display (e.g. inside a review card).
export default function ReviewStars({ value, onChange, size = 18, interactive = false }: Props) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-0.5" role={interactive ? 'radiogroup' : undefined}>
      {stars.map((star) => {
        const filled = star <= Math.round(value);
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
            aria-label={interactive ? `Rate ${star} out of 5` : undefined}
          >
            <Star
              width={size}
              height={size}
              className={filled ? 'text-[color:var(--color-signal)]' : 'text-[color:var(--color-ink-soft)]'}
              fill={filled ? 'currentColor' : 'none'}
              strokeWidth={filled ? 0 : 1.75}
            />
          </button>
        );
      })}
    </div>
  );
}