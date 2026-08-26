"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "magic";

const COPY: Record<Mode, { cta: string; tab: string }> = {
  signin: { cta: "Se connecter", tab: "Connexion" },
  signup: { cta: "Creer mon compte", tab: "Inscription" },
  magic: { cta: "Recevoir le lien magique", tab: "Lien magique" },
};

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=${encodeURIComponent(next ?? "/")}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        setMessage("Lien envoye ! Va voir ta boite mail 📬");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        setMessage("Compte cree. Confirme ton email si Supabase te le demande 📬");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next ?? "/");
        router.refresh();
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-hair bg-card p-5 shadow-[0_4px_12px_rgba(29,27,46,0.05)]">
      <div className="mb-5 grid grid-cols-3 gap-1 rounded-full bg-sunk p-1">
        {(Object.keys(COPY) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setMessage(null);
            }}
            className={`rounded-full px-2 py-2.5 text-xs font-extrabold transition ${
              mode === m ? "bg-card text-accent-ink shadow-sm" : "text-muted"
            }`}
          >
            {COPY[m].tab}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Email">
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="moi@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        {mode !== "magic" && (
          <Field label="Mot de passe">
            <Input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}

        {error && (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-bold text-danger-ink">{error}</p>
        )}
        {message && (
          <p className="rounded-xl bg-good-soft px-3 py-2 text-sm font-bold text-good-ink">
            {message}
          </p>
        )}

        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? "..." : COPY[mode].cta}
        </Button>
      </form>
    </div>
  );
}
