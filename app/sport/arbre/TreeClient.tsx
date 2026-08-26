"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { burstConfetti } from "@/lib/confetti";
import {
  TAOLU_LEVELS,
  TAOLU_LEVEL_META,
  TAOLU_STATUSES,
  TAOLU_STATUS_META,
} from "@/lib/kungfu";
import { createClient } from "@/lib/supabase/client";
import type { TaoluLevel, TaoluProgress, TaoluStatus } from "@/lib/types";

export function TreeClient({ userId, items }: { userId: string; items: TaoluProgress[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "taolu" as TaoluProgress["category"],
    level: "debutant" as TaoluLevel,
  });

  const score =
    items.length === 0
      ? 0
      : items.reduce((sum, i) => sum + TAOLU_STATUS_META[i.status].weight, 0) / items.length;
  const mastered = items.filter((i) => i.status === "maitrise").length;

  async function seed() {
    setBusy(true);
    await supabase.rpc("seed_kungfu_tree");
    setBusy(false);
    router.refresh();
  }

  async function cycleStatus(item: TaoluProgress, event: React.MouseEvent<HTMLButtonElement>) {
    const order: TaoluStatus[] = ["a_apprendre", "en_cours", "maitrise"];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    if (next === "maitrise") burstConfetti(event.currentTarget, 20);
    await supabase.from("taolu_progress").update({ status: next }).eq("id", item.id);
    router.refresh();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    await supabase.from("taolu_progress").insert({
      user_id: userId,
      item_key: `custom_${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      level: form.level,
      sort_order: 900,
    });
    setBusy(false);
    setOpen(false);
    setForm({ name: "", category: "taolu", level: "debutant" });
    router.refresh();
  }

  async function remove(item: TaoluProgress) {
    if (!window.confirm(`Retirer « ${item.name} » de l'arbre ?`)) return;
    await supabase.from("taolu_progress").delete().eq("id", item.id);
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState emoji="🌳" title="Ton arbre de progression est vide">
          Charge l'arbre Shaolin par defaut : 20 stances, techniques et taolu repartis en trois
          niveaux, du blanc au rouge.
        </EmptyState>
        <Button size="lg" className="mt-3 w-full" onClick={seed} disabled={busy}>
          {busy ? "..." : "🌱 Initialiser l'arbre Shaolin"}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-4 bg-card">
        <ProgressRing value={score}>
          <div>
            <div className="text-2xl font-black leading-none tabular-nums">
              {Math.round(score * 100)}%
            </div>
            <div className="text-[10px] font-bold uppercase text-muted">maitrise</div>
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black tracking-tight">Arbre de progression</p>
          <p className="mt-0.5 text-sm font-bold text-muted">
            {mastered} technique{mastered > 1 ? "s" : ""} maitrisee{mastered > 1 ? "s" : ""} sur{" "}
            {items.length}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button size="sm" onClick={() => setOpen(true)}>
              + Ajouter
            </Button>
            <Button size="sm" variant="ghost" onClick={seed} disabled={busy}>
              Recharger les defauts
            </Button>
          </div>
        </div>
      </Card>

      {TAOLU_LEVELS.map((level) => {
        const levelItems = items.filter((i) => i.level === level);
        if (levelItems.length === 0) return null;

        const meta = TAOLU_LEVEL_META[level];
        const levelScore =
          levelItems.reduce((s, i) => s + TAOLU_STATUS_META[i.status].weight, 0) /
          levelItems.length;
        const unlocked =
          level === "debutant" ||
          (level === "intermediaire"
            ? items.filter((i) => i.level === "debutant" && i.status === "maitrise").length >= 3
            : items.filter((i) => i.level === "intermediaire" && i.status === "maitrise").length >= 3);

        return (
          <Card key={level} className={unlocked ? "" : "opacity-70"}>
            <CardTitle emoji={meta.emoji}>
              {meta.belt} · {meta.label}
            </CardTitle>

            <p className="-mt-1 mb-2 text-xs font-semibold text-muted">{meta.hint}</p>

            {!unlocked && (
              <p className="mb-2 rounded-xl bg-sunk px-3 py-2 text-xs font-bold text-muted">
                🔒 Debloque en maitrisant au moins 3 elements du niveau precedent.
              </p>
            )}

            <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-sunk">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${Math.round(levelScore * 100)}%` }}
              />
            </div>

            <ul className="space-y-2">
              {levelItems.map((item) => {
                const status = TAOLU_STATUS_META[item.status];
                return (
                  <li
                    key={item.id}
                    className={`flex items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 transition ${
                      item.status === "maitrise"
                        ? "border-transparent bg-accent-soft"
                        : "border-hair bg-card"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => cycleStatus(item, e)}
                      aria-label={`Changer le statut de ${item.name}`}
                      className={`grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] border-2 text-xl transition ${
                        item.status === "maitrise"
                          ? "animate-pop border-transparent bg-accent text-on-accent"
                          : item.status === "en_cours"
                            ? "border-accent bg-card"
                            : "border-dashed border-hair bg-card"
                      }`}
                    >
                      {status.emoji}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{item.name}</p>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        {item.category} · {status.label}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(item)}
                      aria-label={`Retirer ${item.name}`}
                      className="px-1 text-xs font-bold text-muted/50 transition hover:text-danger"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}

      <Card>
        <CardTitle emoji="ℹ️">Comment ca marche</CardTitle>
        <p className="text-sm font-semibold text-muted">
          Touche la pastille pour faire tourner le statut :{" "}
          {TAOLU_STATUSES.map((s) => `${TAOLU_STATUS_META[s].emoji} ${TAOLU_STATUS_META[s].label}`).join(
            " → ",
          )}
          . Chaque niveau se debloque quand tu maitrises au moins 3 elements du precedent.
        </p>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Ajouter a l'arbre" emoji="🌳">
        <form onSubmit={addItem} className="space-y-3">
          <Field label="Nom">
            <Input
              autoFocus
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Tan Tui — routine 11"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categorie">
              <Select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as TaoluProgress["category"] })
                }
              >
                <option value="taolu">Taolu</option>
                <option value="technique">Technique</option>
                <option value="stance">Stance</option>
              </Select>
            </Field>
            <Field label="Niveau">
              <Select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value as TaoluLevel })}
              >
                {TAOLU_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {TAOLU_LEVEL_META[l].emoji} {TAOLU_LEVEL_META[l].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? "..." : "Ajouter"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
