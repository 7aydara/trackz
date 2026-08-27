"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-press",
  secondary: "bg-raised text-ink hover:bg-hairline",
  ghost: "text-ink-2 hover:bg-raised hover:text-ink",
  danger: "text-danger hover:bg-danger-dim",
};

/**
 * Pas de relief : un aplat, et une compression a l'appui. C'est le geste
 * qui donne la matiere, pas l'ombre.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  ref?: Ref<HTMLButtonElement>;
}) {
  // Meme au format "sm", la hauteur ne descend pas sous 44px : c'est le
  // minimum pour viser au pouce.
  const sizes = {
    sm: "min-h-11 px-3.5 text-[14px]",
    md: "min-h-11 px-4 text-[15px]",
    lg: "min-h-[52px] px-5 text-[16px]",
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold tracking-[-0.01em] transition duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${sizes[size]} ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
