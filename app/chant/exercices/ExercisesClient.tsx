"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { SectionLabel } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import type { VoiceProfile, VoiceSession } from "@/lib/types";
import { EXERCISES, EXERCISE_BY_KEY, LEVEL_LABEL, type ExerciseLevel } from "@/lib/voice";
import { ExerciseRunner } from "./ExerciseRunner";

export function ExercisesClient({
  userId,
  today,
  initialKey,
  sessions,
  profile,
}: {
  userId: string;
  today: string;
  initialKey: string | null;
  sessions: VoiceSession[];
  profile: VoiceProfile | null;
}) {
  const [selected, setSelected] = useState<string | null>(
    initialKey && EXERCISE_BY_KEY[initialKey] ? initialKey : null,
  );

  const best = new Map<string, number>();
  const count = new Map<string, number>();
  for (const s of sessions) {
    best.set(s.exercise_key, Math.max(best.get(s.exercise_key) ?? 0, s.score ?? 0));
    count.set(s.exercise_key, (count.get(s.exercise_key) ?? 0) + 1);
  }

  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          className="mb-3 inline-flex min-h-11 items-center gap-1 pr-3 text-[14px] font-semibold text-ink-2"
        >
          <Icon name="back" size={18} />
          Tous les exercices
        </button>
        <ExerciseRunner
          key={selected}
          userId={userId}
          today={today}
          exercise={EXERCISE_BY_KEY[selected]}
          profile={profile}
          best={best.get(selected) ?? null}
        />
      </div>
    );
  }

  const levels: ExerciseLevel[] = ["debutant", "intermediaire", "avance"];

  return (
    <div className="space-y-6">
      <p className="px-1 text-[14px] font-medium leading-relaxed text-ink-2">
        Chaque exercice se fait en deux temps : <b className="text-ink">tu ecoutes</b> le modele,
        puis <b className="text-ink">tu le rechantes</b>. La courbe devient verte quand tu es
        juste. Termine, monte d'un demi-ton et recommence : c'est comme ca que la voix s'etend.
      </p>

      {levels.map((level) => (
        <section key={level}>
          <SectionLabel>{LEVEL_LABEL[level]}</SectionLabel>
          <ul className="space-y-2">
            {EXERCISES.filter((e) => e.level === level).map((e) => {
              const b = best.get(e.key);
              return (
                <li key={e.key}>
                  <button
                    onClick={() => setSelected(e.key)}
                    className="flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-hairline bg-surface px-4 py-3 text-left transition hover:border-accent/40"
                  >
                    <span
                      aria-hidden
                      className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] bg-module/15 text-xl"
                    >
                      {e.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{e.title}</p>
                      <p className="line-clamp-2 text-[13px] font-medium text-ink-3">{e.goal}</p>
                    </div>
                    {b !== undefined ? (
                      <Chip tone={b >= 80 ? "good" : b >= 50 ? "warn" : "neutral"}>
                        {b}% · {count.get(e.key)}×
                      </Chip>
                    ) : (
                      <Icon name="chevron" size={20} className="-rotate-90 shrink-0 text-ink-3" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
