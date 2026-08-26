import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Card, SectionLabel } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { formatLong, relativeDays } from "@/lib/dates";
import { MODULES } from "@/lib/modules";
import { getDashboardData } from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import type { Invoice, School } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HubPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    today,
  ] = await Promise.all([supabase.auth.getUser(), getToday()]);

  const [dash, schoolsRes, invoicesRes, projectsRes] = await Promise.all([
    getDashboardData(supabase, { days: 40, date: today }),
    supabase
      .from("schools")
      .select("id, name, deadline, status")
      .in("status", ["a_preparer", "envoye", "en_attente"])
      .not("deadline", "is", null)
      .gte("deadline", today)
      .order("deadline")
      .limit(1),
    supabase.from("invoices").select("amount, status, due_on").neq("status", "payee"),
    supabase.from("projects").select("id").eq("status", "en_cours"),
  ]);

  const nextSchool = (schoolsRes.data?.[0] ?? null) as Pick<
    School,
    "id" | "name" | "deadline"
  > | null;
  const unpaid = (invoicesRes.data ?? []) as Pick<Invoice, "amount" | "status" | "due_on">[];
  const unpaidTotal = unpaid
    .filter((i) => i.status === "envoyee")
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const overdue = unpaid.filter(
    (i) => i.status === "envoyee" && i.due_on !== null && i.due_on < today,
  ).length;
  const ongoingProjects = projectsRes.data?.length ?? 0;

  const coursItems = dash.items.filter((i) => i.module === "cours");
  const coursDone = coursItems.filter((i) => i.done).length;
  const sportDone = dash.items.find((i) => i.kind === "workout")?.done ?? false;
  const sportStreak = dash.domainStreaks.find((s) => s.module === "sport")?.current ?? 0;
  const ratio = dash.totalToday ? dash.doneToday / dash.totalToday : 0;

  /** Une ligne d'etat par module, avec son niveau d'urgence. */
  const summaries: Record<string, { text: string; tone: "neutral" | "accent" | "danger" }> = {
    tracker: {
      text: `${dash.doneToday}/${dash.totalToday} coche · serie de ${dash.globalStreak.current} j`,
      tone: "accent",
    },
    cours: {
      text: coursItems.length
        ? `${coursDone}/${coursItems.length} matieres cochees`
        : "aucune matiere configuree",
      tone: coursItems.length && coursDone === coursItems.length ? "accent" : "neutral",
    },
    ecoles: {
      text: nextSchool?.deadline
        ? `${relativeDays(nextSchool.deadline, today)} · ${nextSchool.name}`
        : "aucune deadline a venir",
      tone: "neutral",
    },
    business: {
      text: overdue
        ? `${Math.round(unpaidTotal)} € · ${overdue} facture(s) en retard`
        : `${Math.round(unpaidTotal)} € en attente · ${ongoingProjects} projet(s) en cours`,
      tone: overdue ? "danger" : "neutral",
    },
    sport: {
      text: sportDone
        ? `seance faite · serie de ${sportStreak} j`
        : `pas encore aujourd'hui · serie de ${sportStreak} j`,
      tone: sportDone ? "accent" : "neutral",
    },
  };

  const firstName =
    user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "toi";

  return (
    <AppShell subtitle={formatLong(today)}>
      <div className="mb-5 px-1">
        <h1 className="text-3xl font-black tracking-tight">
          Salut {firstName} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 font-semibold text-muted">Voila ou tu en es aujourd'hui.</p>
      </div>

      <Card className="mb-6 flex flex-col items-center gap-4">
        <ProgressRing value={ratio} size={168} stroke={16}>
          <div>
            <div className="text-4xl font-black leading-none tabular-nums text-accent-ink">
              {Math.round(ratio * 100)}%
            </div>
            <div className="mt-1 text-xs font-bold text-muted">de ta journee</div>
          </div>
        </ProgressRing>

        <div className="flex flex-wrap justify-center gap-2">
          <Chip tone="neutral">
            {dash.doneToday}/{dash.totalToday} valides
          </Chip>
          <Chip tone="warn">{dash.globalStreak.current} jours 🔥</Chip>
        </div>

        <Link
          href="/tracker"
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-5 py-3.5 text-base font-extrabold text-on-accent shadow-[0_4px_0_var(--color-accent-deep)] transition active:translate-y-[2px] active:shadow-[0_2px_0_var(--color-accent-deep)]"
        >
          Ouvrir ma journee
          <Icon name="back" size={20} className="rotate-180" />
        </Link>
      </Card>

      <SectionLabel>Mes 5 apps</SectionLabel>

      <ul className="grid gap-3">
        {MODULES.map((m, i) => (
          <li key={m.key} className={m.theme}>
            <Link
              href={m.href}
              className="animate-rise block rounded-[var(--radius-card)] border border-hair bg-card p-4 shadow-[0_4px_12px_rgba(29,27,46,0.05)] transition hover:-translate-y-0.5 hover:border-accent/40"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-control)] bg-accent-soft text-2xl"
                >
                  {m.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-extrabold tracking-tight">{m.label}</p>
                  <p className="truncate text-sm font-semibold text-muted">{m.tagline}</p>
                </div>
                <Icon name="chevron" size={20} className="-rotate-90 shrink-0 text-muted" />
              </div>

              <p
                className={`mt-3 truncate rounded-[var(--radius-control)] px-3 py-2 text-sm font-bold ${
                  summaries[m.key].tone === "danger"
                    ? "bg-danger-soft text-danger-ink"
                    : summaries[m.key].tone === "accent"
                      ? "bg-accent-soft text-accent-ink"
                      : "bg-sunk text-muted"
                }`}
              >
                {summaries[m.key].text}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
