import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { formatLong, relativeDays, todayISO } from "@/lib/dates";
import { MODULES } from "@/lib/modules";
import { getDashboardData } from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";
import type { Invoice, School } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = todayISO();

  const [dash, schoolsRes, invoicesRes, projectsRes] = await Promise.all([
    getDashboardData(supabase, { days: 40 }),
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

  const nextSchool = (schoolsRes.data?.[0] ?? null) as Pick<School, "id" | "name" | "deadline"> | null;
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
  const ratio = dash.totalToday ? dash.doneToday / dash.totalToday : 0;

  const summaries: Record<string, { value: string; hint: string }> = {
    tracker: {
      value: `${dash.doneToday}/${dash.totalToday}`,
      hint: `🔥 ${dash.globalStreak.current} j de serie`,
    },
    cours: {
      value: coursItems.length ? `${coursDone}/${coursItems.length}` : "0 matiere",
      hint: coursItems.length ? "matieres cochees aujourd'hui" : "ajoute tes matieres",
    },
    ecoles: {
      value: nextSchool?.deadline ? relativeDays(nextSchool.deadline) : "—",
      hint: nextSchool ? `prochaine : ${nextSchool.name}` : "aucune deadline a venir",
    },
    business: {
      value: `${Math.round(unpaidTotal)} €`,
      hint: overdue ? `⚠️ ${overdue} facture(s) en retard` : `${ongoingProjects} projet(s) en cours`,
    },
    sport: {
      value: sportDone ? "Seance faite ✅" : "Pas encore",
      hint: `🔥 ${dash.domainStreaks.find((s) => s.module === "sport")?.current ?? 0} j de serie`,
    },
  };

  const firstName = user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "toi";

  return (
    <AppShell subtitle={formatLong(today)}>
      <Card className="mb-4 flex items-center gap-4 !bg-white">
        <ProgressRing value={ratio}>
          <div>
            <div className="text-2xl font-black leading-none tabular-nums">
              {Math.round(ratio * 100)}%
            </div>
            <div className="text-[10px] font-bold uppercase text-muted">du jour</div>
          </div>
        </ProgressRing>

        <div className="min-w-0">
          <p className="text-xl font-black tracking-tight">Salut {firstName} 👋</p>
          <p className="mt-1 text-sm font-semibold text-muted">
            {dash.doneToday}/{dash.totalToday} coche aujourd'hui — serie de{" "}
            <span className="font-black text-accent-ink">{dash.globalStreak.current} jours</span> 🔥
          </p>
          <Link
            href="/tracker"
            className="mt-3 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-bold text-white"
          >
            Ouvrir ma journee →
          </Link>
        </div>
      </Card>

      <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-muted">
        Mes 5 apps
      </h2>

      <ul className="grid gap-3 sm:grid-cols-2">
        {MODULES.map((m, i) => (
          <li key={m.key} className={m.theme}>
            <Link
              href={m.href}
              className="animate-rise group block h-full rounded-[var(--radius-card)] border border-hair bg-white/90 p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl transition group-hover:scale-110"
                  style={{ background: m.accentSoft }}
                >
                  {m.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-black tracking-tight">{m.label}</p>
                  <p className="mt-0.5 text-xs font-semibold text-muted">{m.tagline}</p>
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-2 rounded-2xl bg-accent-soft px-3 py-2">
                <span className="text-lg font-black tabular-nums text-accent-ink">
                  {summaries[m.key].value}
                </span>
                <span className="truncate text-[11px] font-bold text-accent-ink/70">
                  {summaries[m.key].hint}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
