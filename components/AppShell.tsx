import Link from "next/link";
import type { ReactNode } from "react";
import { AssistantLink } from "@/components/AssistantLink";
import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { MODULE_BY_KEY, type ModuleKey } from "@/lib/modules";

/**
 * Cadre commun : en-tete collee, contenu, onglets. La marge basse
 * generreuse laisse passer la barre d'onglets et le bouton assistant
 * sans qu'ils recouvrent le dernier element de la page.
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
    <div className={`shell ${mod?.theme ?? ""}`}>
      <header className="sticky top-0 z-30 border-b border-hairline bg-ground/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-2 py-1.5">
          {mod ? (
            <Link href="/" aria-label="Retour a l'accueil" className="tap text-ink-2">
              <Icon name="back" size={22} />
            </Link>
          ) : (
            <span className="tap">
              <Logo size={26} />
            </span>
          )}

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[16px] font-bold tracking-[-0.01em]">
              {mod ? mod.label : "Trackz"}
            </p>
            {subtitle && (
              <p className="truncate text-[12px] font-medium text-ink-3">{subtitle}</p>
            )}
          </div>

          <AssistantLink />
          <SignOutButton />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-28 pt-5">{children}</main>

      <BottomNav />
    </div>
  );
}
