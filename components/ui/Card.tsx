import type { ReactNode } from "react";

/** Tuile de base : 20px de rayon, 1px de filet, ombre tres diffuse. */
export function Card({
  children,
  className = "",
  as: Tag = "div",
  tinted = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "li" | "article";
  /** Fond dans l'accent doux plutot que blanc. */
  tinted?: boolean;
}) {
  return (
    <Tag
      className={`relative rounded-[var(--radius-card)] border border-hair p-5 shadow-[0_4px_12px_rgba(29,27,46,0.05)] ${
        tinted ? "bg-accent-soft" : "bg-card"
      } ${className}`}
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
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-xl font-extrabold leading-tight tracking-tight">
        {emoji && (
          <span aria-hidden className="text-lg">
            {emoji}
          </span>
        )}
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Libelle de section, hors carte. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 px-1 text-xl font-extrabold tracking-tight">{children}</h2>
  );
}
