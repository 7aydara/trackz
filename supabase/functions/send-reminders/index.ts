import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

/**
 * Envoie le rappel du soir en notification push.
 *
 * Deux chemins d'appel :
 *  - le cron horaire, authentifie par l'en-tete `x-cron-secret` : traite
 *    tous les abonnements dont c'est l'heure locale ;
 *  - l'app, authentifiee par le JWT de l'utilisateur : envoie une
 *    notification de test a ses propres appareils.
 *
 * La fonction est deployee avec `verify_jwt: false` parce que le cron
 * n'a pas de JWT ; l'authentification est faite explicitement ci-dessous,
 * et aucun chemin n'est ouvert sans l'un des deux secrets.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:trackz@example.com";

interface Subscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  reminder_hour: number;
  last_sent_on: string | null;
}

/** Date et heure locales de l'utilisateur, dans son fuseau. */
function localParts(timeZone: string): { date: string; hour: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
  } catch {
    return localParts("UTC");
  }

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
}

interface Pending {
  count: number;
  labels: string[];
}

/** Ce qu'il reste a cocher pour cet utilisateur, a cette date locale. */
async function pendingFor(
  db: SupabaseClient,
  userId: string,
  date: string,
): Promise<Pending> {
  const [subjects, subjectLogs, habits, habitLogs, workouts, checkins] = await Promise.all([
    db.from("subjects").select("id, name, emoji").eq("user_id", userId).eq("archived", false),
    db.from("subject_logs").select("subject_id").eq("user_id", userId).eq("log_date", date).eq("done", true),
    db.from("habits").select("id, name, emoji").eq("user_id", userId).eq("archived", false),
    db.from("habit_logs").select("habit_id").eq("user_id", userId).eq("log_date", date).eq("done", true),
    db.from("workouts").select("id").eq("user_id", userId).eq("session_date", date).limit(1),
    db.from("domain_checkins").select("domain").eq("user_id", userId).eq("log_date", date).eq("done", true),
  ]);

  const doneSubjects = new Set((subjectLogs.data ?? []).map((l) => l.subject_id));
  const doneHabits = new Set((habitLogs.data ?? []).map((l) => l.habit_id));
  const doneDomains = new Set((checkins.data ?? []).map((c) => c.domain));

  const labels: string[] = [];

  for (const s of subjects.data ?? []) {
    if (!doneSubjects.has(s.id)) labels.push(`${s.emoji} ${s.name}`);
  }
  if ((workouts.data ?? []).length === 0) labels.push("🥋 Seance de Kung Fu");
  if (!doneDomains.has("business")) labels.push("💼 Business");
  if (!doneDomains.has("schools")) labels.push("🎓 Dossiers ecoles");
  for (const h of habits.data ?? []) {
    if (!doneHabits.has(h.id)) labels.push(`${h.emoji} ${h.name}`);
  }

  return { count: labels.length, labels };
}

function buildPayload(pending: Pending) {
  const preview = pending.labels.slice(0, 3).join(" · ");
  const more = pending.labels.length > 3 ? ` +${pending.labels.length - 3}` : "";

  return JSON.stringify({
    title: `${pending.count} truc${pending.count > 1 ? "s" : ""} a cocher aujourd'hui ⏰`,
    body: `${preview}${more}`,
    url: "/tracker",
    tag: "trackz-daily-reminder",
  });
}

/** Envoie a un abonnement ; renvoie true si l'abonnement est mort. */
async function push(sub: Subscription, payload: string): Promise<{ gone: boolean; error?: string }> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    );
    return { gone: false };
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    // 404 / 410 : l'utilisateur a desinstalle ou revoque — on nettoie.
    return { gone: status === 404 || status === 410, error: String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(
      JSON.stringify({ error: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquants" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  // Configure ici et pas au chargement du module : web-push leve une
  // exception sur une cle vide, ce qui tuerait le worker au demarrage
  // au lieu de renvoyer une erreur exploitable.
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const cronSecret = req.headers.get("x-cron-secret");
  const isCron = CRON_SECRET.length > 0 && cronSecret === CRON_SECRET;

  // ------------------------------------------------- chemin "test" (app)
  let testUserId: string | null = null;
  if (!isCron) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data, error } = await asUser.auth.getUser();
    if (error || !data.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    testUserId = data.user.id;
  }

  // ----------------------------------------------- selection des cibles
  let query = db
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, timezone, reminder_hour, last_sent_on")
    .eq("enabled", true);

  if (testUserId) query = query.eq("user_id", testUserId);

  const { data: subscriptions, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const pendingCache = new Map<string, Pending>();
  let sent = 0;
  let skipped = 0;
  let removed = 0;

  for (const sub of (subscriptions ?? []) as Subscription[]) {
    const { date, hour } = localParts(sub.timezone);

    if (!testUserId) {
      // Cron : uniquement a l'heure choisie, et une fois par jour.
      if (hour !== sub.reminder_hour || sub.last_sent_on === date) {
        skipped++;
        continue;
      }
    }

    const cacheKey = `${sub.user_id}|${date}`;
    if (!pendingCache.has(cacheKey)) {
      pendingCache.set(cacheKey, await pendingFor(db, sub.user_id, date));
    }
    const pending = pendingCache.get(cacheKey)!;

    if (pending.count === 0 && !testUserId) {
      // Journee bouclee : on ne derange pas, mais on marque le jour comme traite.
      await db.from("push_subscriptions").update({ last_sent_on: date }).eq("id", sub.id);
      skipped++;
      continue;
    }

    const payload =
      pending.count === 0
        ? JSON.stringify({
            title: "Trackz est bien connecte 🎉",
            body: "Tout est coche pour aujourd'hui. Le rappel du soir arrivera a l'heure prevue.",
            url: "/tracker",
            tag: "trackz-test",
          })
        : buildPayload(pending);

    const result = await push(sub, payload);

    if (result.gone) {
      await db.from("push_subscriptions").delete().eq("id", sub.id);
      removed++;
    } else if (result.error) {
      await db.from("push_subscriptions").update({ last_error: result.error }).eq("id", sub.id);
      skipped++;
    } else {
      await db
        .from("push_subscriptions")
        .update({ last_sent_on: date, last_error: null })
        .eq("id", sub.id);
      sent++;
    }
  }

  return new Response(JSON.stringify({ sent, skipped, removed, mode: isCron ? "cron" : "test" }), {
    headers: { "content-type": "application/json" },
  });
});
