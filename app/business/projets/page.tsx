import { createClient } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import type { Client, Project } from "@/lib/types";
import { ProjectsClient } from "./ProjectsClient";

export const dynamic = "force-dynamic";

export default async function ProjetsPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    today,
  ] = await Promise.all([supabase.auth.getUser(), getToday()]);

  const [projectsRes, clientsRes] = await Promise.all([
    supabase.from("projects").select("*").order("deadline", { nullsFirst: false }),
    supabase.from("clients").select("id, name").order("name"),
  ]);

  return (
    <ProjectsClient
      userId={user!.id}
      today={today}
      projects={(projectsRes.data ?? []) as Project[]}
      clients={(clientsRes.data ?? []) as Pick<Client, "id" | "name">[]}
    />
  );
}
