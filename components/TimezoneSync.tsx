"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Publie le fuseau du navigateur dans un cookie pour que le serveur sache
 * quel jour il est *pour l'utilisateur*. Ne rafraichit la page que si le
 * fuseau vient de changer (premiere visite, voyage, changement d'appareil).
 */
export function TimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;

    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith("tz="))
      ?.slice(3);

    if (current === encodeURIComponent(tz)) return;

    document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  return null;
}
