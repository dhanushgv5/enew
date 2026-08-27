import { statusMeta } from '@/lib/status';

export default function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <span
      className="chip"
      style={{ backgroundColor: meta.bg, color: meta.text }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.dot }}
      />
      {meta.label}
    </span>
  );
}
