"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { burstConfetti } from "@/lib/confetti";
import { CONDITIONING, STANCES, type SessionTemplate } from "@/lib/kungfu";
import { createClient } from "@/lib/supabase/client";
import type { ExerciseCategory } from "@/lib/types";

interface StanceRow {
  key: string;
  seconds: number;
}

interface ExerciseRow {
  name: string;
  category: ExerciseCategory;
  sets: number;
  reps: number;
  seconds: number;
}

/** Saisie d'une seance : base, stances tenues et exercices de conditionnement. */
export function WorkoutForm({
  userId,
  today,
  open,
  template,
  onClose,
}: {
  userId: string;
  today: string;
  open: boolean;
  template: SessionTemplate | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const submitRef = useRef<HTMLButtonElement>(null);

  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState(30);
  const [focus, setFocus] = useState("");
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState("");
  const [stances, setStances] = useState<StanceRow[]>([]);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);

  // A chaque ouverture, on repart du modele choisi (ou d'une seance vierge).
  useEffect(() => {
    if (!open) return;
    setDate(today);
    setDuration(template?.duration ?? 30);
    setFocus(template?.focus ?? "");
    setIntensity(3);
    setNotes("");
    setStances(template ? template.stances.map((s) => ({ ...s })) : []);
    setExercises(
      template
        ? template.exercises.map((e) => ({
            name: e.name,
            category: "conditionnement" as ExerciseCategory,
            sets: e.sets,
            reps: e.reps ?? 0,
            seconds: e.seconds ?? 0,
          }))
        : [],
    );
  }, [open, template, today]);

  function addStance(key: string) {
    if (!key) return;
    setStances((prev) => [...prev, { key, seconds: 30 }]);
  }

  function addExercise(name: string) {
    if (!name) return;
    const preset = CONDITIONING.find((c) => c.name === name);
    setExercises((prev) => [
      ...prev,
      {
        name,
        category: preset?.category ?? "conditionnement",
        sets: 3,
        reps: preset?.mode === "reps" ? 10 : 0,
        seconds: preset?.mode === "duration" ? 30 : 0,
      },
    ]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const { data: workout, error } = await supabase
      .from("workouts")
      .insert({
        user_id: userId,
        session_date: date,
        duration_min: duration,
        focus: focus.trim() || null,
        intensity,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();

    if (!error && workout) {
      const jobs = [];

      if (exercises.length > 0) {
        jobs.push(
          supabase.from("workout_exercises").insert(
            exercises.map((ex, i) => ({
              user_id: userId,
              workout_id: workout.id,
              name: ex.name,
              category: ex.category,
              sets: ex.sets || null,
              reps: ex.reps || null,
              duration_sec: ex.seconds || null,
              sort_order: i,
            })),
          ),
        );
      }

      if (stances.length > 0) {
        jobs.push(
          supabase.from("stance_logs").insert(
            stances.map((s) => ({
              user_id: userId,
              workout_id: workout.id,
              stance_key: s.key,
              log_date: date,
              hold_seconds: s.seconds,
            })),
          ),
        );
      }

      await Promise.all(jobs);
      burstConfetti(submitRef.current, 24);
    }

    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Enregistrer une seance">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Duree (min)">
            <Input
              type="number"
              min="1"
              max="600"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </Field>
        </div>

        <Field label="Theme de la seance">
          <Input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Stances de base, Tan Tui, conditionnement..."
          />
        </Field>

        <Field label="Intensite ressentie">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setIntensity(n)}
                aria-label={`Intensite ${n}`}
                className={`h-11 flex-1 rounded-[var(--radius-control)] border-2 text-lg font-extrabold transition ${
                  intensity >= n
                    ? "border-transparent bg-accent text-on-accent"
                    : "border-hairline bg-surface text-ink-2"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>

        {/* ------------------------------------------------------ stances */}
        <div>
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-2">
            Stances tenues
          </p>
          <ul className="space-y-2">
            {stances.map((s, i) => (
              <li key={`${s.key}-${i}`} className="flex items-center gap-2">
                <span className="w-32 shrink-0 truncate text-sm font-bold">
                  {STANCES.find((x) => x.key === s.key)?.emoji}{" "}
                  {STANCES.find((x) => x.key === s.key)?.pinyin ?? s.key}
                </span>
                <Input
                  type="number"
                  min="0"
                  value={s.seconds}
                  onChange={(e) =>
                    setStances((prev) =>
                      prev.map((row, idx) =>
                        idx === i ? { ...row, seconds: Number(e.target.value) } : row,
                      ),
                    )
                  }
                  className="!py-2 text-sm"
                />
                <span className="text-xs font-bold text-ink-2">s</span>
                <button
                  type="button"
                  onClick={() => setStances((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Retirer la stance"
                  className="tap text-ink-2 transition hover:text-danger"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <Select
            value=""
            onChange={(e) => addStance(e.target.value)}
            className="mt-2 !py-2 text-sm"
          >
            <option value="">+ Ajouter une stance…</option>
            {STANCES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.emoji} {s.pinyin} — {s.name}
              </option>
            ))}
          </Select>
        </div>

        {/* --------------------------------------------------- exercices */}
        <div>
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-2">
            Conditionnement
          </p>
          <ul className="space-y-2">
            {exercises.map((ex, i) => (
              <li key={`${ex.name}-${i}`} className="rounded-[var(--radius-control)] border border-hairline bg-surface p-2">
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm font-bold">{ex.name}</span>
                  <button
                    type="button"
                    onClick={() => setExercises((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="Retirer l'exercice"
                    className="tap text-ink-2 transition hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  <label className="text-[10px] font-bold uppercase text-ink-2">
                    Series
                    <Input
                      type="number"
                      min="0"
                      value={ex.sets}
                      onChange={(e) =>
                        setExercises((prev) =>
                          prev.map((row, idx) =>
                            idx === i ? { ...row, sets: Number(e.target.value) } : row,
                          ),
                        )
                      }
                      className="!py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-[10px] font-bold uppercase text-ink-2">
                    Reps
                    <Input
                      type="number"
                      min="0"
                      value={ex.reps}
                      onChange={(e) =>
                        setExercises((prev) =>
                          prev.map((row, idx) =>
                            idx === i ? { ...row, reps: Number(e.target.value) } : row,
                          ),
                        )
                      }
                      className="!py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-[10px] font-bold uppercase text-ink-2">
                    Duree (s)
                    <Input
                      type="number"
                      min="0"
                      value={ex.seconds}
                      onChange={(e) =>
                        setExercises((prev) =>
                          prev.map((row, idx) =>
                            idx === i ? { ...row, seconds: Number(e.target.value) } : row,
                          ),
                        )
                      }
                      className="!py-1.5 text-sm"
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
          <Select
            value=""
            onChange={(e) => addExercise(e.target.value)}
            className="mt-2 !py-2 text-sm"
          >
            <option value="">+ Ajouter un exercice…</option>
            {CONDITIONING.map((c) => (
              <option key={c.name} value={c.name}>
                {c.emoji} {c.name}
              </option>
            ))}
          </Select>
        </div>

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Sensations, points a corriger, taolu travailles..."
          />
        </Field>

        <Button ref={submitRef} type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? "..." : "Enregistrer la seance"}
        </Button>
      </form>
    </Modal>
  );
}
