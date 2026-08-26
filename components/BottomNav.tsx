"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";

/** Navigation principale : barre basse sur mobile, rail horizontal sur desktop. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hair bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between px-1">
        {MODULES.map((m) => {
          const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
          return (
            <li key={m.key} className="flex-1">
              <Link
                href={m.href}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] font-bold transition ${
                  active ? "text-ink" : "text-muted"
                }`}
                style={active ? { color: m.accent } : undefined}
              >
                <span
                  aria-hidden
                  className="grid size-9 place-items-center rounded-2xl text-lg transition"
                  style={{
                    background: active ? m.accentSoft : "transparent",
                    transform: active ? "translateY(-2px)" : undefined,
                  }}
                >
                  {m.emoji}
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
