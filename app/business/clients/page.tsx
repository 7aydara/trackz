import { createClient } from "@/lib/supabase/server";
import type { Client, Invoice, Project } from "@/lib/types";
import { ClientsClient } from "./ClientsClient";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [clientsRes, projectsRes, invoicesRes] = await Promise.all([
    supabase.from("clients").select("*").order("status").order("name"),
    supabase.from("projects").select("id, client_id, status, title"),
    supabase.from("invoices").select("id, client_id, amount, status"),
  ]);

  return (
    <ClientsClient
      userId={user!.id}
      clients={(clientsRes.data ?? []) as Client[]}
      projects={(projectsRes.data ?? []) as Pick<Project, "id" | "client_id" | "status" | "title">[]}
      invoices={(invoicesRes.data ?? []) as Pick<Invoice, "id" | "client_id" | "amount" | "status">[]}
    />
  );
}
