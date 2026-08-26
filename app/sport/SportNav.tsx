"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/sport", label: "Seances", emoji: "🥋" },
  { href: "/sport/progres", label: "Progres", emoji: "📈" },
  { href: "/sport/arbre", label: "Arbre", emoji: "🌳" },
  { href: "/sport/chan", label: "Chan", emoji: "☯️" },
];

export function SportNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-4 -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-extrabold transition ${
              active
                ? "bg-accent text-on-accent shadow-[0_3px_0_var(--color-accent-deep)]"
                : "border border-hair bg-card text-muted"
            }`}
          >
            <span aria-hidden className="mr-1">
              {tab.emoji}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
