import type { Invoice, InvoiceStatus, ProjectStatus } from "@/lib/types";

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; emoji: string; tone: "neutral" | "blue" | "amber" | "green" }
> = {
  en_attente: { label: "En attente", emoji: "⏳", tone: "neutral" },
  en_cours: { label: "En cours", emoji: "🚧", tone: "blue" },
  livre: { label: "Livre", emoji: "📦", tone: "amber" },
  paye: { label: "Paye", emoji: "💰", tone: "green" },
};

export const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_META) as ProjectStatus[];

export const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  { label: string; emoji: string }
> = {
  brouillon: { label: "Brouillon", emoji: "📝" },
  envoyee: { label: "Envoyee", emoji: "📤" },
  payee: { label: "Payee", emoji: "✅" },
};

export const INVOICE_STATUSES = Object.keys(INVOICE_STATUS_META) as InvoiceStatus[];

/**
 * "En retard" n'est pas stocke en base : c'est une facture envoyee dont
 * l'echeance est passee. Impossible d'avoir un statut perime.
 */
export function isOverdue(invoice: Pick<Invoice, "status" | "due_on">, today: string) {
  return invoice.status === "envoyee" && !!invoice.due_on && invoice.due_on < today;
}

export function daysLate(invoice: Pick<Invoice, "status" | "due_on">, today: string) {
  if (!isOverdue(invoice, today) || !invoice.due_on) return 0;
  return Math.round(
    (new Date(today).getTime() - new Date(invoice.due_on).getTime()) / 86_400_000,
  );
}

export function formatMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** Numero suggere : FA-2026-007. */
export function suggestInvoiceNumber(existing: string[], today: string) {
  const year = today.slice(0, 4);
  const prefix = `FA-${year}-`;
  const max = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => Number(n.slice(prefix.length)))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
