import type { ReactNode } from "react";

export function EmptyState({
  emoji,
  title,
  children,
}: {
  emoji?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-hairlineline bg-surface px-5 py-10 text-center">
      {emoji && (
        <div className="text-2xl opacity-40" aria-hidden>
          {emoji}
        </div>
      )}
      <p className="mt-2 text-[16px] font-bold tracking-[-0.01em]">{title}</p>
      {children && (
        <div className="mx-auto mt-1.5 max-w-xs text-[14px] font-medium leading-relaxed text-ink-3">
          {children}
        </div>
      )}
    </div>
  );
}
