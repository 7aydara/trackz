"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { StatTile } from "@/components/ui/StatTile";
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_META,
  daysLate,
  formatMoney,
  isOverdue,
  suggestInvoiceNumber,
} from "@/lib/business";
import { addDays, formatShort, startOfMonth, todayISO } from "@/lib/dates";
import { burstConfetti } from "@/lib/confetti";
import { createClient } from "@/lib/supabase/client";
import type { Client, Invoice, InvoiceStatus, Project } from "@/lib/types";

type Filter = "toutes" | "en_attente" | "en_retard" | "payee";

export function InvoicesClient({
  userId,
  invoices,
  clients,
  projects,
}: {
  userId: string;
  invoices: Invoice[];
  clients: Pick<Client, "id" | "name">[];
  projects: Pick<Project, "id" | "title" | "client_id" | "amount">[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const today = todayISO();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("toutes");
  const [form, setForm] = useState({
    number: "",
    client_id: "",
    project_id: "",
    amount: "",
    issued_on: today,
    due_on: addDays(today, 30),
    status: "envoyee" as InvoiceStatus,
    notes: "",
  });

  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const projectTitle = new Map(projects.map((p) => [p.id, p.title]));

  const visible = invoices.filter((i) => {
    if (filter === "toutes") return true;
    if (filter === "payee") return i.status === "payee";
    if (filter === "en_retard") return isOverdue(i, today);
    return i.status === "envoyee" || i.status === "brouillon";
  });

  const monthStart = startOfMonth(today);
  const paidThisMonth = invoices
    .filter((i) => i.status === "payee" && i.paid_on && i.paid_on >= monthStart)
    .reduce((s, i) => s + Number(i.amount), 0);
  const pendingTotal = invoices
    .filter((i) => i.status === "envoyee")
    .reduce((s, i) => s + Number(i.amount), 0);
  const overdueCount = invoices.filter((i) => isOverdue(i, today)).length;

  function startCreate() {
    setForm((f) => ({
      ...f,
      number: suggestInvoiceNumber(invoices.map((i) => i.number), today),
      issued_on: today,
      due_on: addDays(today, 30),
    }));
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.number.trim() || !form.amount) return;
    setBusy(true);

    await supabase.from("invoices").insert({
      user_id: userId,
      number: form.number.trim(),
      client_id: form.client_id || null,
      project_id: form.project_id || null,
      amount: Number(form.amount),
      issued_on: form.issued_on,
      due_on: form.due_on || null,
      status: form.status,
      paid_on: form.status === "payee" ? today : null,
      notes: form.notes.trim() || null,
    });

    setBusy(false);
    setOpen(false);
    setForm({ ...form, amount: "", notes: "", project_id: "", client_id: "" });
    router.refresh();
  }

  async function markPaid(invoice: Invoice, event: React.MouseEvent<HTMLButtonElement>) {
    burstConfetti(event.currentTarget, 22);
    await supabase
      .from("invoices")
      .update({ status: "payee", paid_on: today })
      .eq("id", invoice.id);
    router.refresh();
  }

  async function setStatus(invoice: Invoice, status: InvoiceStatus) {
    await supabase
      .from("invoices")
      .update({ status, paid_on: status === "payee" ? invoice.paid_on ?? today : null })
      .eq("id", invoice.id);
    router.refresh();
  }

  async function remove(invoice: Invoice) {
    if (!window.confirm(`Supprimer la facture ${invoice.number} ?`)) return;
    await supabase.from("invoices").delete().eq("id", invoice.id);
    router.refresh();
  }

  /** Pre-remplit le montant et le client quand on choisit un projet. */
  function pickProject(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    setForm((f) => ({
      ...f,
      project_id: projectId,
      client_id: project?.client_id ?? f.client_id,
      amount: project?.amount != null ? String(project.amount) : f.amount,
    }));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile emoji="💰" label="Encaisse" value={formatMoney(paidThisMonth)} hint="ce mois" />
        <StatTile emoji="⏳" label="En attente" value={formatMoney(pendingTotal)} />
        <StatTile emoji="🚨" label="En retard" value={overdueCount} />
      </div>

      <Card>
        <CardTitle emoji="🧾" action={<Button size="sm" onClick={startCreate}>+ Facture</Button>}>
          Mes factures
        </CardTitle>

        <div className="mb-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {(
            [
              ["toutes", "Toutes"],
              ["en_attente", "⏳ En attente"],
              ["en_retard", "🚨 En retard"],
              ["payee", "✅ Payees"],
            ] as const
          ).map(([key, label]) => (
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
              {label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState emoji="🧾" title="Aucune facture ici">
            Cree une facture depuis un projet : montant et client sont pre-remplis.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {visible.map((i) => {
              const late = isOverdue(i, today);
              const meta = INVOICE_STATUS_META[i.status];
              return (
                <li
                  key={i.id}
                  className={`rounded-2xl border px-3 py-2.5 ${
                    late
                      ? "border-rose-200 bg-rose-50/60"
                      : i.status === "payee"
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-hair bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-lg shadow-sm">
                      {late ? "🚨" : meta.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-black">{i.number}</span>
                        <span className="shrink-0 font-black tabular-nums">
                          {formatMoney(Number(i.amount), i.currency)}
                        </span>
                      </p>
                      <p className="truncate text-[11px] font-semibold text-muted">
                        {i.client_id ? clientName.get(i.client_id) ?? "—" : "—"}
                        {i.project_id ? ` · ${projectTitle.get(i.project_id) ?? "—"}` : ""}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Chip tone={i.status === "payee" ? "green" : late ? "red" : "neutral"}>
                          {meta.emoji} {late ? `${daysLate(i, today)} j de retard` : meta.label}
                        </Chip>
                        {i.due_on && <Chip>echeance {formatShort(i.due_on)}</Chip>}
                        {i.paid_on && <Chip tone="green">payee le {formatShort(i.paid_on)}</Chip>}
                      </div>
                      {i.notes && (
                        <p className="mt-1.5 text-xs font-semibold text-muted">{i.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {i.status !== "payee" ? (
                      <Button size="sm" onClick={(e) => markPaid(i, e)}>
                        💰 Marquer payee
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setStatus(i, "envoyee")}>
                        Annuler le paiement
                      </Button>
                    )}
                    {i.status === "brouillon" && (
                      <Button variant="soft" size="sm" onClick={() => setStatus(i, "envoyee")}>
                        📤 Envoyer
                      </Button>
                    )}
                    <span className="flex-1" />
                    <Button variant="danger" size="sm" onClick={() => remove(i)}>
                      ✕
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle facture" emoji="🧾">
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Numero">
              <Input
                required
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
              />
            </Field>
            <Field label="Montant (€)">
              <Input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="1200"
              />
            </Field>
          </div>

          <Field label="Projet">
            <Select value={form.project_id} onChange={(e) => pickProject(e.target.value)}>
              <option value="">— Sans projet —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
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
            <Field label="Date d'emission">
              <Input
                type="date"
                value={form.issued_on}
                onChange={(e) => setForm({ ...form, issued_on: e.target.value })}
              />
            </Field>
            <Field label="Echeance">
              <Input
                type="date"
                value={form.due_on}
                onChange={(e) => setForm({ ...form, due_on: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Statut">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as InvoiceStatus })}
            >
              {INVOICE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {INVOICE_STATUS_META[s].emoji} {INVOICE_STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Acompte, mode de paiement, mention TVA..."
            />
          </Field>

          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? "..." : "Creer la facture"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
