import { diffInDays, todayISO } from "@/lib/dates";
import type { SchoolStatus, SchoolWithDocs } from "@/lib/types";

export const SCHOOL_STATUS_META: Record<
  SchoolStatus,
  { label: string; emoji: string; tone: "neutral" | "blue" | "amber" | "green" | "red" }
> = {
  a_preparer: { label: "A preparer", emoji: "📝", tone: "neutral" },
  envoye: { label: "Envoye", emoji: "📤", tone: "blue" },
  en_attente: { label: "En attente", emoji: "⏳", tone: "amber" },
  accepte: { label: "Accepte", emoji: "🎉", tone: "green" },
  refuse: { label: "Refuse", emoji: "💔", tone: "red" },
};

export const DEFAULT_DOCUMENTS = [
  "CV",
  "Lettre de motivation",
  "Releves de notes",
  "Piece d'identite",
  "Lettre de recommandation",
  "Dossier en ligne rempli",
];

export type Urgency = "done" | "calm" | "soon" | "urgent" | "late";

export interface SchoolInsight {
  docsTotal: number;
  docsDone: number;
  docsRatio: number;
  daysLeft: number | null;
  urgency: Urgency;
  message: string;
}

/**
 * Croise la deadline et l'avancement de la checklist : c'est ce couple
 * qui declenche l'alerte, pas la date seule.
 */
export function schoolInsight(school: SchoolWithDocs, today = todayISO()): SchoolInsight {
  const docs = school.school_documents ?? [];
  const docsTotal = docs.length;
  const docsDone = docs.filter((d) => d.done).length;
  const docsRatio = docsTotal ? docsDone / docsTotal : 0;
  const complete = docsTotal > 0 && docsDone === docsTotal;
  const daysLeft = school.deadline ? diffInDays(today, school.deadline) : null;

  if (school.status === "accepte" || school.status === "refuse") {
    return {
      docsTotal,
      docsDone,
      docsRatio,
      daysLeft,
      urgency: "done",
      message: SCHOOL_STATUS_META[school.status].label,
    };
  }

  if (school.status === "envoye" || school.status === "en_attente") {
    return {
      docsTotal,
      docsDone,
      docsRatio,
      daysLeft,
      urgency: "calm",
      message: "Dossier parti, plus qu'a attendre",
    };
  }

  if (daysLeft === null) {
    return { docsTotal, docsDone, docsRatio, daysLeft, urgency: "calm", message: "Pas de deadline" };
  }

  if (daysLeft < 0) {
    return {
      docsTotal,
      docsDone,
      docsRatio,
      daysLeft,
      urgency: "late",
      message: `Deadline depassee de ${-daysLeft} j`,
    };
  }

  if (complete) {
    return {
      docsTotal,
      docsDone,
      docsRatio,
      daysLeft,
      urgency: "calm",
      message: "Checklist complete, pense a envoyer",
    };
  }

  const missing = docsTotal - docsDone;
  if (daysLeft <= 7) {
    return {
      docsTotal,
      docsDone,
      docsRatio,
      daysLeft,
      urgency: "urgent",
      message: `${missing} document(s) manquant(s) a ${daysLeft} j de la deadline`,
    };
  }
  if (daysLeft <= 21) {
    return {
      docsTotal,
      docsDone,
      docsRatio,
      daysLeft,
      urgency: "soon",
      message: `${missing} document(s) a preparer avant ${daysLeft} j`,
    };
  }

  return {
    docsTotal,
    docsDone,
    docsRatio,
    daysLeft,
    urgency: "calm",
    message: `${missing} document(s) restants`,
  };
}

export const URGENCY_STYLES: Record<Urgency, { ring: string; chip: string; emoji: string }> = {
  late: { ring: "border-rose-300 bg-rose-50/60", chip: "bg-rose-100 text-rose-700", emoji: "🚨" },
  urgent: { ring: "border-rose-300 bg-rose-50/60", chip: "bg-rose-100 text-rose-700", emoji: "🔴" },
  soon: { ring: "border-amber-300 bg-amber-50/60", chip: "bg-amber-100 text-amber-700", emoji: "🟠" },
  calm: { ring: "border-hair bg-white", chip: "bg-canvas text-muted", emoji: "🟢" },
  done: { ring: "border-emerald-200 bg-emerald-50/50", chip: "bg-emerald-100 text-emerald-700", emoji: "✅" },
};

/** Deadline la plus proche en premier, dossiers sans date a la fin. */
export function sortByDeadline(schools: SchoolWithDocs[]): SchoolWithDocs[] {
  return [...schools].sort((a, b) => {
    const closed = (s: SchoolWithDocs) => (s.status === "accepte" || s.status === "refuse" ? 1 : 0);
    if (closed(a) !== closed(b)) return closed(a) - closed(b);
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
}

export const STATUS_OPTIONS = Object.entries(SCHOOL_STATUS_META) as [
  SchoolStatus,
  (typeof SCHOOL_STATUS_META)[SchoolStatus],
][];

export const PRIORITY_META: Record<number, { label: string; emoji: string }> = {
  1: { label: "Reve", emoji: "⭐" },
  2: { label: "Cible", emoji: "🎯" },
  3: { label: "Securite", emoji: "🛟" },
};
