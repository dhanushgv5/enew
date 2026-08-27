import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'brand' | 'signal' | 'ok' | 'danger';
  hint?: string;
  onClick?: () => void;
  active?: boolean;
}

const TONES: Record<string, { bg: string; text: string }> = {
  brand: { bg: 'var(--color-brand-soft)', text: 'var(--color-brand-glow)' },
  signal: { bg: 'var(--color-signal-soft)', text: 'var(--color-signal)' },
  ok: { bg: 'var(--color-ok-soft)', text: 'var(--color-ok)' },
  danger: { bg: 'var(--color-danger-soft)', text: 'var(--color-danger)' },
};

export default function StatCard({ label, value, icon: Icon, tone = 'brand', hint, onClick, active }: Props) {
  const t = TONES[tone];
  const clickable = !!onClick;

  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`card card-interactive group relative flex items-center gap-4 overflow-hidden p-5 ${
        clickable ? 'cursor-pointer' : ''
      } ${active ? 'ring-2 ring-[color:var(--color-brand)]' : ''}`}
    >
      {/* tone wash */}
      <span
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-45"
        style={{ background: t.text }}
        aria-hidden="true"
      />
      <div
        className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-105"
        style={{
          backgroundColor: t.bg,
          color: t.text,
          borderColor: `color-mix(in srgb, ${t.text} 35%, transparent)`,
        }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="relative min-w-0">
        <p className="truncate text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]">
          {label}
        </p>
        <p className="font-display text-[1.7rem] font-bold leading-tight text-[color:var(--color-ink)] tabular-nums">
          {value}
        </p>
        {hint && <p className="text-xs text-[color:var(--color-ink-soft)]">{hint}</p>}
      </div>
    </div>
  );
}