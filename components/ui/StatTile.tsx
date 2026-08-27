import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";

/** Chiffre-cle : la valeur domine, le libelle s'efface. */
export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "plain",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconName;
  emoji?: string;
  tone?: "plain" | "accent" | "danger";
}) {
  const valueTone = {
    plain: "text-ink",
    accent: "text-accent",
    danger: "text-danger",
  }[tone];

  return (
    <div className="rounded-[var(--radius-card)] border border-hairline bg-surface px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-ink-3">
        {icon && <Icon name={icon} size={15} strokeWidth={2} />}
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em]">
          {label}
        </span>
      </div>
      <div className={`mt-2 text-[26px] font-extrabold leading-none tabular-nums tracking-[-0.02em] ${valueTone}`}>
        {value}
      </div>
      {hint && <div className="mt-1.5 text-[12px] font-medium text-ink-3">{hint}</div>}
    </div>
  );
}
