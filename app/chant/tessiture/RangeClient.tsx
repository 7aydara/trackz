"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { usePitchDetector } from "@/lib/audio";
import { burstConfetti } from "@/lib/confetti";
import { createClient } from "@/lib/supabase/client";
import type { VoiceProfile } from "@/lib/types";
import {
  VOICE_TYPES,
  VOICE_TYPE_BY_KEY,
  classifyVoice,
  isBlackKey,
  noteName,
} from "@/lib/voice";
import { MicHint } from "../LiveTuner";
import { PitchLane } from "../PitchLane";

type Step = "intro" | "low" | "high" | "done";

/** Une note compte quand elle est tenue ~0,5 s sans bouger de plus d'un demi-ton. */
const HOLD_FRAMES = 15;

export function RangeClient({
  userId,
  profile,
}: {
  userId: string;
  profile: VoiceProfile | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const detector = usePitchDetector();
  const { subscribe } = detector;

  const [step, setStep] = useState<Step>("intro");
  const [low, setLow] = useState<number | null>(null);
  const [high, setHigh] = useState<number | null>(null);
  const [held, setHeld] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const stepRef = useRef(step);
  stepRef.current = step;

  // On ne retient que les notes *tenues* : un craquement ou un souffle
  // qui passe par une hauteur extreme ne doit pas fausser le test.
  useEffect(() => {
    const recent: (number | null)[] = [];
    return subscribe((f) => {
      recent.push(f.midi);
      if (recent.length > HOLD_FRAMES) recent.shift();
      if (recent.length < HOLD_FRAMES || recent.some((m) => m === null)) {
        setHeld(null);
        return;
      }
      const vals = recent as number[];
      if (Math.max(...vals) - Math.min(...vals) > 1) {
        setHeld(null);
        return;
      }
      const note = Math.round([...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)]);
      setHeld(note);
      if (stepRef.current === "low") setLow((l) => (l === null ? note : Math.min(l, note)));
      if (stepRef.current === "high") setHigh((h) => (h === null ? note : Math.max(h, note)));
    });
  }, [subscribe]);

  async function begin() {
    setLow(null);
    setHigh(null);
    if (await detector.start()) setStep("low");
  }

  function finish() {
    detector.stop();
    setStep("done");
  }

  async function save() {
    if (low === null || high === null || low >= high) return;
    setSaving(true);
    const type = classifyVoice(low, high);
    const { error } = await supabase.from("voice_profiles").upsert(
      { user_id: userId, low_midi: low, high_midi: high, voice_type: type.key },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (!error) {
      burstConfetti(resultRef.current, 24);
      router.refresh();
    }
  }

  const measured = low !== null && high !== null && low < high;
  const shownLow = measured ? low : profile?.low_midi ?? null;
  const shownHigh = measured ? high : profile?.high_midi ?? null;
  const type =
    shownLow !== null && shownHigh !== null
      ? measured
        ? classifyVoice(shownLow, shownHigh)
        : VOICE_TYPE_BY_KEY[profile!.voice_type] ?? classifyVoice(shownLow, shownHigh)
      : null;

  const listening = step === "low" || step === "high";

  return (
    <div className="space-y-4">
      {listening ? (
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <Chip tone="accent">{step === "low" ? "1/2 · Le plus grave" : "2/2 · Le plus aigu"}</Chip>
            <span className="text-[13px] font-semibold text-ink-3">
              {held === null ? "tiens une note…" : `tenue : ${noteName(held)}`}
            </span>
          </div>

          <p className="mb-3 text-[15px] font-semibold leading-relaxed">
            {step === "low"
              ? "Chante « a » sur une note confortable, puis descends note apres note, aussi bas que possible sans forcer. Tiens chaque note une seconde."
              : "Maintenant monte, note apres note, aussi haut que possible. La voix de tete (plus legere, un peu « flutee ») compte aussi !"}
          </p>

          <PitchLane detector={detector} running={detector.state === "on"} height={180} pastSec={5} aheadSec={0.4} />

          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <Record label="Plus grave" value={low} active={step === "low"} />
            <Record label="Plus aigu" value={high} active={step === "high"} />
          </div>

          <div className="mt-4 flex justify-center gap-2">
            <Button variant="ghost" onClick={() => { detector.stop(); setStep("intro"); }}>
              Annuler
            </Button>
            {step === "low" ? (
              <Button onClick={() => setStep("high")} disabled={low === null}>
                Suivant : l'aigu
              </Button>
            ) : (
              <Button onClick={finish} disabled={high === null || low === null || high <= low}>
                Terminer
              </Button>
            )}
          </div>
          <MicHint state={detector.state} />
        </Card>
      ) : (
        <Card>
          <CardTitle>Ta tessiture</CardTitle>
          <div ref={resultRef}>
            {type && shownLow !== null && shownHigh !== null ? (
              <>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="mercury-text text-[34px] font-extrabold leading-none tracking-[-0.03em]">
                      {type.label}
                    </p>
                    <p className="mt-2 text-[14px] font-medium text-ink-2">{type.blurb}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[20px] font-extrabold tabular-nums">
                      {noteName(shownLow)} → {noteName(shownHigh)}
                    </p>
                    <p className="text-[12px] font-semibold text-ink-3">
                      {shownHigh - shownLow} demi-tons · {((shownHigh - shownLow) / 12).toFixed(1)} octaves
                    </p>
                  </div>
                </div>
                <Keyboard low={shownLow} high={shownHigh} />
              </>
            ) : (
              <p className="text-[15px] font-medium leading-relaxed text-ink-2">
                En deux minutes, on mesure la note la plus grave et la plus aigue que tu tiens
                confortablement. Ca donne ton type de voix, et les exercices s'y calent
                automatiquement.
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {step === "done" && measured && (
              <Button onClick={save} disabled={saving}>
                <Icon name="check" size={18} />
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            )}
            <Button variant={step === "done" && measured ? "secondary" : "primary"} onClick={begin}>
              <Icon name="mic" size={18} />
              {profile || measured ? "Refaire le test" : "Lancer le test"}
            </Button>
          </div>
          <MicHint state={detector.state} />
        </Card>
      )}

      <Card>
        <CardTitle>Les types de voix</CardTitle>
        <ul className="space-y-2.5">
          {VOICE_TYPES.map((v) => (
            <li key={v.key}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={`font-bold ${type?.key === v.key ? "text-accent" : ""}`}>{v.label}</span>
                <span className="text-[12px] font-semibold tabular-nums text-ink-3">
                  {noteName(v.low)} → {noteName(v.high)}
                </span>
              </div>
              <RangeBar low={v.low} high={v.high} you={shownLow !== null && shownHigh !== null ? [shownLow, shownHigh] : null} />
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] font-medium leading-relaxed text-ink-3">
          Ce sont les etendues d'un chanteur forme. Au debut, c'est normal d'en couvrir une partie
          seulement : la tessiture s'elargit avec le travail, surtout vers l'aigu.
        </p>
      </Card>
    </div>
  );
}

function Record({ label, value, active }: { label: string; value: number | null; active: boolean }) {
  return (
    <div className={`rounded-[var(--radius-control)] px-3 py-3 ${active ? "bg-accent-dim" : "bg-raised"}`}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{label}</p>
      <p className="mt-1 text-[28px] font-extrabold tabular-nums leading-none">
        {value === null ? "—" : noteName(value)}
      </p>
    </div>
  );
}

const KB_LO = 36; // Do2
const KB_HI = 88; // Mi6

/** Clavier de Do2 a Mi6, avec l'etendue mesuree allumee. */
function Keyboard({ low, high }: { low: number; high: number }) {
  const whites: number[] = [];
  for (let m = KB_LO; m <= KB_HI; m++) if (!isBlackKey(m)) whites.push(m);
  const w = 100 / whites.length;

  return (
    <div className="relative mt-5 h-16 select-none" aria-hidden>
      {whites.map((m, i) => (
        <div
          key={m}
          className={`absolute inset-y-0 border-r border-ground ${m >= low && m <= high ? "bg-module" : "bg-ink/85"} ${
            i === 0 ? "rounded-l-md" : ""
          } ${i === whites.length - 1 ? "rounded-r-md" : ""}`}
          style={{ left: `${i * w}%`, width: `${w}%` }}
        >
          {m % 12 === 0 && (
            <span className="absolute bottom-1 left-0 right-0 text-center text-[8px] font-bold text-ground">
              {noteName(m)}
            </span>
          )}
        </div>
      ))}
      {whites.map((m, i) =>
        isBlackKey(m + 1) && m + 1 <= KB_HI ? (
          <div
            key={`b${m}`}
            className={`absolute top-0 h-[60%] rounded-b-sm ${m + 1 >= low && m + 1 <= high ? "bg-accent" : "bg-ground"}`}
            style={{ left: `${(i + 1) * w - w * 0.3}%`, width: `${w * 0.6}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

function RangeBar({ low, high, you }: { low: number; high: number; you: [number, number] | null }) {
  const pct = (m: number) => ((Math.max(KB_LO, Math.min(KB_HI, m)) - KB_LO) / (KB_HI - KB_LO)) * 100;
  return (
    <div className="relative mt-1 h-2.5 rounded-full bg-raised">
      <div
        className="absolute inset-y-0 rounded-full bg-hairline"
        style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }}
      />
      {you && (
        <div
          className="absolute inset-y-[3px] rounded-full bg-module"
          style={{ left: `${pct(you[0])}%`, width: `${pct(you[1]) - pct(you[0])}%` }}
        />
      )}
    </div>
  );
}
