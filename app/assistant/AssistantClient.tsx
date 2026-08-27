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
        "L'assistant n'a pas repondu. Verifie que la cle GEMINI_API_KEY est bien configuree cote Supabase.",
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
      <div className="mb-5 flex items-start gap-3.5">
        <Logo size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[20px] font-extrabold tracking-[-0.02em]">Ton assistant</p>
          <p className="mt-1 text-[13px] font-medium leading-relaxed text-ink-3">
            Il voit tes dossiers, tes matieres et ta journee. Il cherche des ecoles sur le
            web, remplit tes checklists et coche a ta place.
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
            <p className="px-1 text-sm font-semibold text-ink-2">
              Par quoi on commence ?
            </p>
            <ul className="grid gap-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    className="w-full rounded-[var(--radius-control)] border border-hairline bg-surface px-4 py-3 text-left text-sm font-bold transition hover:border-accent"
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
              <div className="max-w-[85%] rounded-[var(--radius-card)] rounded-br-md bg-raised px-4 py-3 text-[15px] font-medium leading-relaxed text-ink">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-2.5">
              <Logo size={30} className="mt-0.5" />
              <div className="min-w-0 max-w-[85%] rounded-[var(--radius-card)] rounded-bl-md border border-hairline bg-surface px-4 py-3.5 text-[15px] font-medium leading-relaxed">
                <RichText text={m.text} />
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <div className="flex items-center gap-1.5 rounded-[var(--radius-card)] rounded-bl-md border border-hairline bg-surface px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-2 animate-pulse rounded-full bg-accent"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
              <span className="ml-1 text-xs font-bold text-ink-2">je cherche…</span>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-[var(--radius-control)] bg-danger-dim px-3 py-2 text-sm font-bold text-danger">
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
          className="flex items-end gap-2 rounded-[var(--radius-card)] border border-hairline bg-surface p-2 "
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
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-ink-3"
          />

          {speechAvailable && (
            <button
              type="button"
              onClick={toggleMic}
              aria-label={listening ? "Arreter la dictee" : "Dicter"}
              aria-pressed={listening}
              className={`grid size-11 shrink-0 place-items-center rounded-full transition ${
                listening
                  ? "bg-danger text-on-accent"
                  : "bg-raised text-ink-2 hover:text-accent"
              }`}
            >
              <Icon name="mic" size={20} />
            </button>
          )}

          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Envoyer"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent  transition active:translate-y-[2px]  disabled:opacity-40"
          >
            <Icon name="send" size={20} />
          </button>
        </form>

        <button
          type="button"
          aria-pressed={speakReplies}
          onClick={() => {
            const next = !speakReplies;
            setSpeakReplies(next);
            if (!next && window.speechSynthesis) window.speechSynthesis.cancel();
          }}
          className="mx-auto mt-2 flex min-h-11 items-center gap-2 rounded-full px-3 text-[13px] font-medium text-ink-3 transition hover:text-ink-2"
        >
          <span
            aria-hidden
            className={`h-4 w-7 rounded-full p-0.5 transition ${
              speakReplies ? "bg-accent" : "bg-hairline"
            }`}
          >
            <span
              className={`block size-3 rounded-full bg-ink transition ${
                speakReplies ? "translate-x-3" : ""
              }`}
            />
          </span>
          Lire a voix haute
        </button>
      </div>
    </div>
  );
}
