"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PROJECT_STATUSES, PROJECT_STATUS_META, formatMoney } from "@/lib/business";
import { formatShort, relativeDays, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import type { Client, Project, ProjectStatus } from "@/lib/types";

const EMPTY = {
  title: "",
  client_id: "",
  description: "",
  deadline: "",
  amount: "",
  status: "en_attente" as ProjectStatus,
};

export function ProjectsClient({
  userId,
  projects,
  clients,
}: {
  userId: string;
  projects: Project[];
  clients: Pick<Client, "id" | "name">[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const today = todayISO();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [filter, setFilter] = useState<ProjectStatus | "tous">("tous");

  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const visible = filter === "tous" ? projects : projects.filter((p) => p.status === filter);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function startEdit(p: Project) {
    setEditing(p);
    setForm({
      title: p.title,
      client_id: p.client_id ?? "",
      description: p.description ?? "",
      deadline: p.deadline ?? "",
      amount: p.amount != null ? String(p.amount) : "",
      status: p.status,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);

    const payload = {
      title: form.title.trim(),
      client_id: form.client_id || null,
      description: form.description.trim() || null,
      deadline: form.deadline || null,
      amount: form.amount ? Number(form.amount) : null,
      status: form.status,
    };

    if (editing) {
      await supabase.from("projects").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("projects").insert({ user_id: userId, ...payload });
    }

    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  async function setStatus(project: Project, status: ProjectStatus) {
    await supabase.from("projects").update({ status }).eq("id", project.id);
    router.refresh();
  }

  async function remove(project: Project) {
    if (!window.confirm(`Supprimer le projet ${project.title} ?`)) return;
    await supabase.from("projects").delete().eq("id", project.id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle emoji="🚧" action={<Button size="sm" onClick={startCreate}>+ Projet</Button>}>
          Mes projets
        </CardTitle>

        <div className="mb-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {(["tous", ...PROJECT_STATUSES] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                filter === key
                  ? "border-transparent bg-accent text-white"
                  : "border-hair bg-white text-muted"
              }`}
            >
              {key === "tous"
                ? `Tous (${projects.length})`
                : `${PROJECT_STATUS_META[key].emoji} ${PROJECT_STATUS_META[key].label} (${
                    projects.filter((p) => p.status === key).length
                  })`}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState emoji="📁" title="Aucun projet ici">
            {clients.length === 0 ? (
              <>
                Commence par ajouter un{" "}
                <Link href="/business/clients" className="font-bold underline">
                  client
                </Link>
                .
              </>
            ) : (
              "Change de filtre ou cree un nouveau projet."
            )}
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {visible.map((p) => {
              const meta = PROJECT_STATUS_META[p.status];
              const late =
                !!p.deadline && p.deadline < today && p.status !== "paye" && p.status !== "livre";
              return (
                <li
                  key={p.id}
                  className={`rounded-2xl border px-3 py-2.5 ${
                    late ? "border-rose-200 bg-rose-50/60" : "border-hair bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-lg">
                      {meta.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black">{p.title}</p>
                      <p className="truncate text-[11px] font-semibold text-muted">
                        {p.client_id ? clientName.get(p.client_id) ?? "Client supprime" : "Sans client"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Chip tone={meta.tone}>{meta.label}</Chip>
                        {p.deadline && (
                          <Chip tone={late ? "red" : "neutral"}>
                            {late ? "🚨 " : "📅 "}
                            {formatShort(p.deadline)} · {relativeDays(p.deadline)}
                          </Chip>
                        )}
                        {p.amount != null && <Chip tone="green">{formatMoney(Number(p.amount))}</Chip>}
                      </div>
                      {p.description && (
                        <p className="mt-1.5 whitespace-pre-line text-xs font-semibold text-muted">
                          {p.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {PROJECT_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(p, s)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                          p.status === s
                            ? "border-transparent bg-accent text-white"
                            : "border-hair bg-white text-muted hover:border-accent"
                        }`}
                      >
                        {PROJECT_STATUS_META[s].emoji}
                      </button>
                    ))}
                    <span className="flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>
                      Modifier
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => remove(p)}>
                      ✕
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier le projet" : "Nouveau projet"}
        emoji="🚧"
      >
        <form onSubmit={save} className="space-y-3">
          <Field label="Titre">
            <Input
              autoFocus
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Refonte du site vitrine"
            />
          </Field>
          <Field label="Client">
            <Select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            >
              <option value="">— Sans client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Deadline">
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </Field>
            <Field label="Montant (€)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="1200"
              />
            </Field>
          </div>
          <Field label="Statut">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_META[s].emoji} {PROJECT_STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Perimetre, livrables, points d'attention..."
            />
          </Field>
          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? "..." : editing ? "Enregistrer" : "Creer le projet"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
