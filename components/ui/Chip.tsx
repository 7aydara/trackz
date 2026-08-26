import type { ReactNode } from "react";

export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "green" | "amber" | "red" | "blue";
  className?: string;
}) {
  const tones = {
    neutral: "bg-canvas text-muted border-hair",
    accent: "bg-accent-soft text-accent-ink border-transparent",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    blue: "bg-sky-50 text-sky-700 border-sky-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
