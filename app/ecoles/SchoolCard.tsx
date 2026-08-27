"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckButton } from "@/components/ui/CheckButton";
import { Input } from "@/components/ui/Field";
import { formatShort, relativeDays } from "@/lib/dates";
import {
  PRIORITY_META,
  SCHOOL_STATUS_META,
  STATUS_OPTIONS,
  URGENCY_STYLES,
  type SchoolInsight,
} from "@/lib/schools";
import { createClient } from "@/lib/supabase/client";
import type { SchoolDocument, SchoolStatus, SchoolWithDocs } from "@/lib/types";

/** Une candidature : compte a rebours, statut et checklist de documents. */
export function SchoolCard({
  userId,
  today,
  school,
  insight,
}: {
  userId: string;
  today: string;
  school: SchoolWithDocs;
  insight: SchoolInsight;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [expanded, setExpanded] = useState(insight.urgency === "urgent" || insight.urgency === "late");
  const [docs, setDocs] = useState<SchoolDocument[]>(school.school_documents);
  const [newDoc, setNewDoc] = useState("");

  const style = URGENCY_STYLES[insight.urgency];
  const status = SCHOOL_STATUS_META[school.status];
  const priority = PRIORITY_META[school.priority] ?? PRIORITY_META[2];
  const ratio = insight.docsTotal ? insight.docsDone / insight.docsTotal : 0;

  async function toggleDoc(doc: SchoolDocument, next: boolean) {
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, done: next } : d)));
    await supabase.from("school_documents").update({ done: next }).eq("id", doc.id);
    router.refresh();
  }

  async function addDoc(e: React.FormEvent) {
    e.preventDefault();
    const label = newDoc.trim();
    if (!label) return;
    setNewDoc("");
    const { data } = await supabase
      .from("school_documents")
      .insert({ user_id: userId, school_id: school.id, label, sort_order: docs.length })
      .select("id, school_id, label, done, sort_order")
      .single();
    if (data) setDocs((prev) => [...prev, data as SchoolDocument]);
    router.refresh();
  }

  async function removeDoc(doc: SchoolDocument) {
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    await supabase.from("school_documents").delete().eq("id", doc.id);
    router.refresh();
  }

  async function changeStatus(next: SchoolStatus) {
    await supabase.from("schools").update({ status: next }).eq("id", school.id);
    router.refresh();
  }

  async function removeSchool() {
    if (!window.confirm(`Supprimer definitivement le dossier ${school.name} ?`)) return;
    await supabase.from("schools").delete().eq("id", school.id);
    router.refresh();
  }

  return (
    <li className={`rounded-[var(--radius-card)] border-2 p-3 transition ${style.ring}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 text-left"
      >
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] bg-surface text-2xl shadow-sm">
          {status.emoji}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-extrabold tracking-tight">
            <span className="truncate">{school.name}</span>
            <span className="shrink-0 text-xs" title={priority.label}>
              {priority.emoji}
            </span>
          </p>
          <p className="truncate text-xs font-semibold text-ink-2">
            {[school.program, school.city].filter(Boolean).join(" · ") || "—"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${style.chip}`}>
              {school.deadline
                ? `${formatShort(school.deadline)} — ${relativeDays(school.deadline, today)}`
                : "sans deadline"}
            </span>
            <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-extrabold text-ink-2">
              {insight.docsDone}/{insight.docsTotal} docs
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>

          <p className="mt-1.5 text-[11px] font-bold text-ink-2">{insight.message}</p>
        </div>

        <span aria-hidden className="pt-2 text-sm font-extrabold text-ink-2">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="animate-rise mt-3 space-y-3 border-t border-hairline pt-3">
          <div>
            <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-2">
              Statut du dossier
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeStatus(key)}
                  className={`inline-flex min-h-11 items-center rounded-full border px-4 text-[13px] font-semibold transition ${
                    school.status === key
                      ? "border-transparent bg-accent text-on-accent"
                      : "border-hairline bg-surface text-ink-2 hover:border-accent"
                  }`}
                >
                  {meta.emoji} {meta.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-2">
              Documents a fournir
            </p>
            <ul className="space-y-1.5">
              {docs.map((doc) => (
                <li
                  key={doc.id}
                  className={`flex items-center gap-2 rounded-[var(--radius-control)] border px-2.5 py-1.5 ${
                    doc.done ? "border-hairline bg-raised" : "border-hairline bg-surface"
                  }`}
                >
                  <CheckButton
                    size="sm"
                    done={doc.done}
                    label={doc.label}
                    onToggle={(v) => toggleDoc(doc, v)}
                  />
                  <span className={`flex-1 text-sm font-bold ${doc.done ? "line-through opacity-60" : ""}`}>
                    {doc.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDoc(doc)}
                    aria-label={`Supprimer ${doc.label}`}
                    className="tap text-ink-3 transition hover:text-danger"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            <form onSubmit={addDoc} className="mt-2 flex gap-2">
              <Input
                value={newDoc}
                onChange={(e) => setNewDoc(e.target.value)}
                placeholder="Ajouter un document…"
                className="!py-2 text-sm"
              />
              <Button type="submit" variant="secondary" size="sm">
                +
              </Button>
            </form>
          </div>

          {school.notes && (
            <p className="whitespace-pre-line rounded-[var(--radius-control)] bg-surface px-3 py-2 text-sm font-semibold text-ink-2">
              {school.notes}
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            {school.url ? (
              <a
                href={school.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-accent underline"
              >
                Ouvrir le dossier ↗
              </a>
            ) : (
              <span />
            )}
            <Button variant="danger" size="sm" onClick={removeSchool}>
              Supprimer
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
