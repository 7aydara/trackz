import { cookies } from "next/headers";

/**
 * Le "jour courant" est la primitive de toute la suite (streaks, check-ins).
 * Il doit etre calcule dans le fuseau de l'utilisateur, pas dans celui du
 * serveur : sinon une habitude cochee a 23 h a Paris tombe la veille sur un
 * serveur en UTC. Le fuseau est depose dans un cookie par `TimezoneSync`,
 * ce qui garde le calcul deterministe cote serveur (pas de mismatch
 * d'hydratation) tout en restant juste pour l'utilisateur.
 */
export async function getToday(): Promise<string> {
  const tz = (await cookies()).get("tz")?.value;
  return dateInTimeZone(new Date(), tz);
}

export function dateInTimeZone(date: Date, timeZone?: string): string {
  try {
    // en-CA formate nativement en YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}
