"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heatmap } from "@/components/ui/Heatmap";
import { StatTile } from "@/components/ui/StatTile";
import { formatLong, startOfWeek } from "@/lib/dates";
import {
  EXERCISE_CATEGORY_META,
  SESSION_TEMPLATES,
  STANCE_BY_KEY,
  type SessionTemplate,
  formatSeconds,
} from "@/lib/kungfu";
import { MILESTONE_BADGES, currentStreak, longestStreak, unlockedMilestones } from "@/lib/streaks";
import { createClient } from "@/lib/supabase/client";
import type { StanceLog, Workout, WorkoutExercise } from "@/lib/types";
import { WorkoutForm } from "./WorkoutForm";

export function SportClient({
  userId,
  today,
  workouts,
  exercises,
  stanceLogs,
}: {
  userId: string;
  today: string;
  workouts: Workout[];
  exercises: WorkoutExercise[];
  stanceLogs: StanceLog[];
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState<SessionTemplate | null>(null);

  const days = useMemo(() => workouts.map((w) => w.session_date), [workouts]);
  const streak = currentStreak(days, today);
  const longest = longestStreak(days);
  const badges = unlockedMilestones(streak);

  const weekStart = startOfWeek(today);
  const thisWeek = workouts.filter((w) => w.session_date >= weekStart);
  const totalMinutes = workouts.reduce((sum, w) => sum + w.duration_min, 0);

  const heatmap: Record<string, number> = {};
  for (const w of workouts) {
    heatmap[w.session_date] = Math.min(1, Math.max(0.3, w.intensity / 5));
  }

  const exercisesByWorkout = useMemo(() => {
    const map = new Map<string, WorkoutExercise[]>();
    for (const e of exercises) {
      if (!map.has(e.workout_id)) map.set(e.workout_id, []);
      map.get(e.workout_id)!.push(e);
    }
    return map;
  }, [exercises]);

  const stancesByWorkout = useMemo(() => {
    const map = new Map<string, StanceLog[]>();
    for (const s of stanceLogs) {
      if (!s.workout_id) continue;
      if (!map.has(s.workout_id)) map.set(s.workout_id, []);
      map.get(s.workout_id)!.push(s);
    }
    return map;
  }, [stanceLogs]);

  async function removeWorkout(workout: Workout) {
    if (!window.confirm(`Supprimer la seance du ${formatLong(workout.session_date)} ?`)) return;
    await supabase.from("workouts").delete().eq("id", workout.id);
    window.location.reload();
  }

  function openWithTemplate(t: SessionTemplate | null) {
    setTemplate(t);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-4 bg-card">
        <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-3xl bg-accent-soft text-4xl">
          🥋
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-black tracking-tight">
            {streak > 0 ? `${streak} jour${streak > 1 ? "s" : ""} d'affilee 🔥` : "Prets a demarrer ?"}
          </p>
          <p className="mt-0.5 text-sm font-bold text-muted">
            {thisWeek.length} seance{thisWeek.length > 1 ? "s" : ""} cette semaine · record {longest} j
          </p>
          {badges.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1 text-lg">
              {badges.map((b) => (
                <span key={b} title={MILESTONE_BADGES[b].label}>
                  {MILESTONE_BADGES[b].emoji}
                </span>
              ))}
            </div>
          )}
          <Button className="mt-3" onClick={() => openWithTemplate(null)}>
            + Nouvelle seance
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile emoji="🔥" label="Serie" value={`${streak} j`} />
        <StatTile emoji="🗓️" label="Cette semaine" value={thisWeek.length} hint="seances" />
        <StatTile emoji="⏱️" label="Temps total" value={`${Math.round(totalMinutes / 60)} h`} hint="12 derniers mois" />
        <StatTile emoji="📊" label="Seances" value={workouts.length} />
      </div>

      <Card>
        <CardTitle emoji="🗓️">Assiduite</CardTitle>
        <Heatmap values={heatmap} weeks={22} endDate={today} />
      </Card>

      <Card>
        <CardTitle emoji="💡" action={<Chip tone="accent">sans materiel</Chip>}>
          Seances types pour demarrer
        </CardTitle>
        <ul className="space-y-2">
          {SESSION_TEMPLATES.map((t) => (
            <li key={t.key} className="rounded-[var(--radius-control)] border border-hair bg-card p-3">
              <div className="flex items-start gap-3">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-accent-soft text-xl">
                  {t.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-black">{t.name}</p>
                  <p className="text-[11px] font-bold text-muted">
                    {t.duration} min · {t.focus} · {t.level}
                  </p>
                  <ul className="mt-2 space-y-0.5 text-xs font-semibold text-muted">
                    {t.blocks.map((b, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span aria-hidden className="text-accent-ink">
                          •
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Button
                variant="soft"
                size="sm"
                className="mt-2 w-full"
                onClick={() => openWithTemplate(t)}
              >
                Utiliser ce modele
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle emoji="📓">Journal des seances</CardTitle>

        {workouts.length === 0 ? (
          <EmptyState emoji="🥋" title="Aucune seance enregistree">
            Lance-toi avec la seance type « Fondations » : 30 minutes, sans materiel.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {workouts.slice(0, 30).map((w) => {
              const ex = exercisesByWorkout.get(w.id) ?? [];
              const st = stancesByWorkout.get(w.id) ?? [];
              return (
                <li key={w.id} className="rounded-[var(--radius-control)] border border-hair bg-card p-3">
                  <div className="flex items-start gap-3">
                    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-accent-soft text-lg">
                      🥋
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-black capitalize">{formatLong(w.session_date)}</p>
                      <p className="text-[11px] font-bold text-muted">
                        {w.duration_min} min · intensite {"🔴".repeat(w.intensity)}
                        {w.focus ? ` · ${w.focus}` : ""}
                      </p>

                      {st.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {st.map((s) => (
                            <Chip key={s.id} tone="accent">
                              {STANCE_BY_KEY[s.stance_key]?.emoji ?? "🧍"}{" "}
                              {STANCE_BY_KEY[s.stance_key]?.pinyin ?? s.stance_key} ·{" "}
                              {formatSeconds(s.hold_seconds)}
                            </Chip>
                          ))}
                        </div>
                      )}

                      {ex.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5 text-xs font-semibold text-muted">
                          {ex.map((e) => (
                            <li key={e.id}>
                              {EXERCISE_CATEGORY_META[e.category].emoji} {e.name}
                              {e.sets ? ` — ${e.sets} x ` : " — "}
                              {e.reps ? `${e.reps} reps` : ""}
                              {e.duration_sec ? `${e.duration_sec} s` : ""}
                            </li>
                          ))}
                        </ul>
                      )}

                      {w.notes && (
                        <p className="mt-1.5 whitespace-pre-line rounded-xl bg-sunk px-2.5 py-1.5 text-xs font-semibold text-muted">
                          {w.notes}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeWorkout(w)}
                      aria-label="Supprimer la seance"
                      className="px-1 text-xs font-bold text-muted/60 transition hover:text-danger"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <WorkoutForm
        userId={userId}
        today={today}
        open={open}
        template={template}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
