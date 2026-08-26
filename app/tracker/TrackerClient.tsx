"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { PushSettings } from "@/components/PushSettings";
import { Card, CardTitle, SectionLabel } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/Icon";
import { CheckButton } from "@/components/ui/CheckButton";
import { Chip } from "@/components/ui/Chip";
import { Heatmap } from "@/components/ui/Heatmap";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StatTile } from "@/components/ui/StatTile";
import { MODULE_BY_KEY } from "@/lib/modules";
import type { DashboardData, TodayItem } from "@/lib/queries/dashboard";
import { MILESTONES, MILESTONE_BADGES, nextMilestone, unlockedMilestones } from "@/lib/streaks";
import { createClient } from "@/lib/supabase/client";
import type { Habit } from "@/lib/types";
import { HabitsManager } from "./HabitsManager";

export function TrackerClient({
  userId,
  data,
  habits,
  reminderHour,
  reminderEnabled,
}: {
  userId: string;
  data: DashboardData;
  habits: Habit[];
  reminderHour: number;
  reminderEnabled: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<TodayItem[]>(data.items);
  const [, startTransition] = useTransition();
  const [lateReminder, setLateReminder] = useState(false);

  // Les donnees serveur sont recalculees apres chaque toggle (router.refresh).
  useEffect(() => setItems(data.items), [data]);

  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const ratio = total ? done / total : 0;

  // Rappel visuel de fin de journee (heure locale → apres le montage).
  useEffect(() => {
    const check = () => setLateReminder(new Date().getHours() >= 18);
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, []);

  async function toggle(item: TodayItem, next: boolean) {
    setItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, done: next } : i)));

    const date = data.date;
    try {
      if (item.kind === "habit") {
        if (next) {
          await supabase
            .from("habit_logs")
            .upsert(
              { user_id: userId, habit_id: item.refId!, log_date: date, done: true },
              { onConflict: "habit_id,log_date" },
            );
        } else {
          await supabase
            .from("habit_logs")
            .delete()
            .eq("habit_id", item.refId!)
            .eq("log_date", date);
        }
      } else if (item.kind === "subject") {
        if (next) {
          await supabase
            .from("subject_logs")
            .upsert(
              { user_id: userId, subject_id: item.refId!, log_date: date, done: true },
              { onConflict: "subject_id,log_date" },
            );
        } else {
          await supabase
            .from("subject_logs")
            .delete()
            .eq("subject_id", item.refId!)
            .eq("log_date", date);
        }
      } else if (item.kind === "domain") {
        if (next) {
          await supabase
            .from("domain_checkins")
            .upsert(
              { user_id: userId, domain: item.domain!, log_date: date, done: true },
              { onConflict: "user_id,domain,log_date" },
            );
        } else {
          await supabase
            .from("domain_checkins")
            .delete()
            .eq("domain", item.domain!)
            .eq("log_date", date);
        }
      } else if (item.kind === "workout" && next) {
        // Seance eclair : le detail (stances, taolu) se remplit dans l'app Kung Fu.
        await supabase.from("workouts").insert({
          user_id: userId,
          session_date: date,
          duration_min: 30,
          focus: "Seance rapide",
          intensity: 3,
        });
      }
    } finally {
      startTransition(() => router.refresh());
    }
  }

  const remaining = items.filter((i) => !i.done);
  const streak = data.globalStreak.current;
  const badges = unlockedMilestones(streak);
  const next = nextMilestone(streak);

  // L'anneau montre l'avancee vers le prochain palier : c'est la seule
  // lecture 0 → 1 honnete d'une serie qui, elle, n'a pas de plafond.
  const previous = [...MILESTONES].reverse().find((m) => m <= streak) ?? 0;
  const milestoneRatio = next ? (streak - previous) / (next - previous) : 1;

  return (
    <div className="space-y-4">
      {/* ------------------------------------------- rappel de fin de journee */}
      {lateReminder && remaining.length > 0 && (
        <div className="animate-rise flex items-start gap-3 rounded-[var(--radius-card)] border border-warn/30 bg-warn-soft px-4 py-3">
          <span className="mt-0.5 shrink-0 text-warn-ink">
            <Icon name="alert" size={20} />
          </span>
          <p className="text-sm font-bold text-warn-ink">
            Il te reste {remaining.length} truc{remaining.length > 1 ? "s" : ""} a cocher —{" "}
            {remaining
              .slice(0, 3)
              .map((i) => i.label)
              .join(", ")}
            {remaining.length > 3 ? "…" : ""}
          </p>
        </div>
      )}

      {/* --------------------------------------------------- serie et badges */}
      <Card className="flex flex-col items-center gap-4">
        <ProgressRing value={milestoneRatio} size={188} stroke={18}>
          <div>
            <div className="text-5xl font-black leading-none tabular-nums text-accent-ink">
              {streak}
            </div>
            <div className="mt-1 text-sm font-bold text-muted">
              jour{streak > 1 ? "s" : ""} de suite
            </div>
            <div aria-hidden className="mt-1 text-xl">
              🔥
            </div>
          </div>
        </ProgressRing>

        <div className="flex flex-wrap justify-center gap-2">
          <Chip tone="accent">
            {done}/{total} aujourd'hui
          </Chip>
          <Chip tone="neutral">{Math.round(data.weekRatio * 100)}% cette semaine</Chip>
        </div>

        {next && (
          <p className="text-center text-xs font-bold text-muted">
            Prochain palier {MILESTONE_BADGES[next].emoji} {MILESTONE_BADGES[next].label} — plus
            que {next - streak} j
          </p>
        )}

        <ul className="flex w-full justify-center gap-1.5 overflow-x-auto rounded-full bg-sunk px-3 py-2.5">
          {MILESTONES.map((m) => {
            const unlocked = streak >= m;
            return (
              <li
                key={m}
                title={`${MILESTONE_BADGES[m].label}${unlocked ? "" : " — a debloquer"}`}
                className={`grid size-8 shrink-0 place-items-center rounded-full text-base transition ${
                  unlocked ? "bg-card shadow-sm" : "opacity-30 grayscale"
                }`}
              >
                <span aria-hidden>{MILESTONE_BADGES[m].emoji}</span>
                <span className="sr-only">{MILESTONE_BADGES[m].label}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ------------------------------------------------- liste du jour */}
      <div>
        <SectionLabel>Ma journee</SectionLabel>

        {total === 0 ? (
          <EmptyState emoji="🌱" title="Rien a suivre pour l'instant">
            Ajoute des matieres, des ecoles ou une habitude pour remplir ta journee.
          </EmptyState>
        ) : (
          <Card className="!p-0">
            <ul className="divide-y divide-hair">
              {items.map((item) => {
                const mod = MODULE_BY_KEY[item.module];
                const lockedWorkout = item.kind === "workout" && item.done;
                return (
                  <li
                    key={item.key}
                    className={`${mod.theme} flex items-center gap-3 px-4 py-3.5 transition`}
                  >
                    <span
                      aria-hidden
                      className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-xl"
                    >
                      {item.emoji}
                    </span>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={item.href}
                        className="block truncate text-[15px] font-extrabold hover:underline"
                      >
                        {item.label}
                      </Link>
                      <p className="text-xs font-bold text-muted">{mod.short}</p>
                    </div>

                    {lockedWorkout ? (
                      <Link
                        href="/sport"
                        aria-label="Voir la seance"
                        className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-on-accent"
                      >
                        <Icon name="check" size={18} strokeWidth={3} />
                      </Link>
                    ) : (
                      <CheckButton
                        done={item.done}
                        label={item.label}
                        onToggle={(v) => toggle(item, v)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      {/* ------------------------------------------------------- statistiques */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile icon="flame" label="Serie max" value={data.globalStreak.longest} hint="jours" />
        <StatTile
          icon="calendar"
          label="Cette semaine"
          value={`${Math.round(data.weekRatio * 100)}%`}
        />
        <StatTile icon="check" label="Aujourd'hui" value={`${done}/${total}`} />
        <StatTile icon="target" label="Badges obtenus" value={badges.length} />
      </div>

      {/* ---------------------------------------------------- series par domaine */}
      <Card>
        <CardTitle emoji="🏆">Series par domaine</CardTitle>
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.domainStreaks.map((s) => {
            const mod = MODULE_BY_KEY[s.module];
            return (
              <li
                key={s.module}
                className={`${mod.theme} flex items-center gap-3 rounded-[var(--radius-control)] bg-sunk px-3 py-2.5`}
              >
                <span
                  aria-hidden
                  className="grid size-9 place-items-center rounded-full bg-accent-soft text-lg"
                >
                  {s.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">{s.label}</p>
                  <p className="text-[11px] font-bold text-muted">record {s.longest} j</p>
                </div>
                <span className="text-lg font-black tabular-nums text-accent-ink">
                  {s.current}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ------------------------------------------------------------ heatmap */}
      <Card>
        <CardTitle emoji="🗓️">Calendrier d'intensite</CardTitle>
        <Heatmap values={data.heatmap} weeks={22} endDate={data.date} />
      </Card>

      {/* -------------------------------------------------- habitudes custom */}
      <HabitsManager userId={userId} habits={habits} />

      {/* ------------------------------------------------- rappel push */}
      <PushSettings
        userId={userId}
        initialHour={reminderHour}
        initialEnabled={reminderEnabled}
      />
    </div>
  );
}
