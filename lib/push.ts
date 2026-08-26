"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

/** Cle publique VAPID : sans elle, aucun abonnement n'est possible. */
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushSupport =
  | { ok: true }
  | { ok: false; reason: "server" | "unsupported" | "ios-not-installed" | "no-vapid" };

/** L'app tourne-t-elle depuis l'ecran d'accueil (obligatoire sur iOS) ? */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS expose ce drapeau non standard.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function checkPushSupport(): PushSupport {
  if (typeof window === "undefined") return { ok: false, reason: "server" };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: "no-vapid" };

  const hasApi =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  if (!hasApi) {
    // Sur iOS, l'API n'existe que si l'app a ete ajoutee a l'ecran d'accueil.
    return { ok: false, reason: isIOS() && !isStandalone() ? "ios-not-installed" : "unsupported" };
  }
  return { ok: true };
}

/** Base64 URL-safe → Uint8Array, format attendu par `applicationServerKey`. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

function extractKeys(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const keys = json.keys ?? {};
  return { p256dh: keys.p256dh ?? "", auth: keys.auth ?? "" };
}

/**
 * Demande la permission, cree l'abonnement navigateur et l'enregistre en
 * base. L'`endpoint` est unique : re-souscrire depuis le meme appareil met
 * simplement la ligne a jour.
 */
export async function enablePush(
  supabase: SupabaseClient,
  userId: string,
  reminderHour: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const support = checkPushSupport();
  if (!support.ok) return { ok: false, error: `push indisponible (${support.reason})` };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      error:
        permission === "denied"
          ? "Notifications refusees. Reactive-les dans les reglages du navigateur."
          : "Permission non accordee.",
    };
  }

  const registration = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  if (!registration) return { ok: false, error: "Service worker indisponible." };
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  const { p256dh, auth } = extractKeys(subscription);
  if (!p256dh || !auth) return { ok: false, error: "Abonnement incomplet." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      reminder_hour: reminderHour,
      enabled: true,
      label: deviceLabel(),
      last_error: null,
    },
    { onConflict: "endpoint" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function disablePush(
  supabase: SupabaseClient,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const subscription = await getExistingSubscription();
  if (subscription) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  }
  return { ok: true };
}

export async function updateReminderHour(supabase: SupabaseClient, hour: number) {
  const subscription = await getExistingSubscription();
  if (!subscription) return;
  await supabase
    .from("push_subscriptions")
    .update({
      reminder_hour: hour,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    })
    .eq("endpoint", subscription.endpoint);
}

/** Nom lisible de l'appareil, pour s'y retrouver entre telephone et portable. */
function deviceLabel(): string {
  if (typeof navigator === "undefined") return "Appareil";
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "PC";
  return "Appareil";
}
