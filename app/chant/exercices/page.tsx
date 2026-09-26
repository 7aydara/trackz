import { createClient } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import type { VoiceProfile, VoiceSession } from "@/lib/types";
import { ExercisesClient } from "./ExercisesClient";

export const dynamic = "force-dynamic";

export default async function ExercicesPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    today,
    { e },
  ] = await Promise.all([supabase.auth.getUser(), getToday(), searchParams]);

  const [sessionsRes, profileRes] = await Promise.all([
    supabase
      .from("voice_sessions")
      .select("id, session_date, exercise_key, root_midi, score, duration_sec, created_at")
      .not("score", "is", null),
    supabase.from("voice_profiles").select("id, low_midi, high_midi, voice_type, updated_at").maybeSingle(),
  ]);

  return (
    <ExercisesClient
      userId={user!.id}
      today={today}
      initialKey={e ?? null}
      sessions={(sessionsRes.data ?? []) as VoiceSession[]}
      profile={(profileRes.data ?? null) as VoiceProfile | null}
    />
  );
}
