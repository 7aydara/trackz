"use client";

import { useEffect, type ReactNode } from "react";

/** Feuille modale : centree sur desktop, remontee du bas sur mobile. */
export function Modal({
  open,
  onClose,
  title,
  emoji,
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
        className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-rise relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-hair bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-black tracking-tight">
            {emoji && <span aria-hidden>{emoji}</span>}
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-canvas text-lg font-bold text-muted transition hover:bg-hair"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
