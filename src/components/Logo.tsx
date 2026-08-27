export default function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="group inline-flex items-center gap-2.5">
      <span className="relative inline-flex h-8 w-8 items-center justify-center">
        <span
          className="absolute inset-0 rounded-[10px] opacity-70 blur-md transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: 'var(--gradient-brand)' }}
          aria-hidden="true"
        />
        <svg
          width="32"
          height="32"
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden="true"
          className="relative"
        >
          <defs>
            <linearGradient id="sf-logo" x1="0" y1="0" x2="28" y2="28">
              <stop offset="0%" stopColor="#7C6CFF" />
              <stop offset="60%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#F9A03F" />
            </linearGradient>
          </defs>
          <rect width="28" height="28" rx="9" fill="url(#sf-logo)" />
          <path
            d="M8 18.5C8 16 10 15 13 14.5C16.5 14 18 12.8 18 10.5C18 8.5 16.3 7 13.8 7C11.5 7 9.8 8.2 9.3 10.2"
            stroke="#0B0C14"
            strokeWidth="1.9"
            strokeLinecap="round"
            opacity="0.85"
          />
          <circle cx="13.8" cy="20" r="1.8" fill="#0B0C14" />
        </svg>
      </span>
      <span
        className={`font-display text-lg font-bold tracking-tight ${
          'text-[color:var(--color-ink)]'
        }`}
      >
        Shop<span className="text-gradient">Flow</span>
      </span>
    </span>
  );
}
