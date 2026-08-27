"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";

/**
 * Acces a l'assistant, dans l'en-tete.
 *
 * Il etait auparavant en bouton flottant : sur les listes, il se posait
 * par-dessus la case a cocher de la derniere ligne et la rendait
 * intouchable. Une cible fixe dans la barre du haut ne recouvre jamais
 * rien.
 */
export function AssistantLink() {
  const pathname = usePathname();
  const active = pathname.startsWith("/assistant");

  return (
    <Link
      href="/assistant"
      aria-label="Ouvrir l'assistant"
      aria-current={active ? "page" : undefined}
      className={`tap transition ${active ? "text-accent" : "text-ink-2 hover:text-ink"}`}
    >
      <Icon name="sparkle" size={21} />
    </Link>
  );
}
