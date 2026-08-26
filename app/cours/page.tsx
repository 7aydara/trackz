import { addDays, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Subject, SubjectLog } from "@/lib/types";
import { CoursClient } from "./CoursClient";

export const dynamic = "force-dynamic";

export default async function CoursPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = todayISO();

  const [subjectsRes, logsRes] = await Promise.all([
    supabase
      .from("subjects")
      .select("*")
      .eq("archived", false)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("subject_logs")
      .select("id, subject_id, log_date, done, minutes, note")
      .gte("log_date", addDays(today, -180))
      .lte("log_date", today),
  ]);

  return (
    <CoursClient
      userId={user!.id}
      today={today}
      subjects={(subjectsRes.data ?? []) as Subject[]}
      logs={(logsRes.data ?? []) as SubjectLog[]}
    />
  );
}
