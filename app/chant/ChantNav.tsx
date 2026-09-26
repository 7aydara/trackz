"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/chant", label: "Accordeur", emoji: "🎤" },
  { href: "/chant/echauffement", label: "Echauffement", emoji: "🌬️" },
  { href: "/chant/exercices", label: "Exercices", emoji: "🎼" },
  { href: "/chant/tessiture", label: "Tessiture", emoji: "📏" },
];

export function ChantNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-4 -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[14px] font-semibold transition ${
              active
                ? "bg-accent text-on-accent "
                : "border border-hairline bg-surface text-ink-2"
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
