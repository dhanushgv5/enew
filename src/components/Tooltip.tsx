'use client';

import { useId, useRef, useState, type ReactNode } from 'react';

interface Props {
  /** The text shown inside the tooltip bubble. */
  content: string;
  /** The element the tooltip is attached to - usually an icon-only button. */
  children: ReactNode;
  /** Which side of the trigger the bubble appears on. Defaults to "top". */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Extra classes for the wrapping span (layout only - keep it inline-flex friendly). */
  className?: string;
}

const SIDE_STYLES: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const ARROW_STYLES: Record<string, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 -mt-[3px] border-t-[color:var(--color-ink)] border-x-transparent border-b-transparent',
  bottom:
    'bottom-full left-1/2 -translate-x-1/2 -mb-[3px] border-b-[color:var(--color-ink)] border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 -ml-[3px] border-l-[color:var(--color-ink)] border-y-transparent border-r-transparent',
  right:
    'right-full top-1/2 -translate-y-1/2 -mr-[3px] border-r-[color:var(--color-ink)] border-y-transparent border-l-transparent',
};

// Lightweight, dependency-free tooltip. Shows on hover AND keyboard focus
// (so it works for mouse and keyboard users alike), with a short delay to
// avoid flashing on quick mouse passes. Purely presentational - it never
// intercepts pointer/click events meant for the wrapped element.
export default function Tooltip({ content, children, side = 'top', className = '' }: Props) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), 300);
  };
  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {/* aria-describedby wiring is left to the caller if they need it on a
          specific element; for icon buttons the visible label below plus
          the underlying element's own aria-label is normally sufficient. */}
      {children}
      <span
        role="tooltip"
        id={id}
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-white shadow-[var(--shadow-soft)] transition-all duration-150 ${
          SIDE_STYLES[side]
        } ${visible ? 'translate-y-0 opacity-100' : side === 'top' ? 'translate-y-1 opacity-0' : side === 'bottom' ? '-translate-y-1 opacity-0' : 'opacity-0'}`}
        style={{ backgroundColor: 'var(--color-ink)' }}
      >
        {content}
        <span className={`absolute h-0 w-0 border-4 ${ARROW_STYLES[side]}`} aria-hidden="true" />
      </span>
    </span>
  );
}
