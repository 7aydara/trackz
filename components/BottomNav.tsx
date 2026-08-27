"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { MODULES } from "@/lib/modules";

/**
 * Barre d'onglets. Chaque cible fait 44px de haut au minimum, et le
 * module actif se signale par un trait fin dans sa teinte — le seul
 * endroit ou la couleur de module apparait dans la navigation.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-ground/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto flex max-w-3xl items-stretch">
        {MODULES.map((m) => {
          const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
          return (
            <li key={m.key} className={`flex-1 ${m.theme}`}>
              <Link
                href={m.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[54px] flex-col items-center justify-center gap-1 transition duration-150 ${
                  active ? "text-ink" : "text-ink-3"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="mercury-bar absolute top-0 h-[2px] w-7 rounded-full"
                  />
                )}
                <Icon name={m.icon} size={22} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-semibold tracking-[0.01em]">
                  {m.short}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
