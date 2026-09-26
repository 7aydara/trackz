"use client";

import { useEffect, useRef } from "react";
import { audioNow, type PitchDetector } from "@/lib/audio";
import { IN_TUNE_CENTS, foldedCents, noteName } from "@/lib/voice";

export interface LaneTarget {
  midi: number;
  t0: number;
  t1: number;
  /** "listen" : le modele joue ; "sing" : a toi. */
  kind: "listen" | "sing";
}

/**
 * Portee defilante : le temps va de droite a gauche, la hauteur de bas en
 * haut. Les notes a chanter arrivent comme des blocs, la voix laisse une
 * trace — verte quand elle est dans le bloc. C'est la maniere la plus
 * directe de *voir* si on chante juste, sans savoir lire la musique.
 *
 * Dessinee au canvas et hors de React : 30 trames par seconde de
 * re-rendu ne passeraient pas sur un telephone.
 */
export function PitchLane({
  detector,
  targets = [],
  running,
  height = 220,
  pastSec = 4,
  aheadSec = 3,
  fixedRange,
}: {
  detector: PitchDetector;
  targets?: LaneTarget[];
  running: boolean;
  height?: number;
  pastSec?: number;
  aheadSec?: number;
  /** Plage MIDI [bas, haut]. Sans elle, la vue suit la voix. */
  fixedRange?: [number, number];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const traceRef = useRef<{ t: number; midi: number | null }[]>([]);
  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  const rangeRef = useRef(fixedRange);
  rangeRef.current = fixedRange;

  const { subscribe } = detector;

  // La trace se remplit meme quand le canvas n'est pas visible.
  useEffect(
    () =>
      subscribe((f) => {
        const trace = traceRef.current;
        trace.push({ t: f.t, midi: f.midi });
        const horizon = f.t - pastSec - 1;
        while (trace.length && trace[0].t < horizon) trace.shift();
      }),
    [subscribe, pastSec],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;

    const css = getComputedStyle(canvas);
    const color = (name: string, fallback: string) =>
      css.getPropertyValue(name).trim() || fallback;
    const C = {
      hairline: color("--color-hairline", "#2a2a2f"),
      raised: color("--color-raised", "#1d1d21"),
      ink: color("--color-ink", "#f5f5f7"),
      ink3: color("--color-ink-3", "#6b6b74"),
      good: color("--color-good", "#5aa86e"),
      module: color("--color-module", "#9a84c4"),
      accent: color("--color-accent", "#e5323f"),
    };

    let raf = 0;
    let center = 57;
    let width = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      width = canvas.clientWidth;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const now = audioNow();
      const tgts = targetsRef.current;
      const trace = traceRef.current;

      // --- plage verticale -------------------------------------------
      let lo: number;
      let hi: number;
      const fixed = rangeRef.current;
      if (fixed) {
        [lo, hi] = fixed;
      } else if (tgts.length) {
        lo = Math.min(...tgts.map((t) => t.midi)) - 4;
        hi = Math.max(...tgts.map((t) => t.midi)) + 4;
      } else {
        const last = [...trace].reverse().find((p) => p.midi !== null)?.midi;
        if (last != null) center += (last - center) * 0.08;
        lo = center - 7;
        hi = center + 7;
      }
      const span = hi - lo;
      const pxPerSemi = height / span;
      const y = (m: number) => height - (m - lo) * pxPerSemi;
      const playX = width * (pastSec / (pastSec + aheadSec));
      const pxPerSec = width / (pastSec + aheadSec);
      const x = (t: number) => playX + (t - now) * pxPerSec;

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, width, height);

      // --- grille : une ligne par demi-ton, les Do marques -----------
      g.font = `600 10px ${css.fontFamily}`;
      g.textBaseline = "middle";
      for (let m = Math.ceil(lo); m <= Math.floor(hi); m++) {
        const isDo = ((m % 12) + 12) % 12 === 0;
        g.strokeStyle = isDo ? C.ink3 : C.hairline;
        g.globalAlpha = isDo ? 0.6 : 0.5;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(0, Math.round(y(m)) + 0.5);
        g.lineTo(width, Math.round(y(m)) + 0.5);
        g.stroke();
        g.globalAlpha = 1;
        if (isDo || pxPerSemi > 16) {
          g.fillStyle = C.ink3;
          g.fillText(noteName(m), 4, y(m) - 6);
        }
      }

      // --- blocs a chanter -------------------------------------------
      const active = tgts.find((t) => t.kind === "sing" && now >= t.t0 && now < t.t1);
      for (const t of tgts) {
        const x0 = x(t.t0);
        const x1 = x(t.t1) - 2;
        if (x1 < 0 || x0 > width) continue;
        const h = pxPerSemi * 0.9;
        const isNow = now >= t.t0 && now < t.t1;
        g.fillStyle = t.kind === "sing" ? C.module : C.ink3;
        g.globalAlpha = t.kind === "sing" ? (isNow ? 0.75 : 0.4) : isNow ? 0.45 : 0.2;
        roundRect(g, x0, y(t.midi) - h / 2, x1 - x0, h, Math.min(6, h / 2));
        g.fill();
        g.globalAlpha = 1;
        if (x1 - x0 > 34) {
          g.fillStyle = C.ink;
          g.fillText(noteName(t.midi), x0 + 6, y(t.midi));
        }
      }

      // --- tete de lecture -------------------------------------------
      g.strokeStyle = C.ink3;
      g.globalAlpha = 0.5;
      g.beginPath();
      g.moveTo(playX + 0.5, 0);
      g.lineTo(playX + 0.5, height);
      g.stroke();
      g.globalAlpha = 1;

      // --- trace de la voix ------------------------------------------
      // Avec des blocs a l'ecran, la trace est ramenee a l'octave du bloc
      // le plus proche : on voit la justesse, pas le registre.
      // Un seul decalage d'octave pour toute la trace (vers le centre des
      // blocs) : replier note par note ferait sauter la courbe d'un bloc
      // a l'autre.
      const mid = tgts.length
        ? (Math.min(...tgts.map((t) => t.midi)) + Math.max(...tgts.map((t) => t.midi))) / 2
        : 0;
      const shown = (p: { t: number; midi: number }) => {
        if (!tgts.length) return { m: p.midi, ok: false };
        const m = p.midi - 12 * Math.round((p.midi - mid) / 12);
        const ref = tgts.find((t) => t.kind === "sing" && p.t >= t.t0 && p.t < t.t1);
        return { m, ok: !!ref && Math.abs(foldedCents(p.midi, ref.midi)) <= IN_TUNE_CENTS };
      };

      g.lineWidth = 3;
      g.lineCap = "round";
      g.lineJoin = "round";
      let prev: { t: number; midi: number } | null = null;
      for (const p of trace) {
        if (p.midi === null) {
          prev = null;
          continue;
        }
        const cur = { t: p.t, midi: p.midi };
        const a = prev && shown(prev);
        const b = shown(cur);
        if (prev && a && cur.t - prev.t < 0.2 && Math.abs(a.m - b.m) < 6) {
          g.strokeStyle = b.ok ? C.good : C.ink;
          g.beginPath();
          g.moveTo(x(prev.t), y(a.m));
          g.lineTo(x(cur.t), y(b.m));
          g.stroke();
        }
        prev = cur;
      }

      // Point vivant a la tete de lecture.
      const last = trace[trace.length - 1];
      if (last && last.midi !== null && now - last.t < 0.25) {
        const s = shown({ t: last.t, midi: last.midi });
        g.fillStyle = s.ok ? C.good : active ? C.accent : C.ink;
        g.beginPath();
        g.arc(playX, y(s.m), 6, 0, Math.PI * 2);
        g.fill();
      }
    };

    if (running) draw();
    else {
      // Une image fixe quand tout est a l'arret.
      draw();
      cancelAnimationFrame(raf);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [running, height, pastSec, aheadSec]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full rounded-[var(--radius-control)] bg-raised"
      style={{ height }}
      aria-label="Courbe de hauteur de ta voix"
      role="img"
    />
  );
}

function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
