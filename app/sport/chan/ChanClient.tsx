"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { formatShort } from "@/lib/dates";
import { CHAN_QUOTES } from "@/lib/kungfu";
import { createClient } from "@/lib/supabase/client";
import type { PhilosophyNote } from "@/lib/types";

/**
 * Espace Chan : le carnet qui garde le lien avec le sens de la pratique,
 * a cote des chiffres de performance.
 */
export function ChanClient({
  userId,
  today,
  notes,
}: {
  userId: string;
  today: string;
  notes: PhilosophyNote[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState(false);

  // Citation du jour : stable sur la journee, sans stockage.
  const quoteOfTheDay =
    CHAN_QUOTES[
      Number(today.replaceAll("-", "")) % CHAN_QUOTES.length
    ];

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    await supabase.from("philosophy_notes").insert({
      user_id: userId,
      content: content.trim(),
      author: author.trim() || null,
      note_date: today,
    });
    setBusy(false);
    setContent("");
    setAuthor("");
    router.refresh();
  }

  async function addQuote(quote: (typeof CHAN_QUOTES)[number]) {
    await supabase.from("philosophy_notes").insert({
      user_id: userId,
      content: quote.content,
      author: quote.author,
      note_date: today,
    });
    router.refresh();
  }

  async function togglePin(note: PhilosophyNote) {
    await supabase.from("philosophy_notes").update({ pinned: !note.pinned }).eq("id", note.id);
    router.refresh();
  }

  async function remove(note: PhilosophyNote) {
    await supabase.from("philosophy_notes").delete().eq("id", note.id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="bg-surface text-center">
        <p className="text-3xl" aria-hidden>
          ☯️
        </p>
        <p className="mt-2 text-lg font-extrabold leading-snug tracking-tight">
          « {quoteOfTheDay.content} »
        </p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-ink-2">
          {quoteOfTheDay.author}
        </p>
      </Card>

      <Card>
        <CardTitle>Ajouter une note</CardTitle>
        <form onSubmit={add} className="space-y-3">
          <Field label="Note ou citation">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ce que la seance d'aujourd'hui m'a appris…"
            />
          </Field>
          <Field label="Source (optionnel)">
            <Input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Proverbe Chan, mon prof, moi…"
            />
          </Field>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "..." : "Enregistrer"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle>Citations a piocher</CardTitle>
        <ul className="space-y-2">
          {CHAN_QUOTES.map((q) => (
            <li
              key={q.content}
              className="flex items-start gap-2 rounded-[var(--radius-control)] border border-hairline bg-surface px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold italic">« {q.content} »</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-2">
                  {q.author}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => addQuote(q)}>
                +
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Mon carnet</CardTitle>

        {notes.length === 0 ? (
          <EmptyState emoji="🧘" title="Carnet vide">
            Note ce que la pratique t'apprend, pas seulement ce qu'elle te fait performer.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li
                key={n.id}
                className={`rounded-[var(--radius-control)] border px-3 py-2.5 ${
                  n.pinned ? "border-hairline bg-raised" : "border-hairline bg-surface"
                }`}
              >
                <p className="whitespace-pre-line text-sm font-semibold">{n.content}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-ink-2">
                    {n.author ? `${n.author} · ` : ""}
                    {formatShort(n.note_date)}
                  </span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => togglePin(n)}
                    aria-label={n.pinned ? "Detacher" : "Epingler"}
                    className="tap text-base"
                  >
                    {n.pinned ? "📌" : "📍"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(n)}
                    aria-label="Supprimer la note"
                    className="tap text-ink-3 transition hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
