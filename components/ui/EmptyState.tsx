import type { ReactNode } from "react";

export function EmptyState({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border-2 border-dashed border-hair bg-white/60 px-4 py-10 text-center">
      <div className="text-4xl" aria-hidden>
        {emoji}
      </div>
      <p className="mt-2 font-extrabold">{title}</p>
      {children && <div className="mt-1 text-sm font-medium text-muted">{children}</div>}
    </div>
  );
}
