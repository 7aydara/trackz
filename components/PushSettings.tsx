"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Select } from "@/components/ui/Field";
import {
  checkPushSupport,
  disablePush,
  enablePush,
  getExistingSubscription,
  registerServiceWorker,
  updateReminderHour,
  type PushSupport,
} from "@/lib/push";
import { createClient } from "@/lib/supabase/client";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * Reglage du rappel du soir sur cet appareil. L'abonnement est par
 * appareil : le telephone peut sonner a 20h et le portable jamais.
 */
export function PushSettings({
  userId,
  initialHour = 20,
  initialEnabled = false,
}: {
  userId: string;
  initialHour?: number;
  initialEnabled?: boolean;
}) {
  const supabase = createClient();
  const [support, setSupport] = useState<PushSupport>({ ok: false, reason: "server" });
  const [subscribed, setSubscribed] = useState(initialEnabled);
  const [hour, setHour] = useState(initialHour);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupport(checkPushSupport());
    registerServiceWorker();
    getExistingSubscription().then((sub) => setSubscribed(Boolean(sub)));
  }, []);

  async function toggle() {
    setBusy(true);
    setError(null);
    setMessage(null);

    if (subscribed) {
      await disablePush(supabase);
      setSubscribed(false);
      setMessage("Rappels desactives sur cet appareil.");
    } else {
      const result = await enablePush(supabase, userId, hour);
      if (result.ok) {
        setSubscribed(true);
        setMessage(`C'est actif : tu recevras un rappel a ${hour}h s'il reste des cases a cocher.`);
      } else {
        setError(result.error);
      }
    }
    setBusy(false);
  }

  async function changeHour(next: number) {
    setHour(next);
    if (subscribed) await updateReminderHour(supabase, next);
  }

  async function sendTest() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const { data, error } = await supabase.functions.invoke("send-reminders", { body: {} });
    if (error) {
      setError(
        "Impossible d'envoyer le test. Verifie que les secrets VAPID sont bien configures cote Supabase.",
      );
    } else {
      const sent = (data as { sent?: number } | null)?.sent ?? 0;
      setMessage(
        sent > 0
          ? "Notification envoyee — regarde ton telephone 📲"
          : "Aucun appareil abonne pour l'instant.",
      );
    }
    setBusy(false);
  }

  return (
    <Card>
      <CardTitle
        emoji="🔔"
        action={
          subscribed ? <Chip tone="good">actif</Chip> : <Chip>inactif</Chip>
        }
      >
        Rappel du soir
      </CardTitle>

      {!support.ok && support.reason === "ios-not-installed" && (
        <div className="rounded-[var(--radius-control)] bg-accent-soft px-3 py-2.5 text-sm font-semibold text-accent-ink">
          <p className="font-black">Sur iPhone, installe d'abord Trackz 📲</p>
          <p className="mt-1">
            Safari → bouton Partager → <strong>Sur l'ecran d'accueil</strong>. Rouvre Trackz
            depuis l'icone, puis reviens ici : iOS n'autorise les notifications que pour les
            apps ajoutees a l'ecran d'accueil.
          </p>
        </div>
      )}

      {!support.ok && support.reason === "no-vapid" && (
        <p className="rounded-[var(--radius-control)] bg-warn-soft px-3 py-2.5 text-sm font-bold text-warn-ink">
          Cle publique VAPID absente. Renseigne `NEXT_PUBLIC_VAPID_PUBLIC_KEY` puis relance
          l'app.
        </p>
      )}

      {!support.ok && support.reason === "unsupported" && (
        <p className="rounded-[var(--radius-control)] bg-sunk px-3 py-2.5 text-sm font-bold text-muted">
          Ce navigateur ne gere pas les notifications push. Essaie Chrome, Firefox ou Safari a
          jour.
        </p>
      )}

      {support.ok && (
        <>
          <p className="text-sm font-semibold text-muted">
            Une notification sur ton telephone s'il reste des cases a cocher. Rien a signaler,
            rien qui sonne — et jamais plus d'une par jour.
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
                Heure du rappel
              </span>
              <Select value={hour} onChange={(e) => changeHour(Number(e.target.value))}>
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}h00
                  </option>
                ))}
              </Select>
            </label>

            <Button
              onClick={toggle}
              disabled={busy}
              variant={subscribed ? "ghost" : "primary"}
              size="lg"
            >
              {busy ? "..." : subscribed ? "Desactiver" : "🔔 Activer"}
            </Button>
          </div>

          {subscribed && (
            <Button
              variant="soft"
              size="sm"
              className="mt-2 w-full"
              onClick={sendTest}
              disabled={busy}
            >
              Envoyer une notification test
            </Button>
          )}
        </>
      )}

      {message && (
        <p className="mt-2 rounded-xl bg-good-soft px-3 py-2 text-sm font-bold text-good-ink">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-xl bg-danger-soft px-3 py-2 text-sm font-bold text-danger-ink">
          {error}
        </p>
      )}
    </Card>
  );
}
