import { createClient } from "@/lib/supabase/server";
import type { TaoluProgress } from "@/lib/types";
import { TreeClient } from "./TreeClient";

export const dynamic = "force-dynamic";

export default async function ArbrePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("taolu_progress")
    .select("*")
    .order("level")
    .order("sort_order");

  return <TreeClient userId={user!.id} items={(data ?? []) as TaoluProgress[]} />;
}
