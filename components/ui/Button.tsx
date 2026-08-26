"use client";

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

type Variant = "primary" | "soft" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-[0_4px_0_color-mix(in_srgb,var(--accent)_65%,black)] hover:brightness-105 active:translate-y-[3px] active:shadow-none",
  soft: "bg-accent-soft text-accent-ink hover:brightness-95 active:translate-y-[1px]",
  ghost: "bg-white text-ink border border-hair hover:bg-canvas active:translate-y-[1px]",
  danger: "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100",
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
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3.5 text-base",
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
