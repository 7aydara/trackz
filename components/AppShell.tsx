import Link from "next/link";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { SignOutButton } from "@/components/SignOutButton";
import { MODULE_BY_KEY, type ModuleKey } from "@/lib/modules";

/**
 * Cadre commun aux 5 apps : theme d'accent, en-tete, retour au hub,
 * et navigation basse. Chaque module l'utilise dans son `layout.tsx`.
 */
export function AppShell({
  moduleKey,
  subtitle,
  children,
}: {
  moduleKey?: ModuleKey;
  subtitle?: string;
  children: ReactNode;
}) {
  const mod = moduleKey ? MODULE_BY_KEY[moduleKey] : null;

  return (
    <div className={mod?.theme ?? "theme-tracker"}>
      <header className="sticky top-0 z-30 border-b border-hair bg-white/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {mod ? (
            <Link
              href="/"
              aria-label="Retour au hub"
              className="grid size-9 shrink-0 place-items-center rounded-2xl bg-canvas text-lg font-bold text-muted transition hover:text-ink"
            >
              ←
            </Link>
          ) : (
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-2xl bg-accent-soft text-lg"
            >
              🗂️
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 truncate text-lg font-black tracking-tight">
              {mod && <span aria-hidden>{mod.emoji}</span>}
              {mod ? mod.label : "Trackz"}
            </h1>
            {subtitle && (
              <p className="truncate text-xs font-semibold text-muted">{subtitle}</p>
            )}
          </div>

          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">{children}</main>

      <BottomNav />
    </div>
  );
}
