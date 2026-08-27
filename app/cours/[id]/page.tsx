import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Heatmap } from "@/components/ui/Heatmap";
import { StatTile } from "@/components/ui/StatTile";
import { addDays } from "@/lib/dates";
import { MILESTONE_BADGES, currentStreak, longestStreak, unlockedMilestones } from "@/lib/streaks";
import { createClient } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import type { Subject, SubjectLog } from "@/lib/types";
import { SubjectHistory } from "./SubjectHistory";

export const dynamic = "force-dynamic";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = await getToday();

  const [subjectRes, logsRes] = await Promise.all([
    supabase.from("subjects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("subject_logs")
      .select("id, subject_id, log_date, done, minutes, note")
      .eq("subject_id", id)
      .gte("log_date", addDays(today, -364))
      .lte("log_date", today),
  ]);

  const subject = subjectRes.data as Subject | null;
  if (!subject) notFound();

  const logs = (logsRes.data ?? []) as SubjectLog[];
  const doneDays = logs.filter((l) => l.done).map((l) => l.log_date);

  const current = currentStreak(doneDays, today);
  const longest = longestStreak(doneDays);
  const badges = unlockedMilestones(current);

  const heatmap: Record<string, number> = {};
  for (const d of doneDays) heatmap[d] = 1;

  const last30 = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  const missed = last30.filter((d) => !doneDays.includes(d)).length;

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-4 bg-surface">
        <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-[var(--radius-control)] bg-module/15 text-3xl">
          {subject.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="mercury-text truncate text-xl font-extrabold tracking-tight">{subject.name}</h2>
          {subject.teacher && (
            <p className="text-sm font-semibold text-ink-2">{subject.teacher}</p>
          )}
          <p className="mt-1 text-sm font-bold text-ink-2">
            🔥 {current} j de serie · record {longest} j
          </p>
          {badges.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1 text-lg">
              {badges.map((b) => (
                <span key={b} title={MILESTONE_BADGES[b].label}>
                  {MILESTONE_BADGES[b].emoji}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile emoji="🔥" label="Serie" value={`${current} j`} />
        <StatTile emoji="🏅" label="Record" value={`${longest} j`} />
        <StatTile emoji="✅" label="Jours coches" value={doneDays.length} hint="12 derniers mois" />
        <StatTile emoji="🕳️" label="Jours manques" value={missed} hint="30 derniers jours" />
      </div>

      <Card>
        <CardTitle>Historique</CardTitle>
        <Heatmap values={heatmap} weeks={30} endDate={today} />
      </Card>

      <SubjectHistory
        userId={user!.id}
        subjectId={subject.id}
        subjectName={subject.name}
        today={today}
        doneDays={doneDays}
      />

      <Link
        href="/cours"
        className="block rounded-[var(--radius-control)] border border-hairline bg-surface px-4 py-3 text-center text-sm font-bold text-ink-2 transition hover:text-ink"
      >
        ← Toutes mes matieres
      </Link>
    </div>
  );
}
