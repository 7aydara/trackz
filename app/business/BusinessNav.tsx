"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/business", label: "Vue d'ensemble", emoji: "📊" },
  { href: "/business/clients", label: "Clients", emoji: "🤝" },
  { href: "/business/projets", label: "Projets", emoji: "🚧" },
  { href: "/business/factures", label: "Factures", emoji: "🧾" },
];

export function BusinessNav() {
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
