"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { getAudioContext, playNote, playNotes, usePitchDetector, type PitchFrame } from "@/lib/audio";
import { burstConfetti } from "@/lib/confetti";
import { createClient } from "@/lib/supabase/client";
import type { VoiceProfile } from "@/lib/types";
import {
  IN_TUNE_CENTS,
  LEVEL_LABEL,
  comfortableRoot,
  foldedCents,
  noteName,
  type ExerciseDef,
} from "@/lib/voice";
import { MicHint } from "../LiveTuner";
import { PitchLane, type LaneTarget } from "../PitchLane";

type Phase = "ready" | "listen" | "sing" | "result";

interface Result {
  score: number;
  perNote: number[];
  /** Ecart moyen quand la voix est la, en cents : negatif = trop bas. */
  bias: number | null;
}

/** Silence entre le modele et ta reprise, le temps d'inspirer. */
const GAP_SEC = 1.6;
/** On laisse a la voix le temps de se poser avant de juger chaque note. */
const ATTACK_SEC = 0.15;

export function ExerciseRunner({
  userId,
  today,
  exercise,
  profile,
  best,
}: {
  userId: string;
  today: string;
  exercise: ExerciseDef;
  profile: VoiceProfile | null;
  best: number | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const detector = usePitchDetector();

  const top = Math.max(...exercise.pattern);
  const minRoot = profile ? profile.low_midi : 36;
  const maxRoot = (profile ? profile.high_midi : 84) - top;
  const clampRoot = (r: number) => Math.max(minRoot, Math.min(Math.max(minRoot, maxRoot), r));

  const [root, setRoot] = useState(() => clampRoot(comfortableRoot(profile)));
  const [phase, setPhase] = useState<Phase>("ready");
  const [targets, setTargets] = useState<LaneTarget[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [guide, setGuide] = useState(false);
  const [saved, setSaved] = useState(false);

  const timers = useRef<number[]>([]);
  const stopAudio = useRef<(() => void) | null>(null);
  const unsubscribe = useRef<(() => void) | null>(null);
  const scoreRef = useRef<HTMLDivElement>(null);

  function cleanup() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    stopAudio.current?.();
    stopAudio.current = null;
    unsubscribe.current?.();
    unsubscribe.current = null;
  }

  useEffect(() => cleanup, []);

  async function run(startRoot: number) {
    cleanup();
    setResult(null);
    setSaved(false);
    setRoot(startRoot);
    if (!(await detector.start())) return;

    const ctx = getAudioContext();
    const n = exercise.pattern.length;
    const d = exercise.noteSec;
    const t0 = ctx.currentTime + 0.5;
    const singStart = t0 + n * d + GAP_SEC;
    const singEnd = singStart + n * d;

    const listen = exercise.pattern.map((o, i) => ({ midi: startRoot + o, at: t0 + i * d, dur: d * 0.94 }));
    const sing = exercise.pattern.map((o, i) => ({
      midi: startRoot + o,
      at: singStart + i * d,
      dur: d * 0.94,
    }));

    // Le guide rejoue la melodie pendant que tu chantes. Sans ecouteurs,
    // le micro l'entendrait et la noterait a ta place : il est donc
    // desactive par defaut.
    stopAudio.current = playNotes(guide ? [...listen, ...sing] : listen);

    setTargets([
      ...listen.map((s) => ({ midi: s.midi, t0: s.at, t1: s.at + d, kind: "listen" as const })),
      ...sing.map((s) => ({ midi: s.midi, t0: s.at, t1: s.at + d, kind: "sing" as const })),
    ]);
    setPhase("listen");

    const frames: PitchFrame[] = [];
    unsubscribe.current = detector.subscribe((f) => {
      if (f.t >= singStart && f.t <= singEnd) frames.push(f);
    });

    const at = (sec: number, fn: () => void) =>
      timers.current.push(
        window.setTimeout(fn, Math.max(0, (sec - ctx.currentTime) * 1000)),
      );

    at(singStart - GAP_SEC * 0.6, () => setPhase("sing"));
    at(singEnd + 0.25, () => {
      unsubscribe.current?.();
      unsubscribe.current = null;
      const r = score(frames, sing.map((s) => ({ midi: s.midi, t0: s.at, t1: s.at + d })));
      setResult(r);
      setPhase("result");
      void save(r, startRoot, Math.round(singEnd - t0));
    });
  }

  async function save(r: Result, startRoot: number, duration: number) {
    if (r.score >= 80) burstConfetti(scoreRef.current, 28);
    const { error } = await supabase.from("voice_sessions").insert({
      user_id: userId,
      session_date: today,
      exercise_key: exercise.key,
      root_midi: startRoot,
      score: r.score,
      duration_sec: duration,
    });
    if (!error) {
      setSaved(true);
      router.refresh();
    }
  }

  const busy = phase === "listen" || phase === "sing";
  const melody = exercise.pattern.map((o) => noteName(root + o)).join(" · ");

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-control)] bg-module/15 text-2xl"
          >
            {exercise.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">{exercise.title}</h1>
            <p className="mt-0.5 text-[14px] font-medium text-ink-2">{exercise.goal}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip>{LEVEL_LABEL[exercise.level]}</Chip>
              <Chip>sur {exercise.syllable}</Chip>
              {best !== null && <Chip tone="good">record {best}%</Chip>}
            </div>
          </div>
        </div>
        <p className="mt-4 rounded-[var(--radius-control)] bg-raised px-3 py-2.5 text-[13px] font-medium leading-relaxed text-ink-2">
          💡 {exercise.tip}
        </p>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <PhaseBadge phase={phase} />
          <span className="truncate text-[12px] font-semibold text-ink-3">{melody}</span>
        </div>

        <PitchLane detector={detector} targets={targets} running={detector.state === "on"} height={240} />

        <MicHint state={detector.state} />

        {phase === "result" && result && (
          <div ref={scoreRef} className="mt-4 animate-rise text-center">
            <div
              className={`text-[52px] font-extrabold leading-none tabular-nums tracking-[-0.03em] ${
                result.score >= 80 ? "text-good" : result.score >= 50 ? "text-warn" : "text-ink"
              }`}
            >
              {result.score}%
            </div>
            <p className="mt-1 text-[14px] font-semibold text-ink-2">{verdict(result)}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="Justesse note par note">
              {result.perNote.map((p, i) => (
                <span
                  key={i}
                  title={`${noteName(root + exercise.pattern[i])} : ${Math.round(p * 100)}%`}
                  className={`grid h-8 min-w-8 place-items-center rounded-full px-2 text-[11px] font-bold ${
                    p >= 0.7 ? "bg-good-dim text-good" : p >= 0.35 ? "bg-warn-dim text-warn" : "bg-raised text-ink-3"
                  }`}
                >
                  {noteName(root + exercise.pattern[i]).replace(/\d+$/, "")}
                </span>
              ))}
            </div>
            {saved && <p className="mt-2 text-[12px] font-semibold text-ink-3">Enregistre dans ta progression.</p>}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {phase === "result" ? (
            <>
              <Button variant="secondary" onClick={() => run(clampRoot(root - 1))} disabled={root <= minRoot}>
                ↓ Demi-ton
              </Button>
              <Button onClick={() => run(root)}>Recommencer</Button>
              <Button variant="secondary" onClick={() => run(clampRoot(root + 1))} disabled={root >= maxRoot}>
                ↑ Demi-ton
              </Button>
            </>
          ) : (
            <Button size="lg" onClick={() => run(root)} disabled={busy || detector.state === "starting"}>
              <Icon name="play" size={18} />
              {busy ? "En cours…" : "Commencer"}
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Note de depart</p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            aria-label="Un demi-ton plus bas"
            onClick={() => setRoot((r) => clampRoot(r - 1))}
            disabled={busy || root <= minRoot}
          >
            −
          </Button>
          <button
            onClick={() => playNote(root)}
            disabled={busy}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-raised text-[18px] font-extrabold tabular-nums"
          >
            {noteName(root)}
            <Icon name="play" size={14} className="text-ink-3" />
          </button>
          <Button
            variant="secondary"
            aria-label="Un demi-ton plus haut"
            onClick={() => setRoot((r) => clampRoot(r + 1))}
            disabled={busy || root >= maxRoot}
          >
            +
          </Button>
        </div>
        <p className="mt-2 text-[12px] font-medium text-ink-3">
          {profile
            ? "Calee sur ta tessiture. Touche la note pour l'entendre."
            : "Mesure ta tessiture pour que les exercices tombent pile dans ta voix."}
        </p>

        <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={guide}
            onChange={(e) => setGuide(e.target.checked)}
            disabled={busy}
            className="size-5 accent-[var(--color-accent)]"
          />
          <span className="text-[14px] font-semibold text-ink-2">
            Guide pendant que je chante <span className="text-ink-3">(avec ecouteurs seulement)</span>
          </span>
        </label>
      </Card>
    </div>
  );
}

function PhaseBadge({ phase }: { phase: Phase }) {
  const map: Record<Phase, { text: string; tone: "neutral" | "accent" | "good" }> = {
    ready: { text: "Pret ?", tone: "neutral" },
    listen: { text: "👂 Ecoute", tone: "neutral" },
    sing: { text: "🎤 A toi !", tone: "accent" },
    result: { text: "Resultat", tone: "good" },
  };
  return <Chip tone={map[phase].tone}>{map[phase].text}</Chip>;
}

/**
 * Pour chaque note : la part des trames ou la voix est a moins d'un quart
 * de ton de la cible. Le silence compte comme une erreur — sinon il
 * suffirait de ne rien chanter pour avoir 100%.
 */
function score(frames: PitchFrame[], notes: { midi: number; t0: number; t1: number }[]): Result {
  const deviations: number[] = [];
  const perNote = notes.map((n) => {
    const inside = frames.filter((f) => f.t >= n.t0 + ATTACK_SEC && f.t < n.t1);
    if (!inside.length) return 0;
    let ok = 0;
    for (const f of inside) {
      if (f.midi === null) continue;
      const c = foldedCents(f.midi, n.midi);
      deviations.push(c);
      if (Math.abs(c) <= IN_TUNE_CENTS) ok++;
    }
    return ok / inside.length;
  });

  const avg = perNote.reduce((a, b) => a + b, 0) / Math.max(1, perNote.length);
  // L'ecart median plutot que moyen : un glissement d'une note sur
  // l'autre ne doit pas faire croire a un defaut systematique.
  const sorted = [...deviations].sort((a, b) => a - b);
  const bias = sorted.length > 8 ? sorted[Math.floor(sorted.length / 2)] : null;

  return { score: Math.round(avg * 100), perNote, bias };
}

function verdict(r: Result): string {
  if (r.bias === null) return "Je ne t'ai presque pas entendu : rapproche-toi du micro et chante plus franchement.";
  const b = Math.round(r.bias);
  if (Math.abs(b) >= 100 && r.score < 50)
    return "Tu chantes une autre note que le modele. Reecoute-le, fredonne-le dans ta tete, puis reessaie.";
  const drift =
    b <= -20
      ? ` Tu chantes plutot un peu bas (${b} cents) : pense la note plus haut.`
      : b >= 20
        ? ` Tu chantes plutot un peu haut (+${b} cents) : detends-toi.`
        : "";
  if (r.score >= 90) return `Magnifique, c'est juste !${drift}`;
  if (r.score >= 75) return `Tres bien.${drift || " Monte d'un demi-ton pour continuer."}`;
  if (r.score >= 50) return `Pas mal, ca vient.${drift}`;
  return `Reecoute le modele et reessaie.${drift}`;
}
