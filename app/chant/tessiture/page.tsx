import { createClient } from "@/lib/supabase/server";
import type { VoiceProfile } from "@/lib/types";
import { RangeClient } from "./RangeClient";

export const dynamic = "force-dynamic";

export default async function TessiturePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("voice_profiles")
    .select("id, low_midi, high_midi, voice_type, updated_at")
    .maybeSingle();

  return <RangeClient userId={user!.id} profile={(data ?? null) as VoiceProfile | null} />;
}
