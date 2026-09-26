import { addDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import type { VoiceProfile, VoiceSession } from "@/lib/types";
import { ChantClient } from "./ChantClient";

export const dynamic = "force-dynamic";

export default async function ChantPage() {
  const supabase = await createClient();
  const today = await getToday();

  const [sessionsRes, profileRes] = await Promise.all([
    supabase
      .from("voice_sessions")
      .select("id, session_date, exercise_key, root_midi, score, duration_sec, created_at")
      .gte("session_date", addDays(today, -364))
      .order("created_at"),
    supabase.from("voice_profiles").select("id, low_midi, high_midi, voice_type, updated_at").maybeSingle(),
  ]);

  return (
    <ChantClient
      today={today}
      sessions={(sessionsRes.data ?? []) as VoiceSession[]}
      profile={(profileRes.data ?? null) as VoiceProfile | null}
    />
  );
}
