"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmojiPicker } from "@/components/EmojiPicker";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import type { Frequency, Habit } from "@/lib/types";

/** Habitudes libres ("boire de l'eau", "lecture"...) qui s'ajoutent aux 4 domaines. */
export function HabitsManager({ userId, habits }: { userId: string; habits: Habit[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [target, setTarget] = useState(7);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);

    await supabase.from("habits").insert({
      user_id: userId,
      name: name.trim(),
      emoji,
      frequency,
      target_per_week: frequency === "daily" ? 7 : target,
      sort_order: habits.length,
    });

    setBusy(false);
    setOpen(false);
    setName("");
    setEmoji("✨");
    setFrequency("daily");
    setTarget(7);
    router.refresh();
  }

  async function archive(habit: Habit) {
    await supabase.from("habits").update({ archived: true }).eq("id", habit.id);
    router.refresh();
  }

  return (
    <Card>
      <CardTitle
        emoji="✨"
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            + Habitude
          </Button>
        }
      >
        Mes habitudes perso
      </CardTitle>

      {habits.length === 0 ? (
        <EmptyState emoji="🌱" title="Aucune habitude custom">
          Ajoute ce qui compte en plus des 4 domaines : boire de l'eau, lecture, meditation…
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {habits.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-3 rounded-2xl border border-hair bg-white px-3 py-2"
            >
              <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-accent-soft text-lg">
                {h.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{h.name}</p>
                <p className="text-[11px] font-semibold text-muted">
                  {h.frequency === "daily" ? "tous les jours" : `${h.target_per_week}x / semaine`}
                </p>
              </div>
              <Chip>{h.frequency === "daily" ? "quotidien" : "hebdo"}</Chip>
              <button
                type="button"
                onClick={() => archive(h)}
                aria-label={`Archiver ${h.name}`}
                className="rounded-full px-2 py-1 text-sm font-bold text-muted transition hover:text-rose-600"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle habitude" emoji="✨">
        <form onSubmit={create} className="space-y-4">
          <Field label="Nom">
            <Input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Boire 2 L d'eau"
            />
          </Field>

          <Field label="Emoji">
            <EmojiPicker value={emoji} onChange={setEmoji} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Rythme">
              <Select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
              >
                <option value="daily">Tous les jours</option>
                <option value="weekly">X fois par semaine</option>
              </Select>
            </Field>

            {frequency === "weekly" && (
              <Field label="Objectif / semaine">
                <Select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      {n}x
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? "..." : "Ajouter"}
          </Button>
        </form>
      </Modal>
    </Card>
  );
}
