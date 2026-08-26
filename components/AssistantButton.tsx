"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";

/**
 * Acces a l'assistant depuis n'importe quel ecran. Flotte juste au-dessus
 * de la navigation basse, dans la zone du pouce.
 */
export function AssistantButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/assistant")) return null;

  return (
    <Link
      href="/assistant"
      aria-label="Ouvrir l'assistant"
      className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-3 font-extrabold text-on-accent shadow-[0_4px_0_var(--color-accent-deep),0_10px_24px_-8px_rgba(29,27,46,0.5)] transition active:translate-y-[2px] active:shadow-[0_2px_0_var(--color-accent-deep)]"
    >
      <Icon name="sparkle" size={20} />
      <span className="text-sm">Assistant</span>
    </Link>
  );
}
