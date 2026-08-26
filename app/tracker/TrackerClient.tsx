"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { CheckButton } from "@/components/ui/CheckButton";
import { Chip } from "@/components/ui/Chip";
import { Heatmap } from "@/components/ui/Heatmap";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StatTile } from "@/components/ui/StatTile";
import { MODULE_BY_KEY } from "@/lib/modules";
import type { DashboardData, TodayItem } from "@/lib/queries/dashboard";
import { MILESTONE_BADGES, nextMilestone, unlockedMilestones } from "@/lib/streaks";
import { createClient } from "@/lib/supabase/client";
import type { Habit } from "@/lib/types";
import { HabitsManager } from "./HabitsManager";

export function TrackerClient({
  userId,
  data,
  habits,
}: {
  userId: string;
  data: DashboardData;
  habits: Habit[];
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

  return (
    <div className="space-y-4">
      {/* --------------------------------------------------- score du jour */}
      <Card className="flex items-center gap-4 !bg-white">
        <ProgressRing value={ratio}>
          <div>
            <div className="text-2xl font-black leading-none tabular-nums">
              {Math.round(ratio * 100)}%
            </div>
            <div className="text-[10px] font-bold uppercase text-muted">aujourd'hui</div>
          </div>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <p className="text-lg font-black tracking-tight">
            {done}/{total} coche
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-sm font-bold text-muted">
            <span className="text-lg">🔥</span> {streak} jour{streak > 1 ? "s" : ""} de serie
          </p>
          {next && (
            <p className="mt-1 text-xs font-semibold text-muted">
              Prochain palier : {MILESTONE_BADGES[next].emoji} {MILESTONE_BADGES[next].label} —
              plus que {next - streak} j
            </p>
          )}
          {badges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {badges.map((b) => (
                <span key={b} className="text-lg" title={MILESTONE_BADGES[b].label}>
                  {MILESTONE_BADGES[b].emoji}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ------------------------------------------- rappel de fin de journee */}
      {lateReminder && remaining.length > 0 && (
        <div className="animate-rise flex items-center gap-3 rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-2xl" aria-hidden>
            ⏰
          </span>
          <p className="text-sm font-bold text-amber-800">
            La journee se termine et il te reste {remaining.length} truc
            {remaining.length > 1 ? "s" : ""} a cocher —{" "}
            {remaining
              .slice(0, 3)
              .map((i) => i.label)
              .join(", ")}
            {remaining.length > 3 ? "…" : ""}
          </p>
        </div>
      )}

      {/* ------------------------------------------------- liste du jour */}
      <Card>
        <CardTitle emoji="📋" action={<Chip tone="accent">{done}/{total}</Chip>}>
          Ma journee
        </CardTitle>

        {total === 0 ? (
          <p className="py-6 text-center text-sm font-semibold text-muted">
            Rien a suivre pour l'instant. Ajoute des matieres, des ecoles ou une habitude 👇
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const mod = MODULE_BY_KEY[item.module];
              const lockedWorkout = item.kind === "workout" && item.done;
              return (
                <li
                  key={item.key}
                  className={`${mod.theme} flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                    item.done ? "border-transparent bg-accent-soft" : "border-hair bg-white"
                  }`}
                >
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/70 text-lg"
                  >
                    {item.emoji}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate font-bold ${item.done ? "text-accent-ink" : ""}`}
                    >
                      {item.label}
                    </p>
                    <Link
                      href={item.href}
                      className="text-[11px] font-bold uppercase tracking-wide text-muted hover:underline"
                    >
                      {mod.short}
                    </Link>
                  </div>

                  {lockedWorkout ? (
                    <Link
                      href="/sport"
                      aria-label="Voir la seance"
                      className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-xl font-black text-white"
                    >
                      ✓
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
        )}
      </Card>

      {/* ------------------------------------------------------- statistiques */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile emoji="🔥" label="Serie" value={`${streak} j`} hint={`record ${data.globalStreak.longest} j`} />
        <StatTile emoji="📅" label="Semaine" value={`${Math.round(data.weekRatio * 100)}%`} hint="7 derniers jours" />
        <StatTile emoji="✅" label="Aujourd'hui" value={`${done}/${total}`} hint={`${Math.round(ratio * 100)}%`} />
        <StatTile emoji="🎖️" label="Badges" value={badges.length} hint={next ? `next : ${next} j` : "tout debloque"} />
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
                className={`${mod.theme} flex items-center gap-3 rounded-2xl border border-hair bg-white px-3 py-2`}
              >
                <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-accent-soft text-lg">
                  {s.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{s.label}</p>
                  <p className="text-[11px] font-semibold text-muted">record {s.longest} j</p>
                </div>
                <span className="text-lg font-black tabular-nums text-accent-ink">
                  {s.current} 🔥
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
    </div>
  );
}
