"use client";

import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import type { PitchDetector } from "@/lib/audio";
import { letterName, noteName } from "@/lib/voice";
import { PitchLane } from "./PitchLane";

/**
 * Accordeur vocal : la note chantee en grand, l'ecart en cents sur une
 * aiguille, et la courbe de la voix en dessous.
 */
export function LiveTuner({
  detector,
  laneHeight = 200,
  compact = false,
}: {
  detector: PitchDetector;
  laneHeight?: number;
  compact?: boolean;
}) {
  const { state, frame } = detector;
  const on = state === "on";
  const midi = frame?.midi ?? null;
  const nearest = midi === null ? null : Math.round(midi);
  const cents = midi === null ? 0 : Math.round((midi - nearest!) * 100);
  const inTune = midi !== null && Math.abs(cents) <= 15;

  return (
    <div>
      {!compact && (
        <div className="mb-4 flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div
              className={`text-[44px] font-extrabold leading-none tabular-nums tracking-[-0.03em] ${
                nearest === null ? "text-ink-3" : inTune ? "text-good" : "text-ink"
              }`}
            >
              {nearest === null ? "—" : noteName(nearest)}
            </div>
            <p className="mt-1.5 text-[13px] font-semibold text-ink-3">
              {nearest === null
                ? on
                  ? "Chante une note tenue…"
                  : "Micro coupe"
                : `${letterName(nearest)} · ${frame!.freq!.toFixed(0)} Hz · ${
                    cents > 0 ? "+" : ""
                  }${cents} cents`}
            </p>
          </div>
          <Button
            variant={on ? "secondary" : "primary"}
            onClick={() => (on ? detector.stop() : detector.start())}
            disabled={state === "starting"}
          >
            <Icon name={on ? "stop" : "mic"} size={18} />
            {on ? "Couper" : "Ecouter"}
          </Button>
        </div>
      )}

      {!compact && <CentsNeedle cents={midi === null ? null : cents} />}

      <div className={compact ? "" : "mt-4"}>
        <PitchLane detector={detector} running={on} height={laneHeight} pastSec={5} aheadSec={0.4} />
      </div>

      <MicHint state={state} />
    </div>
  );
}

/** Aiguille de -50 a +50 cents : trop bas a gauche, trop haut a droite. */
export function CentsNeedle({ cents }: { cents: number | null }) {
  const pos = cents === null ? 50 : 50 + Math.max(-50, Math.min(50, cents));
  const good = cents !== null && Math.abs(cents) <= 15;
  return (
    <div>
      <div className="relative h-3 overflow-hidden rounded-full bg-raised">
        <div className="absolute inset-y-0 left-[35%] right-[35%] bg-good-dim" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-ink-3" />
        <div
          className={`absolute inset-y-0 w-1.5 -translate-x-1/2 rounded-full transition-[left] duration-100 ${
            cents === null ? "bg-hairline" : good ? "bg-good" : "bg-accent"
          }`}
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-semibold text-ink-3">
        <span>trop bas</span>
        <span>juste</span>
        <span>trop haut</span>
      </div>
    </div>
  );
}

export function MicHint({ state }: { state: PitchDetector["state"] }) {
  if (state === "denied")
    return (
      <p className="mt-3 rounded-[var(--radius-control)] bg-danger-dim px-3 py-2 text-[13px] font-semibold text-danger">
        Le micro est bloque. Autorise-le dans les reglages du navigateur (icone de cadenas a cote
        de l'adresse), puis reessaie.
      </p>
    );
  if (state === "unsupported")
    return (
      <p className="mt-3 rounded-[var(--radius-control)] bg-warn-dim px-3 py-2 text-[13px] font-semibold text-warn">
        Ce navigateur ne donne pas acces au micro. Ouvre Trackz en https dans Safari, Chrome ou
        Firefox.
      </p>
    );
  return null;
}
