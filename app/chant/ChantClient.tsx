"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Card, CardTitle, SectionLabel } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { LineChart } from "@/components/ui/LineChart";
import { StatTile } from "@/components/ui/StatTile";
import { usePitchDetector } from "@/lib/audio";
import { addDays, formatShort } from "@/lib/dates";
import { currentStreak } from "@/lib/streaks";
import type { VoiceProfile, VoiceSession } from "@/lib/types";
import {
  EXERCISE_BY_KEY,
  VOICE_TYPE_BY_KEY,
  exerciseOfTheDay,
  noteName,
} from "@/lib/voice";
import { LiveTuner } from "./LiveTuner";

export function ChantClient({
  today,
  sessions,
  profile,
}: {
  today: string;
  sessions: VoiceSession[];
  profile: VoiceProfile | null;
}) {
  const detector = usePitchDetector();

  const days = new Set(sessions.map((s) => s.session_date));
  const streak = currentStreak(days, today);
  const todays = sessions.filter((s) => s.session_date === today);
  const warmedUp = todays.some((s) => s.exercise_key === "echauffement");
  const daily = exerciseOfTheDay(today);
  const dailyDone = todays.some((s) => s.exercise_key === daily.key);

  const weekFrom = addDays(today, -6);
  const weekScores = sessions
    .filter((s) => s.score !== null && s.session_date >= weekFrom)
    .map((s) => s.score!);
  const weekAvg = weekScores.length
    ? Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length)
    : null;

  // Justesse moyenne par jour : la courbe qui montre qu'on progresse.
  const byDay = new Map<string, number[]>();
  for (const s of sessions) {
    if (s.score === null) continue;
    byDay.set(s.session_date, [...(byDay.get(s.session_date) ?? []), s.score]);
  }
  const points = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-20)
    .map(([d, scores]) => ({
      label: formatShort(d),
      value: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));

  const recent = [...sessions].reverse().filter((s) => s.score !== null).slice(0, 5);

  const plan = [
    {
      done: warmedUp,
      emoji: "🌬️",
      title: "Echauffement",
      hint: "5 minutes : souffle, trilles, sirenes",
      href: "/chant/echauffement",
    },
    {
      done: dailyDone,
      emoji: daily.emoji,
      title: `Exercice du jour : ${daily.title}`,
      hint: daily.goal,
      href: `/chant/exercices?e=${daily.key}`,
    },
    {
      done: profile !== null,
      emoji: "📏",
      title: profile ? "Tessiture mesuree" : "Mesurer ta tessiture",
      hint: profile
        ? `${noteName(profile.low_midi)} → ${noteName(profile.high_midi)}`
        : "Pour que les exercices tombent dans ta voix",
      href: "/chant/tessiture",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Serie" value={`${streak} j`} hint="jours d'affilee" />
        <StatTile
          label="Justesse"
          value={weekAvg === null ? "—" : `${weekAvg}%`}
          hint="moyenne 7 jours"
          tone={weekAvg !== null && weekAvg >= 70 ? "accent" : "plain"}
        />
        <StatTile
          label="Voix"
          value={
            <span className="text-[20px]">
              {profile ? VOICE_TYPE_BY_KEY[profile.voice_type]?.label ?? "—" : "?"}
            </span>
          }
          hint={profile ? "d'apres ton test" : "a mesurer"}
        />
      </div>

      <Card>
        <CardTitle>Accordeur vocal</CardTitle>
        <LiveTuner detector={detector} />
        <p className="mt-3 text-[13px] font-medium leading-relaxed text-ink-3">
          Chante une voyelle tenue (« aaa ») : la note s'affiche, l'aiguille dit si tu es trop
          haut ou trop bas. Vert = juste. Le son reste sur ton appareil, rien n'est enregistre.
        </p>
      </Card>

      <section>
        <SectionLabel>Aujourd'hui</SectionLabel>
        <ul className="space-y-2">
          {plan.map((p) => (
            <li key={p.title}>
              <Link
                href={p.href}
                className="flex min-h-[64px] items-center gap-3 rounded-[var(--radius-card)] border border-hairline bg-surface px-4 py-3 transition hover:border-accent/40"
              >
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-module/15 text-xl"
                >
                  {p.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-bold ${p.done ? "text-ink-3 line-through" : ""}`}>{p.title}</p>
                  <p className="truncate text-[13px] font-medium text-ink-3">{p.hint}</p>
                </div>
                {p.done ? (
                  <span className="grid size-7 place-items-center rounded-full bg-accent text-on-accent">
                    <Icon name="check" size={16} strokeWidth={3} />
                  </span>
                ) : (
                  <Icon name="chevron" size={20} className="-rotate-90 text-ink-3" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Card>
        <CardTitle>Progression de la justesse</CardTitle>
        <LineChart points={points} unit="%" />
      </Card>

      {recent.length > 0 && (
        <Card>
          <CardTitle>Derniers exercices</CardTitle>
          <ul className="divide-y divide-hairline">
            {recent.map((s) => {
              const ex = EXERCISE_BY_KEY[s.exercise_key];
              return (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <span aria-hidden className="text-xl">
                    {ex?.emoji ?? "🎵"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{ex?.title ?? s.exercise_key}</p>
                    <p className="text-[12px] font-medium text-ink-3">
                      {formatShort(s.session_date)}
                      {s.root_midi !== null && ` · depart ${noteName(s.root_midi)}`}
                    </p>
                  </div>
                  <Chip tone={s.score! >= 80 ? "good" : s.score! >= 50 ? "warn" : "neutral"}>
                    {s.score}%
                  </Chip>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
