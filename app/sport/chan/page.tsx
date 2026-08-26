import { createClient } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import type { PhilosophyNote } from "@/lib/types";
import { ChanClient } from "./ChanClient";

export const dynamic = "force-dynamic";

export default async function ChanPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    today,
  ] = await Promise.all([supabase.auth.getUser(), getToday()]);

  const { data } = await supabase
    .from("philosophy_notes")
    .select("id, content, author, note_date, pinned")
    .order("pinned", { ascending: false })
    .order("note_date", { ascending: false });

  return <ChanClient userId={user!.id} today={today} notes={(data ?? []) as PhilosophyNote[]} />;
}
