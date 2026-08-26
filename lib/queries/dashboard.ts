import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/dates";
import type { ModuleKey } from "@/lib/modules";
import { currentStreak, longestStreak } from "@/lib/streaks";
import type { CheckinDomain, Habit, Subject } from "@/lib/types";

export type TodayKind = "habit" | "subject" | "workout" | "domain";

export interface TodayItem {
  key: string;
  label: string;
  emoji: string;
  module: ModuleKey;
  kind: TodayKind;
  done: boolean;
  /** habit_id ou subject_id selon le `kind`. */
  refId?: string;
  domain?: CheckinDomain;
  href: string;
}

export interface DomainStreak {
  module: ModuleKey;
  label: string;
  emoji: string;
  current: number;
  longest: number;
}

export interface DashboardData {
  date: string;
  items: TodayItem[];
  doneToday: number;
  totalToday: number;
  /** date ISO → ratio de completion (0 → 1), pour la heatmap. */
  heatmap: Record<string, number>;
  globalStreak: { current: number; longest: number };
  domainStreaks: DomainStreak[];
  weekRatio: number;
}

const DOMAIN_META: Record<CheckinDomain, { label: string; emoji: string; module: ModuleKey; href: string }> = {
  business: { label: "Avancer le business", emoji: "💼", module: "business", href: "/business" },
  schools: { label: "Avancer un dossier ecole", emoji: "🎓", module: "ecoles", href: "/ecoles" },
};

/**
 * Charge en une passe tout ce dont le tracker central a besoin :
 * la journee en cours, les series et la heatmap sur `days` jours.
 */
export async function getDashboardData(
  supabase: SupabaseClient,
  { days = 140, date }: { days?: number; date: string },
): Promise<DashboardData> {
  const from = addDays(date, -(days - 1));

  const [habitsRes, subjectsRes, habitLogsRes, subjectLogsRes, workoutsRes, checkinsRes] =
    await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("archived", false)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("subjects")
        .select("*")
        .eq("archived", false)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("habit_logs")
        .select("habit_id, log_date, done")
        .gte("log_date", from)
        .lte("log_date", date),
      supabase
        .from("subject_logs")
        .select("subject_id, log_date, done")
        .gte("log_date", from)
        .lte("log_date", date),
      supabase
        .from("workouts")
        .select("session_date")
        .gte("session_date", from)
        .lte("session_date", date),
      supabase
        .from("domain_checkins")
        .select("domain, log_date, done")
        .gte("log_date", from)
        .lte("log_date", date),
    ]);

  const habits = (habitsRes.data ?? []) as Habit[];
  const subjects = (subjectsRes.data ?? []) as Subject[];
  const habitLogs = habitLogsRes.data ?? [];
  const subjectLogs = subjectLogsRes.data ?? [];
  const workoutDates = new Set((workoutsRes.data ?? []).map((w) => w.session_date as string));
  const checkins = checkinsRes.data ?? [];

  const habitDone = new Set(
    habitLogs.filter((l) => l.done).map((l) => `${l.habit_id}|${l.log_date}`),
  );
  const subjectDone = new Set(
    subjectLogs.filter((l) => l.done).map((l) => `${l.subject_id}|${l.log_date}`),
  );
  const checkinDone = new Set(
    checkins.filter((c) => c.done).map((c) => `${c.domain}|${c.log_date}`),
  );

  // ----- Liste du jour, tous domaines confondus -------------------------
  const items: TodayItem[] = [
    ...subjects.map<TodayItem>((s) => ({
      key: `subject:${s.id}`,
      label: s.name,
      emoji: s.emoji,
      module: "cours",
      kind: "subject",
      done: subjectDone.has(`${s.id}|${date}`),
      refId: s.id,
      href: "/cours",
    })),
    {
      key: "workout",
      label: "Seance de Kung Fu",
      emoji: "🥋",
      module: "sport",
      kind: "workout",
      done: workoutDates.has(date),
      href: "/sport",
    },
    ...(Object.keys(DOMAIN_META) as CheckinDomain[]).map<TodayItem>((domain) => ({
      key: `domain:${domain}`,
      label: DOMAIN_META[domain].label,
      emoji: DOMAIN_META[domain].emoji,
      module: DOMAIN_META[domain].module,
      kind: "domain",
      done: checkinDone.has(`${domain}|${date}`),
      domain,
      href: DOMAIN_META[domain].href,
    })),
    ...habits.map<TodayItem>((h) => ({
      key: `habit:${h.id}`,
      label: h.name,
      emoji: h.emoji,
      module: "tracker",
      kind: "habit",
      done: habitDone.has(`${h.id}|${date}`),
      refId: h.id,
      href: "/tracker",
    })),
  ];

  const totalToday = items.length;
  const doneToday = items.filter((i) => i.done).length;

  // ----- Heatmap : ratio par jour --------------------------------------
  // Le denominateur utilise la configuration actuelle (matieres + habitudes
  // actives + sport + 2 check-ins), faute d'historique de configuration.
  const expectedPerDay = Math.max(1, subjects.length + habits.length + 3);
  const perDay = new Map<string, number>();
  const bump = (iso: string) => perDay.set(iso, (perDay.get(iso) ?? 0) + 1);

  habitLogs.filter((l) => l.done).forEach((l) => bump(l.log_date as string));
  subjectLogs.filter((l) => l.done).forEach((l) => bump(l.log_date as string));
  workoutDates.forEach((d) => bump(d));
  checkins.filter((c) => c.done).forEach((c) => bump(c.log_date as string));

  const heatmap: Record<string, number> = {};
  for (const [iso, count] of perDay) {
    heatmap[iso] = Math.min(1, count / expectedPerDay);
  }

  // ----- Series ---------------------------------------------------------
  const activeDays = [...perDay.keys()];
  const globalStreak = {
    current: currentStreak(activeDays, date),
    longest: longestStreak(activeDays),
  };

  const subjectDays = subjectLogs.filter((l) => l.done).map((l) => l.log_date as string);
  const habitDays = habitLogs.filter((l) => l.done).map((l) => l.log_date as string);
  const businessDays = checkins
    .filter((c) => c.done && c.domain === "business")
    .map((c) => c.log_date as string);
  const schoolDays = checkins
    .filter((c) => c.done && c.domain === "schools")
    .map((c) => c.log_date as string);

  const streakSources: Array<Omit<DomainStreak, "current" | "longest"> & { days: string[] }> = [
    { module: "cours", label: "Cours", emoji: "📚", days: subjectDays },
    { module: "sport", label: "Kung Fu", emoji: "🥋", days: [...workoutDates] },
    { module: "business", label: "Business", emoji: "💼", days: businessDays },
    { module: "ecoles", label: "Ecoles", emoji: "🎓", days: schoolDays },
    { module: "tracker", label: "Habitudes", emoji: "✨", days: habitDays },
  ];

  const domainStreaks: DomainStreak[] = streakSources.map(({ days: d, ...rest }) => ({
    ...rest,
    current: currentStreak(d, date),
    longest: longestStreak(d),
  }));

  // ----- Semaine en cours (7 derniers jours) ----------------------------
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(date, -i));
  const weekRatio =
    last7.reduce((sum, iso) => sum + Math.min(1, (perDay.get(iso) ?? 0) / expectedPerDay), 0) / 7;

  return {
    date,
    items,
    doneToday,
    totalToday,
    heatmap,
    globalStreak,
    domainStreaks,
    weekRatio,
  };
}
