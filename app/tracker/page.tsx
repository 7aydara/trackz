import { getDashboardData } from "@/lib/queries/dashboard";
import { createClient } from "@/lib/supabase/server";
import type { Habit } from "@/lib/types";
import { TrackerClient } from "./TrackerClient";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [dash, habitsRes] = await Promise.all([
    getDashboardData(supabase, { days: 154 }),
    supabase
      .from("habits")
      .select("*")
      .eq("archived", false)
      .order("sort_order")
      .order("created_at"),
  ]);

  return (
    <TrackerClient
      userId={user!.id}
      data={dash}
      habits={(habitsRes.data ?? []) as Habit[]}
    />
  );
}
