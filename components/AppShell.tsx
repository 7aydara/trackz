import Link from "next/link";
import type { ReactNode } from "react";
import { AssistantButton } from "@/components/AssistantButton";
import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { MODULE_BY_KEY, type ModuleKey } from "@/lib/modules";

/**
 * Cadre commun aux 5 apps : theme d'accent, en-tete colle, retour au hub
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
    <div className={`shell ${mod?.theme ?? "theme-tracker"}`}>
      <header className="sticky top-0 z-30 border-b border-hair bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {mod ? (
            <Link
              href="/"
              aria-label="Retour au hub"
              className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-sunk hover:text-ink"
            >
              <Icon name="back" />
            </Link>
          ) : (
            <Logo size={36} />
          )}

          <div className="min-w-0 flex-1 text-center">
            <p className="flex items-center justify-center gap-2 truncate text-xl font-black tracking-tight text-accent-ink">
              {mod && (
                <span aria-hidden className="text-lg">
                  {mod.emoji}
                </span>
              )}
              {mod ? mod.label : "Trackz"}
            </p>
            {subtitle && (
              <p className="truncate text-xs font-semibold text-muted">{subtitle}</p>
            )}
          </div>

          <SignOutButton />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-32 pt-4">{children}</main>

      <AssistantButton />
      <BottomNav />
    </div>
  );
}
