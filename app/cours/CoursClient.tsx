"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EmojiPicker } from "@/components/EmojiPicker";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { CheckButton } from "@/components/ui/CheckButton";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StatTile } from "@/components/ui/StatTile";
import { addDays, dayLabel } from "@/lib/dates";
import {
  MILESTONES,
  MILESTONE_BADGES,
  currentStreak,
  longestStreak,
  nextMilestone,
} from "@/lib/streaks";
import { createClient } from "@/lib/supabase/client";
import type { Subject, SubjectLog } from "@/lib/types";

const SUBJECT_EMOJIS = [
  "📘", "📐", "🧪", "💻", "🌍", "📊", "⚖️", "🧬", "🗣️", "🎨",
  "🏛️", "🔬", "📈", "🧠", "🔧", "🎼",
];

export function CoursClient({
  userId,
  today,
  subjects,
  logs,
}: {
  userId: string;
  today: string;
  subjects: Subject[];
  logs: SubjectLog[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📘");
  const [teacher, setTeacher] = useState("");

  const week = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)),
    [today],
  );

  /** subject_id → set des jours valides. */
  const doneBySubject = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const log of logs) {
      if (!log.done) continue;
      if (!map.has(log.subject_id)) map.set(log.subject_id, new Set());
      map.get(log.subject_id)!.add(log.log_date);
    }
    return map;
  }, [logs]);

  const isDone = (subjectId: string, date: string) => {
    const key = `${subjectId}|${date}`;
    if (key in optimistic) return optimistic[key];
    return doneBySubject.get(subjectId)?.has(date) ?? false;
  };

  const stats = subjects.map((s) => {
    const days = [...(doneBySubject.get(s.id) ?? [])];
    // On reflete les toggles optimistes du jour dans la serie affichee.
    const todayKey = `${s.id}|${today}`;
    const withToday =
      todayKey in optimistic
        ? optimistic[todayKey]
          ? [...new Set([...days, today])]
          : days.filter((d) => d !== today)
        : days;
    return {
      subject: s,
      current: currentStreak(withToday, today),
      longest: longestStreak(withToday),
      total: withToday.length,
    };
  });

  const doneToday = subjects.filter((s) => isDone(s.id, today)).length;
  const ratio = subjects.length ? doneToday / subjects.length : 0;

  // Serie globale : un jour compte des qu'au moins une matiere est cochee.
  const allDays = useMemo(() => {
    const set = new Set(logs.filter((l) => l.done).map((l) => l.log_date));
    for (const [key, value] of Object.entries(optimistic)) {
      const date = key.split("|")[1];
      if (value) set.add(date);
    }
    return [...set];
  }, [logs, optimistic]);

  const globalStreak = currentStreak(allDays, today);
  const nextBadge = nextMilestone(globalStreak);

  async function toggle(subject: Subject, date: string, next: boolean) {
    setOptimistic((prev) => ({ ...prev, [`${subject.id}|${date}`]: next }));

    if (next) {
      await supabase
        .from("subject_logs")
        .upsert(
          { user_id: userId, subject_id: subject.id, log_date: date, done: true },
          { onConflict: "subject_id,log_date" },
        );
    } else {
      await supabase
        .from("subject_logs")
        .delete()
        .eq("subject_id", subject.id)
        .eq("log_date", date);
    }
    router.refresh();
  }

  async function createSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await supabase.from("subjects").insert({
      user_id: userId,
      name: name.trim(),
      emoji,
      teacher: teacher.trim() || null,
      sort_order: subjects.length,
    });
    setBusy(false);
    setOpen(false);
    setName("");
    setTeacher("");
    setEmoji("📘");
    router.refresh();
  }

  async function archive(subject: Subject) {
    await supabase.from("subjects").update({ archived: true }).eq("id", subject.id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Deux tuiles de tete : l'avancee du jour, et la serie avec ses badges. */}
      <div className="grid grid-cols-2 gap-3">
        <Card tinted className="flex flex-col items-center justify-center gap-2 !p-4">
          <ProgressRing value={ratio} size={116} stroke={13}>
            <div className="text-xl font-black tabular-nums text-accent-ink">
              {doneToday}/{subjects.length}
            </div>
          </ProgressRing>
          <p className="text-center text-xs font-bold text-accent-ink">Matieres revisees</p>
        </Card>

        <Card className="flex flex-col justify-center gap-3 !p-4">
          <div>
            <p className="text-xs font-bold text-muted">Serie globale</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span aria-hidden className="text-xl">
                🔥
              </span>
              <span className="text-3xl font-black tabular-nums text-accent-ink">
                {globalStreak}
              </span>
              <span className="text-sm font-bold text-muted">
                jour{globalStreak > 1 ? "s" : ""}
              </span>
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Badges recents
            </p>
            <ul className="mt-1.5 flex gap-1.5">
              {MILESTONES.slice(0, 3).map((m) => {
                const unlocked = globalStreak >= m;
                return (
                  <li
                    key={m}
                    title={MILESTONE_BADGES[m].label}
                    className={`grid size-8 place-items-center rounded-full text-base ${
                      unlocked ? "bg-accent-soft" : "bg-sunk opacity-40 grayscale"
                    }`}
                  >
                    <span aria-hidden>{unlocked ? MILESTONE_BADGES[m].emoji : "🔒"}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {nextBadge && (
            <p className="text-[11px] font-bold text-muted">
              {MILESTONE_BADGES[nextBadge].label} dans {nextBadge - globalStreak} j
            </p>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle
          emoji="✅"
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              + Matiere
            </Button>
          }
        >
          Checklist du jour
        </CardTitle>

        {subjects.length === 0 ? (
          <EmptyState emoji="📚" title="Aucune matiere">
            Ajoute tes cours de S6 pour commencer a cocher chaque jour.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {stats.map(({ subject, current }) => {
              const done = isDone(subject.id, today);
              return (
                <li
                  key={subject.id}
                  className={`flex items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 transition ${
                    done ? "border-transparent bg-accent-soft" : "border-hair bg-card"
                  }`}
                >
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-xl bg-card/70 text-lg"
                  >
                    {subject.emoji}
                  </span>

                  <div className="min-w-0 flex-1">
                    <Link href={`/cours/${subject.id}`} className="truncate font-bold hover:underline">
                      {subject.name}
                    </Link>
                    <p className="text-[11px] font-bold text-muted">
                      🔥 {current} j{subject.teacher ? ` · ${subject.teacher}` : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => archive(subject)}
                    aria-label={`Archiver ${subject.name}`}
                    className="rounded-full px-1.5 py-1 text-xs font-bold text-muted/60 transition hover:text-danger"
                  >
                    ✕
                  </button>

                  <CheckButton
                    done={done}
                    label={subject.name}
                    onToggle={(v) => toggle(subject, today, v)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {subjects.length > 0 && (
        <>
          <Card>
            <CardTitle emoji="🗓️" action={<Chip tone="accent">7 derniers jours</Chip>}>
              Ma semaine
            </CardTitle>

            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-x-1 border-spacing-y-1">
                <thead>
                  <tr>
                    <th className="w-[34%]" />
                    {week.map((d) => (
                      <th
                        key={d}
                        className={`pb-1 text-[10px] font-black uppercase ${
                          d === today ? "text-accent-ink" : "text-muted"
                        }`}
                      >
                        {dayLabel(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => (
                    <tr key={s.id}>
                      <td className="max-w-0 truncate pr-1 text-[13px] font-bold">
                        <span aria-hidden className="mr-1">
                          {s.emoji}
                        </span>
                        {s.name}
                      </td>
                      {week.map((d) => {
                        const done = isDone(s.id, d);
                        return (
                          <td key={d} className="text-center">
                            <button
                              type="button"
                              aria-label={`${s.name} le ${d}`}
                              aria-pressed={done}
                              onClick={() => toggle(s, d, !done)}
                              className={`size-7 w-full rounded-[10px] border-2 text-xs font-black transition ${
                                done
                                  ? "border-transparent bg-accent text-on-accent"
                                  : "border-dashed border-hair bg-card text-transparent hover:border-accent"
                              }`}
                            >
                              ✓
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] font-semibold text-muted">
              Astuce : tu peux rattraper un jour oublie en cochant directement dans la grille.
            </p>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile emoji="🔥" label="Serie" value={`${globalStreak} j`} />
            <StatTile
              emoji="🏅"
              label="Record"
              value={`${Math.max(0, ...stats.map((s) => s.longest))} j`}
            />
            <StatTile emoji="📚" label="Matieres" value={subjects.length} />
            <StatTile
              emoji="✅"
              label="Coches"
              value={stats.reduce((n, s) => n + s.total, 0)}
              hint="6 derniers mois"
            />
          </div>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle matiere" emoji="📘">
        <form onSubmit={createSubject} className="space-y-4">
          <Field label="Nom de la matiere">
            <Input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Algorithmique"
            />
          </Field>
          <Field label="Prof (optionnel)">
            <Input
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="Mme Durand"
            />
          </Field>
          <Field label="Emoji">
            <EmojiPicker value={emoji} onChange={setEmoji} presets={SUBJECT_EMOJIS} />
          </Field>
          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? "..." : "Ajouter la matiere"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
