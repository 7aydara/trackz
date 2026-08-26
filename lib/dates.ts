/**
 * Helpers de dates. Tout est manipule en heure LOCALE et serialise en
 * "YYYY-MM-DD" (type `date` cote Postgres) : pas de decalage de fuseau qui
 * ferait basculer une habitude cochee le soir sur le jour suivant.
 */

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function diffInDays(fromISO: string, toISOStr: string): number {
  const a = fromISODate(fromISO).getTime();
  const b = fromISODate(toISOStr).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Liste de dates ISO inclusives entre deux bornes. */
export function dateRange(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  let cur = startISO;
  let guard = 0;
  while (cur <= endISO && guard++ < 800) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** Lundi de la semaine contenant `iso`. */
export function startOfWeek(iso: string): string {
  const d = fromISODate(iso);
  const shift = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - shift);
  return toISODate(d);
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

const DAY_LABELS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

export function dayLabel(iso: string): string {
  return DAY_LABELS[(fromISODate(iso).getDay() + 6) % 7];
}

export function formatLong(iso: string): string {
  return fromISODate(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatShort(iso: string): string {
  return fromISODate(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

/** "dans 12 jours", "aujourd'hui", "il y a 3 jours". */
export function relativeDays(iso: string, fromISOStr = todayISO()): string {
  const n = diffInDays(fromISOStr, iso);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  if (n > 0) return `dans ${n} jours`;
  return `il y a ${-n} jours`;
}
