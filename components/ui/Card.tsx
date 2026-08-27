import type { ReactNode } from "react";

/**
 * Surface elevee. En sombre, la profondeur vient de la clarte du fond et
 * d'un filet fin, pas d'une ombre portee : une ombre noire sur un fond
 * noir ne se voit pas.
 */
export function Card({
  children,
  className = "",
  as: Tag = "div",
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "li" | "article";
  /** Sans marge interieure — pour les listes qui vont bord a bord. */
  flush?: boolean;
}) {
  return (
    <Tag
      className={`relative rounded-[var(--radius-card)] border border-hairlineline bg-surface ${
        flush ? "" : "p-5"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

export function CardTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-[17px] font-bold tracking-[-0.01em]">{children}</h2>
      {action}
    </div>
  );
}

/** Titre de section, hors carte. */
export function SectionLabel({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <h2 className="text-[22px] font-extrabold tracking-[-0.02em]">{children}</h2>
      {action}
    </div>
  );
}
