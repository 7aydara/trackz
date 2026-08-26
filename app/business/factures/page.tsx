import { createClient } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import type { Client, Invoice, Project } from "@/lib/types";
import { InvoicesClient } from "./InvoicesClient";

export const dynamic = "force-dynamic";

export default async function FacturesPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    today,
  ] = await Promise.all([supabase.auth.getUser(), getToday()]);

  const [invoicesRes, clientsRes, projectsRes] = await Promise.all([
    supabase.from("invoices").select("*").order("issued_on", { ascending: false }),
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("projects").select("id, title, client_id, amount").order("title"),
  ]);

  return (
    <InvoicesClient
      userId={user!.id}
      today={today}
      invoices={(invoicesRes.data ?? []) as Invoice[]}
      clients={(clientsRes.data ?? []) as Pick<Client, "id" | "name">[]}
      projects={
        (projectsRes.data ?? []) as Pick<Project, "id" | "title" | "client_id" | "amount">[]
      }
    />
  );
}
