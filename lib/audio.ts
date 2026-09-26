"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { detectPitch, freqToMidi, midiToFreq } from "@/lib/voice";

/* ------------------------------------------------------------------ */
/* Contexte audio partage                                              */
/* ------------------------------------------------------------------ */

let sharedContext: AudioContext | null = null;

/**
 * Un seul AudioContext pour toute l'app : le synthe et le micro partagent
 * la meme horloge, ce qui permet de comparer ce qu'on joue et ce qu'on
 * entend sans conversion. Il doit etre cree (ou relance) pendant un geste
 * de l'utilisateur, sinon iOS le laisse muet.
 */
export function getAudioContext(): AudioContext {
  if (!sharedContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedContext = new Ctor();
  }
  if (sharedContext.state === "suspended") void sharedContext.resume();
  return sharedContext;
}

/** Horloge audio, sans creer le contexte s'il n'existe pas encore. */
export function audioNow(): number {
  return sharedContext?.currentTime ?? 0;
}

/* ------------------------------------------------------------------ */
/* Synthe                                                              */
/* ------------------------------------------------------------------ */

export interface ScheduledNote {
  midi: number;
  /** Instant de depart, sur l'horloge du contexte audio. */
  at: number;
  dur: number;
}

/**
 * Un son doux entre la flute et l'orgue : un triangle pour le corps, une
 * sinusoide a l'octave pour la clarte, un filtre pour arrondir. Assez pur
 * pour qu'on y entende la hauteur sans ambiguite.
 */
export function playNotes(notes: ScheduledNote[], volume = 0.22): () => void {
  const ctx = getAudioContext();
  const master = ctx.createGain();
  master.gain.value = volume;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2400;
  master.connect(filter).connect(ctx.destination);

  const sources: OscillatorNode[] = [];
  for (const n of notes) {
    const freq = midiToFreq(n.midi);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, n.at);
    env.gain.linearRampToValueAtTime(1, n.at + 0.03);
    env.gain.setTargetAtTime(0.7, n.at + 0.03, 0.15);
    env.gain.setTargetAtTime(0, n.at + n.dur - 0.06, 0.03);
    env.connect(master);

    for (const [type, mult, gain] of [
      ["triangle", 1, 1],
      ["sine", 2, 0.25],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(env);
      osc.start(n.at);
      osc.stop(n.at + n.dur + 0.2);
      sources.push(osc);
    }
  }

  return () => {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(0, now, 0.02);
    for (const s of sources) {
      try {
        s.stop(now + 0.1);
      } catch {
        // deja arretee
      }
    }
  };
}

/** Joue une note isolee tout de suite. */
export function playNote(midi: number, dur = 1.2) {
  const ctx = getAudioContext();
  return playNotes([{ midi, at: ctx.currentTime + 0.02, dur }]);
}

/* ------------------------------------------------------------------ */
/* Micro + detection                                                   */
/* ------------------------------------------------------------------ */

export interface PitchFrame {
  /** Horloge du contexte audio, en secondes. */
  t: number;
  /** Hauteur lissee en numero MIDI continu, null si rien de chante. */
  midi: number | null;
  freq: number | null;
  /** Niveau d'entree 0 → 1, pour le vu-metre. */
  level: number;
}

export type MicState = "idle" | "starting" | "on" | "denied" | "unsupported";

/**
 * Ecoute le micro et publie une estimation de hauteur ~30 fois par seconde.
 *
 * Les abonnes (`subscribe`) recoivent chaque trame : c'est la voie rapide,
 * pour le canvas et la notation. `frame` n'est qu'un echantillon pour
 * l'affichage React, qu'on ne rafraichit pas a chaque trame pour ne pas
 * re-rendre toute la page 30 fois par seconde.
 */
export function usePitchDetector() {
  const [state, setState] = useState<MicState>("idle");
  const [frame, setFrame] = useState<PitchFrame | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const listeners = useRef(new Set<(f: PitchFrame) => void>());

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setFrame(null);
    setState((s) => (s === "on" || s === "starting" ? "idle" : s));
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return false;
    }
    setState("starting");
    const ctx = getAudioContext();

    let stream: MediaStream;
    try {
      // Tout traitement coupe : l'annulation d'echo et le controle de gain
      // automatique deforment justement ce qu'on veut mesurer.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      setState("denied");
      return false;
    }
    streamRef.current = stream;

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);

    const history: number[] = [];
    let silentFrames = 0;
    let tick = 0;
    let lastUi = 0;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      // Une trame sur deux suffit (~30 Hz) et divise le calcul par deux.
      if (tick++ % 2) return;

      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const level = Math.min(1, Math.sqrt(sum / buf.length) * 6);

      const est = detectPitch(buf, ctx.sampleRate);
      let midi: number | null = null;
      if (est) {
        silentFrames = 0;
        history.push(freqToMidi(est.freq));
        if (history.length > 5) history.shift();
        // Mediane glissante : absorbe les sauts d'octave isoles sans
        // retarder les vrais changements de note.
        midi = [...history].sort((a, b) => a - b)[Math.floor(history.length / 2)];
      } else if (++silentFrames > 3) {
        history.length = 0;
      } else if (history.length) {
        midi = history[history.length - 1];
      }

      const f: PitchFrame = {
        t: ctx.currentTime,
        midi,
        freq: midi === null ? null : midiToFreq(midi),
        level,
      };
      listeners.current.forEach((fn) => fn(f));

      const now = performance.now();
      if (now - lastUi > 80) {
        lastUi = now;
        setFrame(f);
      }
    };

    setState("on");
    loop();
    return true;
  }, []);

  const subscribe = useCallback((fn: (f: PitchFrame) => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  useEffect(() => stop, [stop]);

  return { state, frame, start, stop, subscribe };
}

export type PitchDetector = ReturnType<typeof usePitchDetector>;
