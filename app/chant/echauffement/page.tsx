import { createClient } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import { WarmupClient } from "./WarmupClient";

export const dynamic = "force-dynamic";

export default async function EchauffementPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    today,
  ] = await Promise.all([supabase.auth.getUser(), getToday()]);

  const { count } = await supabase
    .from("voice_sessions")
    .select("id", { count: "exact", head: true })
    .eq("exercise_key", "echauffement")
    .eq("session_date", today);

  return <WarmupClient userId={user!.id} today={today} doneToday={(count ?? 0) > 0} />;
}
