"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

type Variant = "primary" | "soft" | "ghost" | "danger";

/**
 * Profondeur tactile : une ombre pleine de 4px sous le bouton, qui se
 * comprime a 2px quand on appuie. Pas de flou — c'est un bloc, pas un
 * element flottant.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent shadow-[0_4px_0_var(--color-accent-deep)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_2px_0_var(--color-accent-deep)]",
  soft: "bg-accent-soft text-accent-ink hover:brightness-[0.97] active:translate-y-[1px]",
  ghost:
    "border border-hair bg-card text-ink hover:bg-sunk active:translate-y-[1px]",
  danger:
    "bg-danger-soft text-danger-ink border border-danger/25 hover:brightness-[0.97] active:translate-y-[1px]",
};

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
  // React 19 : `ref` est une prop normale, transmise via le spread.
  ref?: Ref<HTMLButtonElement>;
}) {
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-[15px]",
    lg: "px-5 py-3.5 text-base",
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-extrabold transition-[filter,transform,box-shadow,background-color] duration-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 ${sizes[size]} ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
