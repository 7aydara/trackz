import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";

/** Tuile de chiffre : icone en haut, valeur, libelle. */
export function StatTile({
  label,
  value,
  hint,
  icon,
  emoji,
  tone = "plain",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconName;
  emoji?: string;
  tone?: "plain" | "accent" | "danger";
}) {
  const tones = {
    plain: "bg-card border-hair text-ink",
    accent: "bg-accent-soft border-transparent text-accent-ink",
    danger: "bg-danger-soft border-transparent text-danger-ink",
  };

  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-[var(--radius-card)] border px-3 py-4 text-center ${tones[tone]}`}
    >
      <span className="text-accent">
        {icon ? (
          <Icon name={icon} size={20} />
        ) : (
          <span aria-hidden className="text-lg leading-none">
            {emoji ?? "•"}
          </span>
        )}
      </span>
      <span className="text-2xl font-black leading-none tabular-nums">{value}</span>
      <span className="text-xs font-bold text-muted">{label}</span>
      {hint && <span className="text-[11px] font-semibold text-muted/80">{hint}</span>}
    </div>
  );
}
