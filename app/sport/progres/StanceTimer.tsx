"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { burstConfetti } from "@/lib/confetti";
import { STANCE_BY_KEY, formatSeconds } from "@/lib/kungfu";
import { createClient } from "@/lib/supabase/client";

/**
 * Chrono de tenue de stance : on lance, on tient, on enregistre.
 * Le log est rattache a la date du jour, sans seance obligatoire.
 */
export function StanceTimer({
  userId,
  today,
  stanceKey,
}: {
  userId: string;
  today: string;
  stanceKey: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveRef = useRef<HTMLButtonElement>(null);

  const stance = STANCE_BY_KEY[stanceKey];
  const goalRatio = stance ? Math.min(1, seconds / stance.goal) : 0;

  useEffect(() => {
    setSeconds(0);
    setRunning(false);
    setSaved(false);
  }, [stanceKey]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  async function save() {
    if (seconds <= 0) return;
    setRunning(false);
    burstConfetti(saveRef.current, 20);
    await supabase.from("stance_logs").insert({
      user_id: userId,
      stance_key: stanceKey,
      log_date: today,
      hold_seconds: seconds,
    });
    setSaved(true);
    setSeconds(0);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-hair bg-white p-3 text-center">
      <p className="text-xs font-black uppercase tracking-wide text-muted">
        Chrono — {stance?.pinyin ?? stanceKey}
      </p>
      <p className="mt-1 text-4xl font-black tabular-nums">{formatSeconds(seconds)}</p>

      <div className="mx-auto mt-2 h-2 max-w-xs overflow-hidden rounded-full bg-canvas">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${Math.round(goalRatio * 100)}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] font-bold text-muted">
        objectif {formatSeconds(stance?.goal ?? 60)} · {Math.round(goalRatio * 100)}%
      </p>

      <div className="mt-3 flex justify-center gap-2">
        <Button variant={running ? "ghost" : "primary"} onClick={() => setRunning((r) => !r)}>
          {running ? "⏸ Pause" : seconds > 0 ? "▶ Reprendre" : "▶ Demarrer"}
        </Button>
        <Button ref={saveRef} variant="soft" onClick={save} disabled={seconds === 0}>
          💾 Enregistrer
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setRunning(false);
            setSeconds(0);
          }}
          disabled={seconds === 0}
        >
          ↺
        </Button>
      </div>

      {saved && (
        <p className="mt-2 text-xs font-bold text-emerald-600">Tenue enregistree 🎉</p>
      )}
    </div>
  );
}
