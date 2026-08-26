"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { StatTile } from "@/components/ui/StatTile";
import { formatShort } from "@/lib/dates";
import {
  DEFAULT_DOCUMENTS,
  URGENCY_STYLES,
  schoolInsight,
  sortByDeadline,
} from "@/lib/schools";
import { createClient } from "@/lib/supabase/client";
import type { SchoolWithDocs } from "@/lib/types";
import { SchoolCard } from "./SchoolCard";

export function EcolesClient({
  userId,
  today,
  schools,
}: {
  userId: string;
  today: string;
  schools: SchoolWithDocs[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    program: "",
    city: "",
    url: "",
    deadline: "",
    priority: "2",
    notes: "",
  });

  const sorted = useMemo(() => sortByDeadline(schools), [schools]);
  const insights = useMemo(
    () => new Map(sorted.map((s) => [s.id, schoolInsight(s, today)])),
    [sorted, today],
  );

  const active = sorted.filter((s) => s.status !== "accepte" && s.status !== "refuse");
  const alerts = active.filter((s) => {
    const u = insights.get(s.id)!.urgency;
    return u === "urgent" || u === "late";
  });
  const nextDeadline = active.find((s) => s.deadline && s.deadline >= today);
  const missingDocs = active.reduce((n, s) => {
    const i = insights.get(s.id)!;
    return n + (i.docsTotal - i.docsDone);
  }, 0);
  const accepted = schools.filter((s) => s.status === "accepte").length;

  async function createSchool(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);

    const { data, error } = await supabase
      .from("schools")
      .insert({
        user_id: userId,
        name: form.name.trim(),
        program: form.program.trim() || null,
        city: form.city.trim() || null,
        url: form.url.trim() || null,
        deadline: form.deadline || null,
        priority: Number(form.priority),
        notes: form.notes.trim() || null,
      })
      .select("id")
      .single();

    if (!error && data) {
      // Checklist de depart : modifiable ensuite dossier par dossier.
      await supabase.from("school_documents").insert(
        DEFAULT_DOCUMENTS.map((label, i) => ({
          user_id: userId,
          school_id: data.id,
          label,
          sort_order: i,
        })),
      );
    }

    setBusy(false);
    setOpen(false);
    setForm({ name: "", program: "", city: "", url: "", deadline: "", priority: "2", notes: "" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <div className="animate-rise rounded-[var(--radius-card)] border border-danger/30 bg-danger-soft px-4 py-3">
          <p className="flex items-center gap-2 font-black text-danger-ink">
            <span aria-hidden className="text-xl">
              🚨
            </span>
            {alerts.length} dossier{alerts.length > 1 ? "s" : ""} en zone rouge
          </p>
          <ul className="mt-1 space-y-0.5 text-sm font-bold text-danger-ink">
            {alerts.map((s) => (
              <li key={s.id}>
                {s.name} — {insights.get(s.id)!.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile emoji="📁" label="Dossiers actifs" value={active.length} />
        <StatTile
          emoji="⏳"
          label="Prochaine deadline"
          value={nextDeadline?.deadline ? formatShort(nextDeadline.deadline) : "—"}
          hint={nextDeadline ? nextDeadline.name : "rien de prevu"}
        />
        <StatTile emoji="📄" label="Docs manquants" value={missingDocs} />
        <StatTile emoji="🎉" label="Acceptations" value={accepted} />
      </div>

      <Card>
        <CardTitle
          emoji="🎓"
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              + Ecole
            </Button>
          }
        >
          Mes candidatures
        </CardTitle>

        {sorted.length === 0 ? (
          <EmptyState emoji="🏫" title="Aucune ecole pour l'instant">
            Ajoute une ecole : la checklist de documents standard est creee automatiquement.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {sorted.map((school) => (
              <SchoolCard
                key={school.id}
                userId={userId}
                today={today}
                school={school}
                insight={insights.get(school.id)!}
              />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle emoji="🗺️">Legende</CardTitle>
        <ul className="flex flex-wrap gap-2 text-xs font-bold">
          {(
            [
              ["late", "Deadline depassee"],
              ["urgent", "Moins de 7 j, checklist incomplete"],
              ["soon", "Moins de 21 j, checklist incomplete"],
              ["calm", "Sous controle"],
              ["done", "Reponse recue"],
            ] as const
          ).map(([key, label]) => (
            <li
              key={key}
              className={`rounded-full px-3 py-1.5 ${URGENCY_STYLES[key].chip}`}
            >
              {URGENCY_STYLES[key].emoji} {label}
            </li>
          ))}
        </ul>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle ecole" emoji="🎓">
        <form onSubmit={createSchool} className="space-y-3">
          <Field label="Nom de l'ecole">
            <Input
              autoFocus
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Epitech"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Programme">
              <Input
                value={form.program}
                onChange={(e) => setForm({ ...form, program: e.target.value })}
                placeholder="MSc Pro"
              />
            </Field>
            <Field label="Ville">
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Paris"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Deadline">
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </Field>
            <Field label="Priorite">
              <Select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="1">⭐ Reve</option>
                <option value="2">🎯 Cible</option>
                <option value="3">🛟 Securite</option>
              </Select>
            </Field>
          </div>
          <Field label="Lien du dossier">
            <Input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
            />
          </Field>
          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Frais de dossier, contacts, oral..."
            />
          </Field>
          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? "..." : "Ajouter l'ecole"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
