"use client";

import { useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { LineChart, type ChartPoint } from "@/components/ui/LineChart";
import { StatTile } from "@/components/ui/StatTile";
import { formatShort } from "@/lib/dates";
import { STANCES, formatSeconds } from "@/lib/kungfu";
import type { StanceLog, Workout, WorkoutExercise } from "@/lib/types";
import { StanceTimer } from "./StanceTimer";

export function ProgressClient({
  userId,
  today,
  stanceLogs,
  workouts,
  exercises,
}: {
  userId: string;
  today: string;
  stanceLogs: StanceLog[];
  workouts: Pick<Workout, "id" | "session_date">[];
  exercises: WorkoutExercise[];
}) {
  const [selectedStance, setSelectedStance] = useState(STANCES[0].key);

  /** Meilleure tenue par jour, pour la stance selectionnee. */
  const stanceSeries = useMemo(() => {
    const best = new Map<string, number>();
    for (const log of stanceLogs) {
      if (log.stance_key !== selectedStance) continue;
      best.set(log.log_date, Math.max(best.get(log.log_date) ?? 0, log.hold_seconds));
    }
    return [...best.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map<ChartPoint>(([date, value]) => ({ label: formatShort(date), value }));
  }, [stanceLogs, selectedStance]);

  const stanceStats = useMemo(() => {
    const logs = stanceLogs.filter((l) => l.stance_key === selectedStance);
    const record = logs.reduce((m, l) => Math.max(m, l.hold_seconds), 0);
    const last = logs.length ? logs[logs.length - 1] : null;
    const totalSeconds = logs.reduce((s, l) => s + l.hold_seconds, 0);
    return { count: logs.length, record, last, totalSeconds };
  }, [stanceLogs, selectedStance]);

  const stance = STANCES.find((s) => s.key === selectedStance)!;

  /** Charge par exercice et par jour : series x reps, ou duree totale. */
  const dateByWorkout = useMemo(
    () => new Map(workouts.map((w) => [w.id, w.session_date])),
    [workouts],
  );

  const exerciseGroups = useMemo(() => {
    const groups = new Map<string, Map<string, number>>();
    const modes = new Map<string, "reps" | "duration">();

    for (const ex of exercises) {
      const date = dateByWorkout.get(ex.workout_id);
      if (!date) continue;

      const sets = ex.sets ?? 1;
      const isDuration = !ex.reps && !!ex.duration_sec;
      const load = isDuration ? sets * (ex.duration_sec ?? 0) : sets * (ex.reps ?? 0);
      if (load <= 0) continue;

      modes.set(ex.name, isDuration ? "duration" : "reps");
      if (!groups.has(ex.name)) groups.set(ex.name, new Map());
      const byDate = groups.get(ex.name)!;
      byDate.set(date, (byDate.get(date) ?? 0) + load);
    }

    return [...groups.entries()]
      .map(([name, byDate]) => {
        const points = [...byDate.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map<ChartPoint>(([date, value]) => ({ label: formatShort(date), value }));
        return {
          name,
          mode: modes.get(name) ?? "reps",
          points,
          best: Math.max(...points.map((p) => p.value)),
        };
      })
      .sort((a, b) => b.points.length - a.points.length);
  }, [exercises, dateByWorkout]);

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------- stances */}
      <Card>
        <CardTitle emoji="🧍">Tenue des stances</CardTitle>

        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {STANCES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSelectedStance(s.key)}
              className={`shrink-0 rounded-[var(--radius-control)] border px-3 py-2 text-xs font-bold transition ${
                selectedStance === s.key
                  ? "border-transparent bg-accent text-on-accent"
                  : "border-hair bg-card text-muted"
              }`}
            >
              {s.emoji} {s.pinyin}
            </button>
          ))}
        </div>

        <div className="rounded-[var(--radius-control)] bg-accent-soft px-3 py-2.5">
          <p className="font-black text-accent-ink">
            {stance.emoji} {stance.name}
          </p>
          <p className="text-xs font-semibold text-accent-ink/80">{stance.tip}</p>
          <p className="mt-1 text-xs font-bold text-accent-ink/70">
            Objectif debutant : {formatSeconds(stance.goal)}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile emoji="🏆" label="Record" value={formatSeconds(stanceStats.record)} />
          <StatTile
            emoji="🕐"
            label="Derniere"
            value={stanceStats.last ? formatSeconds(stanceStats.last.hold_seconds) : "—"}
            hint={stanceStats.last ? formatShort(stanceStats.last.log_date) : undefined}
          />
          <StatTile emoji="🔁" label="Series" value={stanceStats.count} />
          <StatTile
            emoji="⏱️"
            label="Cumul"
            value={`${Math.round(stanceStats.totalSeconds / 60)} min`}
          />
        </div>

        <div className="mt-3">
          <p className="mb-1 text-xs font-black uppercase tracking-wide text-muted">
            Evolution (meilleure tenue du jour)
          </p>
          <LineChart points={stanceSeries} unit="s" />
        </div>

        <div className="mt-3">
          <StanceTimer userId={userId} today={today} stanceKey={selectedStance} />
        </div>
      </Card>

      {/* ------------------------------------------------ conditionnement */}
      <Card>
        <CardTitle emoji="💪" action={<Chip tone="accent">charge par seance</Chip>}>
          Conditionnement
        </CardTitle>

        {exerciseGroups.length === 0 ? (
          <EmptyState emoji="📈" title="Aucun exercice enregistre">
            Ajoute des pompes, du gainage ou des squats dans une seance : les courbes
            apparaitront ici.
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {exerciseGroups.map((g) => (
              <li key={g.name} className="rounded-[var(--radius-control)] border border-hair bg-card p-3">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <p className="font-black">{g.name}</p>
                  <p className="text-xs font-bold text-muted">
                    record {g.best} {g.mode === "duration" ? "s" : "reps"}
                  </p>
                </div>
                <LineChart points={g.points} unit={g.mode === "duration" ? "s" : "reps"} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
