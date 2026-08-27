"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { formatMoney } from "@/lib/business";
import { createClient } from "@/lib/supabase/client";
import type { Client, Invoice, Project } from "@/lib/types";

type ProjectLite = Pick<Project, "id" | "client_id" | "status" | "title">;
type InvoiceLite = Pick<Invoice, "id" | "client_id" | "amount" | "status">;

const EMPTY = { name: "", company: "", email: "", phone: "", notes: "" };

export function ClientsClient({
  userId,
  clients,
  projects,
  invoices,
}: {
  userId: string;
  clients: Client[];
  projects: ProjectLite[];
  invoices: InvoiceLite[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function startEdit(client: Client) {
    setEditing(client);
    setForm({
      name: client.name,
      company: client.company ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      notes: client.notes ?? "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);

    const payload = {
      name: form.name.trim(),
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (editing) {
      await supabase.from("clients").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("clients").insert({ user_id: userId, ...payload });
    }

    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  async function toggleStatus(client: Client) {
    await supabase
      .from("clients")
      .update({ status: client.status === "actif" ? "inactif" : "actif" })
      .eq("id", client.id);
    router.refresh();
  }

  async function remove(client: Client) {
    if (!window.confirm(`Supprimer ${client.name} ? Ses projets et factures seront conserves sans client.`)) {
      return;
    }
    await supabase.from("clients").delete().eq("id", client.id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle action={<Button size="sm" onClick={startCreate}>+ Client</Button>}>
          Mes clients
        </CardTitle>

        {clients.length === 0 ? (
          <EmptyState emoji="👤" title="Aucun client">
            Ajoute ton premier client, tu pourras ensuite lui rattacher projets et factures.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {clients.map((c) => {
              const clientProjects = projects.filter((p) => p.client_id === c.id);
              const active = clientProjects.filter((p) => p.status === "en_cours").length;
              const earned = invoices
                .filter((i) => i.client_id === c.id && i.status === "payee")
                .reduce((sum, i) => sum + Number(i.amount), 0);

              return (
                <li
                  key={c.id}
                  className={`rounded-[var(--radius-control)] border px-3 py-2.5 ${
                    c.status === "actif" ? "border-hairline bg-surface" : "border-hairline bg-raised opacity-70"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-module/15 text-base font-extrabold text-accent"
                    >
                      {c.name.slice(0, 2).toUpperCase()}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">{c.name}</p>
                      <p className="truncate text-[11px] font-semibold text-ink-2">
                        {[c.company, c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Chip>{clientProjects.length} projet(s)</Chip>
                        {active > 0 && <Chip tone="accent">{active} en cours</Chip>}
                        {earned > 0 && <Chip tone="good">{formatMoney(earned)} encaisse</Chip>}
                        <Chip tone={c.status === "actif" ? "accent" : "neutral"}>{c.status}</Chip>
                      </div>
                      {c.notes && (
                        <p className="mt-1.5 whitespace-pre-line text-xs font-semibold text-ink-2">
                          {c.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(c)}>
                      Modifier
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleStatus(c)}>
                      {c.status === "actif" ? "Archiver" : "Reactiver"}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => remove(c)}>
                      Supprimer
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
        title={editing ? "Modifier le client" : "Nouveau client"}
        emoji="🤝"
      >
        <form onSubmit={save} className="space-y-3">
          <Field label="Nom">
            <Input
              autoFocus
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Marie Dupont"
            />
          </Field>
          <Field label="Entreprise">
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Studio X"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Telephone">
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Contexte, tarif horaire, historique..."
            />
          </Field>
          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? "..." : editing ? "Enregistrer" : "Ajouter le client"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
