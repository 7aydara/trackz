import { addDays } from "./dates";

/**
 * Streak courante : nombre de jours consecutifs valides en remontant depuis
 * aujourd'hui. Si aujourd'hui n'est pas encore fait, on repart d'hier — la
 * serie n'est donc pas "cassee" tant que la journee n'est pas terminee.
 */
export function currentStreak(doneDates: Iterable<string>, today: string): number {
  const set = doneDates instanceof Set ? doneDates : new Set(doneDates);
  if (set.size === 0) return 0;

  let cursor = set.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Plus longue serie jamais realisee. */
export function longestStreak(doneDates: Iterable<string>): number {
  const sorted = [...new Set(doneDates)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;

  for (const iso of sorted) {
    run = prev !== null && addDays(prev, 1) === iso ? run + 1 : 1;
    best = Math.max(best, run);
    prev = iso;
  }
  return best;
}

/** Paliers debloques facon badges. */
export const MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;

export const MILESTONE_BADGES: Record<number, { emoji: string; label: string }> = {
  3: { emoji: "🌱", label: "3 jours" },
  7: { emoji: "⭐", label: "1 semaine" },
  14: { emoji: "🔥", label: "2 semaines" },
  30: { emoji: "🏅", label: "1 mois" },
  60: { emoji: "💎", label: "2 mois" },
  100: { emoji: "👑", label: "100 jours" },
  365: { emoji: "🐉", label: "1 an" },
};

export function unlockedMilestones(streak: number): number[] {
  return MILESTONES.filter((m) => streak >= m);
}

export function nextMilestone(streak: number): number | null {
  return MILESTONES.find((m) => m > streak) ?? null;
}
