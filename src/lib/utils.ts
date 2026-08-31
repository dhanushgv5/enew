import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * The one helper every shadcn/ui component is built on.
 *
 * - clsx() lets you pass conditional classes as objects/arrays/strings and
 *   collapses them into one string, e.g. cn('p-2', isActive && 'bg-brand').
 * - twMerge() then resolves conflicting Tailwind classes so the LAST one
 *   wins, the way you'd expect - e.g. cn('px-2', 'px-4') correctly produces
 *   'px-4' instead of leaving both classes in the string (which would
 *   otherwise render inconsistently depending on CSS source order).
 *
 * This matters most when a component has default classes AND accepts a
 * `className` prop for the caller to override - cn(defaultClasses, className)
 * guarantees the caller's overrides actually win.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
