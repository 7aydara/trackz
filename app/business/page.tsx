import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { formatShort, relativeDays, startOfMonth } from "@/lib/dates";
import {
  PROJECT_STATUS_META,
  daysLate,
  formatMoney,
  isOverdue,
} from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import type { Client, Invoice, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BusinessOverviewPage() {
  const supabase = await createClient();
  const today = await getToday();
  const monthStart = startOfMonth(today);

  const [invoicesRes, projectsRes, clientsRes] = await Promise.all([
    supabase.from("invoices").select("*").order("due_on", { nullsFirst: false }),
    supabase.from("projects").select("*").order("deadline", { nullsFirst: false }),
    supabase.from("clients").select("id, name").eq("status", "actif"),
  ]);

  const invoices = (invoicesRes.data ?? []) as Invoice[];
  const projects = (projectsRes.data ?? []) as Project[];
  const clients = (clientsRes.data ?? []) as Pick<Client, "id" | "name">[];
  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  const paidThisMonth = invoices
    .filter((i) => i.status === "payee" && i.paid_on && i.paid_on >= monthStart)
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const pending = invoices.filter((i) => i.status === "envoyee");
  const pendingTotal = pending.reduce((sum, i) => sum + Number(i.amount), 0);
  const overdue = pending.filter((i) => isOverdue(i, today));
  const overdueTotal = overdue.reduce((sum, i) => sum + Number(i.amount), 0);

  const ongoing = projects.filter((p) => p.status === "en_cours");
  const upcoming = projects
    .filter((p) => p.status !== "paye" && p.deadline)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <div className="animate-rise rounded-[var(--radius-card)] border border-danger/30 bg-danger-soft px-4 py-3">
          <p className="flex items-center gap-2 font-black text-danger-ink">
            <span aria-hidden className="text-xl">
              💸
            </span>
            {overdue.length} facture{overdue.length > 1 ? "s" : ""} en retard —{" "}
            {formatMoney(overdueTotal)}
          </p>
          <ul className="mt-1 space-y-0.5 text-sm font-bold text-danger-ink">
            {overdue.map((i) => (
              <li key={i.id}>
                {i.number} · {formatMoney(Number(i.amount), i.currency)} ·{" "}
                {daysLate(i, today)} j de retard
                {i.client_id ? ` · ${clientName.get(i.client_id) ?? ""}` : ""}
              </li>
            ))}
          </ul>
          <Link
            href="/business/factures"
            className="mt-2 inline-flex rounded-full bg-danger px-3 py-1.5 text-xs font-bold text-on-danger"
          >
            Relancer →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          emoji="💰"
          label="Encaisse ce mois"
          value={formatMoney(paidThisMonth)}
          hint="factures payees"
        />
        <StatTile
          emoji="⏳"
          label="En attente"
          value={formatMoney(pendingTotal)}
          hint={`${pending.length} facture(s)`}
        />
        <StatTile emoji="🚧" label="Projets en cours" value={ongoing.length} />
        <StatTile emoji="🤝" label="Clients actifs" value={clients.length} />
      </div>

      <Card>
        <CardTitle
          emoji="🚧"
          action={
            <Link href="/business/projets" className="text-xs font-bold text-accent-ink underline">
              tout voir
            </Link>
          }
        >
          Projets a suivre
        </CardTitle>

        {upcoming.length === 0 ? (
          <EmptyState emoji="📁" title="Aucun projet avec deadline">
            Ajoute un projet et sa date de livraison pour le voir apparaitre ici.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((p) => {
              const meta = PROJECT_STATUS_META[p.status];
              const late = p.deadline! < today && p.status !== "paye" && p.status !== "livre";
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 ${
                    late ? "border-danger/30 bg-danger-soft" : "border-hair bg-card"
                  }`}
                >
                  <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-accent-soft text-lg">
                    {meta.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{p.title}</p>
                    <p className="truncate text-[11px] font-semibold text-muted">
                      {p.client_id ? clientName.get(p.client_id) ?? "Client supprime" : "Sans client"}
                      {p.deadline ? ` · ${formatShort(p.deadline)} (${relativeDays(p.deadline, today)})` : ""}
                    </p>
                  </div>
                  {p.amount != null && (
                    <span className="shrink-0 text-sm font-black tabular-nums">
                      {formatMoney(Number(p.amount))}
                    </span>
                  )}
                  <Chip tone={meta.tone}>{meta.label}</Chip>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle
          emoji="🧾"
          action={
            <Link href="/business/factures" className="text-xs font-bold text-accent-ink underline">
              tout voir
            </Link>
          }
        >
          Factures en attente de paiement
        </CardTitle>

        {pending.length === 0 ? (
          <EmptyState emoji="🎉" title="Rien en attente">
            Toutes tes factures envoyees sont payees.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {pending.map((i) => {
              const late = isOverdue(i, today);
              return (
                <li
                  key={i.id}
                  className={`flex items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 ${
                    late ? "border-danger/30 bg-danger-soft" : "border-hair bg-card"
                  }`}
                >
                  <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-accent-soft text-lg">
                    {late ? "🚨" : "📤"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{i.number}</p>
                    <p className="truncate text-[11px] font-semibold text-muted">
                      {i.client_id ? clientName.get(i.client_id) ?? "—" : "—"}
                      {i.due_on ? ` · echeance ${formatShort(i.due_on)}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-black tabular-nums">
                    {formatMoney(Number(i.amount), i.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
