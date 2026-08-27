"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "@/components/Icon";

/** Feuille remontee du bas sur mobile, centree au-dela. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  emoji?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-rise relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] border border-hairline bg-surface px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 sm:max-w-lg sm:rounded-[24px] sm:pb-6"
      >
        {/* Poignee : indique que la feuille se tire vers le bas. */}
        <div
          aria-hidden
          className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline sm:hidden"
        />

        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="tap -mr-2 text-ink-2">
            <Icon name="close" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
