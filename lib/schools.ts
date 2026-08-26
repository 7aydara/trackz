import { diffInDays } from "@/lib/dates";
import type { SchoolStatus, SchoolWithDocs } from "@/lib/types";

export const SCHOOL_STATUS_META: Record<
  SchoolStatus,
  { label: string; emoji: string; tone: "neutral" | "accent" | "warn" | "good" | "danger" }
> = {
  a_preparer: { label: "A preparer", emoji: "📝", tone: "neutral" },
  envoye: { label: "Envoye", emoji: "📤", tone: "accent" },
  en_attente: { label: "En attente", emoji: "⏳", tone: "warn" },
  accepte: { label: "Accepte", emoji: "🎉", tone: "good" },
  refuse: { label: "Refuse", emoji: "💔", tone: "danger" },
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
export function schoolInsight(school: SchoolWithDocs, today: string): SchoolInsight {
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
  late: { ring: "border-danger bg-danger-soft/50", chip: "bg-danger-soft text-danger-ink", emoji: "🚨" },
  urgent: { ring: "border-danger bg-danger-soft/50", chip: "bg-danger-soft text-danger-ink", emoji: "🔴" },
  soon: { ring: "border-warn bg-warn-soft/50", chip: "bg-warn-soft text-warn-ink", emoji: "🟠" },
  calm: { ring: "border-hair bg-card", chip: "bg-sunk text-muted", emoji: "🟢" },
  done: { ring: "border-good bg-good-soft/40", chip: "bg-good-soft text-good-ink", emoji: "✅" },
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
