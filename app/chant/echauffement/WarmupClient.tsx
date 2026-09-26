"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, SectionLabel } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { usePitchDetector } from "@/lib/audio";
import { burstConfetti } from "@/lib/confetti";
import { createClient } from "@/lib/supabase/client";
import { TIPS, WARMUP, formatDuration, type WarmupStep } from "@/lib/voice";
import { LiveTuner } from "../LiveTuner";

/**
 * Echauffement guide : une etape a la fois, avec un minuteur. Rien n'est
 * note ici — le but est de reveiller la voix, pas de la juger. Le micro
 * est facultatif et sert juste a voir ses sirenes.
 */
export function WarmupClient({
  userId,
  today,
  doneToday,
}: {
  userId: string;
  today: string;
  doneToday: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const detector = usePitchDetector();

  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const doneRef = useRef<HTMLDivElement>(null);

  const step = WARMUP[index];
  const total = WARMUP.reduce((a, s) => a + s.seconds, 0);
  const before = WARMUP.slice(0, index).reduce((a, s) => a + s.seconds, 0);
  const overall = Math.min(1, (before + elapsed) / total);

  useEffect(() => {
    if (!running) return;
    const started = performance.now() - elapsed * 1000;
    const id = window.setInterval(() => setElapsed((performance.now() - started) / 1000), 100);
    return () => window.clearInterval(id);
    // `elapsed` ne sert que de point de depart : a la reprise apres une
    // pause, ou a zero quand on change d'etape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, index]);

  useEffect(() => {
    if (!running || elapsed < step.seconds) return;
    if (index < WARMUP.length - 1) {
      go(index + 1);
    } else {
      void complete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, running]);

  function go(i: number) {
    setIndex(i);
    setElapsed(0);
  }

  async function complete() {
    setRunning(false);
    setFinished(true);
    detector.stop();
    burstConfetti(doneRef.current, 28);
    await supabase.from("voice_sessions").insert({
      user_id: userId,
      session_date: today,
      exercise_key: "echauffement",
      duration_sec: total,
    });
    router.refresh();
  }

  if (finished) {
    return (
      <Card className="text-center">
        <div ref={doneRef} className="py-6">
          <p className="text-4xl" aria-hidden>
            🎉
          </p>
          <p className="mt-3 text-[22px] font-extrabold tracking-[-0.02em]">Voix reveillee</p>
          <p className="mt-1 text-[14px] font-medium text-ink-2">
            {formatDuration(total)} d'echauffement. Tu es pret pour les exercices.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => { setFinished(false); go(0); }}>
              Refaire
            </Button>
            <Button onClick={() => router.push("/chant/exercices")}>
              Aux exercices
              <Icon name="back" size={18} className="rotate-180" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-[14px] font-medium text-ink-2">
          {WARMUP.length} etapes · {formatDuration(total)}
        </p>
        {doneToday && <Chip tone="good">deja fait aujourd'hui</Chip>}
      </div>

      <Card>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${overall * 100}%` }}
          />
        </div>

        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-control)] bg-module/15 text-2xl"
          >
            {step.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">
              Etape {index + 1}/{WARMUP.length}
            </p>
            <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">{step.title}</h2>
          </div>
          <p className="text-[26px] font-extrabold tabular-nums">
            {Math.max(0, Math.ceil(step.seconds - elapsed))}
            <span className="text-[14px] text-ink-3"> s</span>
          </p>
        </div>

        <p className="mt-4 text-[15px] font-semibold leading-relaxed">{step.how}</p>
        <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink-3">{step.why}</p>

        {step.breath && <BreathCircle step={step} elapsed={elapsed} />}

        {step.listen && (
          <div className="mt-4">
            {detector.state === "on" ? (
              <LiveTuner detector={detector} laneHeight={150} compact />
            ) : (
              <Button variant="secondary" className="w-full" onClick={() => detector.start()}>
                <Icon name="mic" size={18} />
                Voir ma voix pendant l'exercice
              </Button>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-2">
          <Button variant="ghost" onClick={() => go(Math.max(0, index - 1))} disabled={index === 0}>
            <Icon name="back" size={18} />
          </Button>
          <Button size="lg" onClick={() => setRunning((r) => !r)} className="min-w-40">
            <Icon name={running ? "stop" : "play"} size={18} />
            {running ? "Pause" : elapsed > 0 ? "Reprendre" : index === 0 ? "Commencer" : "Continuer"}
          </Button>
          <Button
            variant="ghost"
            aria-label="Etape suivante"
            onClick={() => (index < WARMUP.length - 1 ? go(index + 1) : complete())}
          >
            <Icon name="back" size={18} className="rotate-180" />
          </Button>
        </div>
      </Card>

      <ol className="grid gap-1.5">
        {WARMUP.map((s, i) => (
          <li key={s.key}>
            <button
              onClick={() => go(i)}
              className={`flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-control)] px-3 text-left ${
                i === index ? "bg-raised" : ""
              }`}
            >
              <span aria-hidden>{s.emoji}</span>
              <span className={`flex-1 text-[14px] font-semibold ${i < index ? "text-ink-3 line-through" : ""}`}>
                {s.title}
              </span>
              <span className="text-[12px] font-semibold tabular-nums text-ink-3">{s.seconds} s</span>
            </button>
          </li>
        ))}
      </ol>

      <section>
        <SectionLabel>Les bases</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPS.map((t) => (
            <Card key={t.title}>
              <CardTitle>
                <span aria-hidden className="mr-2">
                  {t.emoji}
                </span>
                {t.title}
              </CardTitle>
              <p className="-mt-2 text-[14px] font-medium leading-relaxed text-ink-2">{t.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Le cercle gonfle a l'inspiration, se tient, puis se vide a l'expiration. */
function BreathCircle({ step, elapsed }: { step: WarmupStep; elapsed: number }) {
  const [inhale, hold, exhale] = step.breath!;
  const cycle = inhale + hold + exhale;
  const t = elapsed % cycle;

  let label: string;
  let scale: number;
  let left: number;
  if (t < inhale) {
    label = "Inspire";
    scale = 0.5 + 0.5 * (t / inhale);
    left = inhale - t;
  } else if (t < inhale + hold) {
    label = "Bloque";
    scale = 1;
    left = inhale + hold - t;
  } else {
    label = "Expire · sss";
    scale = 1 - 0.5 * ((t - inhale - hold) / exhale);
    left = cycle - t;
  }

  return (
    <div className="mt-5 grid place-items-center">
      <div className="relative grid size-44 place-items-center">
        <div
          className="absolute inset-0 rounded-full bg-module/25 transition-transform duration-100 ease-linear"
          style={{ transform: `scale(${scale})` }}
        />
        <div
          className="absolute inset-0 rounded-full border border-module/50"
          aria-hidden
        />
        <div className="relative text-center">
          <p className="text-[18px] font-extrabold">{label}</p>
          <p className="text-[13px] font-semibold tabular-nums text-ink-2">{Math.ceil(left)}</p>
        </div>
      </div>
    </div>
  );
}
