"use client";

import { useRef } from "react";
import { burstConfetti } from "@/lib/confetti";

/**
 * Le geste central de toute la suite : une grosse pastille tactile qui
 * "pop" et lache des confettis quand on valide.
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

  const dims = size === "sm" ? "size-9 text-base" : "size-12 text-xl";

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
      className={`${dims} grid shrink-0 place-items-center rounded-full border-2 font-black transition disabled:opacity-50 ${
        done
          ? "animate-pop border-transparent bg-accent text-white"
          : "border-dashed border-hair bg-white text-muted/50 hover:border-accent hover:text-accent"
      }`}
    >
      {done ? "✓" : "○"}
    </button>
  );
}
