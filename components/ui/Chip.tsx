import type { ReactNode } from "react";

/** Pastille d'etat : toujours pleinement arrondie, 12px/700. */
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
    neutral: "bg-sunk text-muted",
    accent: "bg-accent-soft text-accent-ink",
    good: "bg-good-soft text-good-ink",
    warn: "bg-warn-soft text-warn-ink",
    danger: "bg-danger-soft text-danger-ink",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold leading-none ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
