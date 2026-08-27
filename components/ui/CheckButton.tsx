"use client";

import { useRef } from "react";
import { Icon } from "@/components/Icon";
import { burstConfetti } from "@/lib/confetti";

/**
 * Cible de 44px quelle que soit la taille du cercle dessine : le disque
 * peut etre discret, la zone touchable ne l'est jamais.
 */
export function CheckButton({
  done,
  onToggle,
  label,
  size = "md",
  disabled,
  celebrate = false,
}: {
  done: boolean;
  onToggle: (next: boolean) => void;
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
  /** Confettis a la validation — reserve aux moments qui comptent. */
  celebrate?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const disc = size === "sm" ? "size-6" : "size-7";

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-pressed={done}
      aria-label={label}
      onClick={() => {
        if (!done && celebrate) burstConfetti(ref.current);
        onToggle(!done);
      }}
      className="tap shrink-0 disabled:opacity-40"
    >
      <span
        className={`${disc} grid place-items-center rounded-full border transition duration-150 ${
          done
            ? "animate-settle border-accent bg-accent text-on-accent"
            : "border-ink-3/60 text-transparent"
        }`}
      >
        <Icon name="check" size={size === "sm" ? 13 : 15} strokeWidth={3} />
      </span>
    </button>
  );
}
