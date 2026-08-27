import type { ReactNode } from "react";

/** Etiquette d'etat. Fond tres sourd, texte colore : jamais un aplat vif. */
export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "good" | "warn" | "danger";
  className?: string;
}) {
  const tones = {
    neutral: "bg-raised text-ink-2",
    accent: "bg-accent-dim text-accent",
    good: "bg-good-dim text-good",
    warn: "bg-warn-dim text-warn",
    danger: "bg-danger-dim text-danger",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold leading-tight ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
