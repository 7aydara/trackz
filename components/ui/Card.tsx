import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  return (
    <Tag
      className={`rounded-[var(--radius-card)] border border-hair bg-white/85 p-4 shadow-[0_2px_0_rgba(29,27,46,0.04),0_10px_30px_-18px_rgba(29,27,46,0.35)] backdrop-blur-sm ${className}`}
    >
      {children}
    </Tag>
  );
}

export function CardTitle({
  children,
  emoji,
  action,
}: {
  children: ReactNode;
  emoji?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-extrabold tracking-tight">
        {emoji && <span aria-hidden>{emoji}</span>}
        {children}
      </h2>
      {action}
    </div>
  );
}
