"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { RichText } from "@/lib/richtext";
import { createClient } from "@/lib/supabase/client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "Trouve-moi des masters en data a Paris avec leurs deadlines",
  "Trie mes dossiers par urgence",
  "Qu'est-ce qu'il me reste a faire aujourd'hui ?",
  "Aide-moi a ecrire ma lettre de motivation",
];

/** Reconnaissance vocale : l'API n'est pas typee par TypeScript. */
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type SpeechCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function AssistantClient({
  threadId: initialThreadId,
  initialMessages,
}: {
  threadId: string | null;
  initialMessages: ChatMessage[];
}) {
  const supabase = createClient();
  const [threadId, setThreadId] = useState(initialThreadId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listening, setListening] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);

  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSpeechAvailable(getSpeechRecognition() !== null), []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  function speak(text: string) {
    if (!speakReplies || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // On ne lit pas les URL a voix haute : c'est illisible.
    const spoken = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/https?:\/\/\S+/g, "");
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = "fr-FR";
    window.speechSynthesis.speak(utterance);
  }

  function toggleMic() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = "fr-FR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setDraft(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recognition.current = rec;
    setListening(true);
    rec.start();
  }

  async function send(content: string) {
    const text = content.trim();
    if (!text || busy) return;

    setDraft("");
    setError(null);
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: "user", text },
    ]);

    const { data, error: fnError } = await supabase.functions.invoke("assistant", {
      body: {
        message: text,
        thread_id: threadId,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });

    setBusy(false);

    if (fnError) {
      setError(
        "L'assistant n'a pas repondu. Verifie que la cle ANTHROPIC_API_KEY est bien configuree cote Supabase.",
      );
      return;
    }

    const payload = data as { thread_id?: string; reply?: string; error?: string };
    if (payload?.error) {
      setError(payload.error);
      return;
    }

    if (payload?.thread_id) setThreadId(payload.thread_id);
    const reply = payload?.reply ?? "";
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}-a`, role: "assistant", text: reply },
    ]);
    speak(reply);
  }

  async function newThread() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setThreadId(null);
    setMessages([]);
    setError(null);
  }

  return (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col pb-44">
      {/* ------------------------------------------------------ en-tete */}
      <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-card)] border border-hair bg-card p-4">
        <Logo size={44} />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold tracking-tight">Ton assistant</p>
          <p className="text-xs font-semibold text-muted">
            Il voit tes dossiers, tes matieres et ta journee. Il peut chercher des ecoles
            sur le web et remplir tes checklists.
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={newThread}>
            Nouveau
          </Button>
        )}
      </div>

      {/* ------------------------------------------------------ messages */}
      <div className="flex-1 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="px-1 text-sm font-semibold text-muted">
              Par quoi on commence ?
            </p>
            <ul className="grid gap-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    className="w-full rounded-[var(--radius-control)] border border-hair bg-card px-4 py-3 text-left text-sm font-bold transition hover:border-accent"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-[var(--radius-card)] rounded-br-md bg-accent px-4 py-2.5 text-[15px] font-semibold text-on-accent">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-2.5">
              <Logo size={30} className="mt-0.5" />
              <div className="min-w-0 max-w-[85%] rounded-[var(--radius-card)] rounded-bl-md border border-hair bg-card px-4 py-3 text-[15px] font-medium">
                <RichText text={m.text} />
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <div className="flex items-center gap-1.5 rounded-[var(--radius-card)] rounded-bl-md border border-hair bg-card px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-2 animate-pulse rounded-full bg-accent"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
              <span className="ml-1 text-xs font-bold text-muted">je cherche…</span>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-sm font-bold text-danger-ink">
            {error}
          </p>
        )}

        <div ref={endRef} />
      </div>

      {/* ----------------------------------------------------- composeur */}
      <div className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-3xl px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-end gap-2 rounded-[var(--radius-card)] border border-hair bg-card p-2 shadow-[0_4px_12px_rgba(29,27,46,0.08)]"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={1}
            placeholder={listening ? "Je t'ecoute…" : "Pose ta question…"}
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-muted/70"
          />

          {speechAvailable && (
            <button
              type="button"
              onClick={toggleMic}
              aria-label={listening ? "Arreter la dictee" : "Dicter"}
              aria-pressed={listening}
              className={`grid size-11 shrink-0 place-items-center rounded-full transition ${
                listening
                  ? "bg-danger text-on-danger"
                  : "bg-sunk text-muted hover:text-accent-ink"
              }`}
            >
              <Icon name="mic" size={20} />
            </button>
          )}

          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Envoyer"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent shadow-[0_3px_0_var(--color-accent-deep)] transition active:translate-y-[2px] active:shadow-none disabled:opacity-40"
          >
            <Icon name="send" size={20} />
          </button>
        </form>

        <label className="mt-2 flex items-center justify-center gap-2 text-xs font-bold text-muted">
          <input
            type="checkbox"
            checked={speakReplies}
            onChange={(e) => {
              setSpeakReplies(e.target.checked);
              if (!e.target.checked && window.speechSynthesis) {
                window.speechSynthesis.cancel();
              }
            }}
            className="size-4 accent-[var(--color-accent)]"
          />
          Lire les reponses a voix haute
        </label>
      </div>
    </div>
  );
}
