"use client";

import { useRef } from "react";
import { Icon } from "@/components/Icon";
import { burstConfetti } from "@/lib/confetti";

/**
 * Le geste central de la suite. Vide : cercle pointille. Coche : rempli
 * dans l'accent du module, avec un "pop" et une gerbe de confettis.
 */
export function CheckButton({
  done,
  onToggle,
  label,
  size = "md",
  disabled,
}: {
  done: boolean;
  onToggle: (next: boolean) => void;
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const dims = size === "sm" ? "size-6" : "size-8";

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-pressed={done}
      aria-label={label}
      onClick={() => {
        if (!done) burstConfetti(ref.current);
        onToggle(!done);
      }}
      className={`${dims} grid shrink-0 place-items-center rounded-full border-2 transition disabled:opacity-50 ${
        done
          ? "animate-pop border-transparent bg-accent text-on-accent"
          : "border-dotted border-muted/60 text-transparent hover:border-accent hover:text-accent/40"
      }`}
    >
      <Icon name="check" size={size === "sm" ? 14 : 18} strokeWidth={3} />
    </button>
  );
}
