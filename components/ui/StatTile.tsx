import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  hint,
  emoji,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  emoji?: string;
}) {
  return (
    <div className="rounded-2xl border border-hair bg-white/85 p-3">
      <div className="text-xs font-bold uppercase tracking-wide text-muted">
        {emoji && <span aria-hidden className="mr-1">{emoji}</span>}
        {label}
      </div>
      <div className="mt-1 text-2xl font-black tabular-nums leading-none">{value}</div>
      {hint && <div className="mt-1 text-xs font-semibold text-muted">{hint}</div>}
    </div>
  );
}
