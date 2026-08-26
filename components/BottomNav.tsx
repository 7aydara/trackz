"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { MODULES } from "@/lib/modules";

/**
 * Navigation principale, dans la zone du pouce. L'onglet actif prend
 * l'accent de son module et son icone se pose sur une pastille pleine :
 * on sait ou on est sans lire.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hair bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between px-2 py-1.5">
        {MODULES.map((m) => {
          const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
          return (
            <li key={m.key} className={`flex-1 ${m.theme}`}>
              <Link
                href={m.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-[var(--radius-control)] px-1 py-1.5 text-[11px] font-bold transition ${
                  active ? "text-accent-ink" : "text-muted"
                }`}
              >
                <span
                  className={`grid size-10 place-items-center rounded-full transition ${
                    active ? "-translate-y-0.5 bg-accent text-on-accent" : ""
                  }`}
                >
                  <Icon name={m.icon} size={22} />
                </span>
                {m.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
