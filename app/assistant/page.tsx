import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { AssistantClient, type ChatMessage } from "./AssistantClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assistant — Trackz" };

export default async function AssistantPage() {
  const supabase = await createClient();

  // On reprend le dernier fil : l'assistant garde le contexte d'une
  // session a l'autre plutot que de repartir de zero a chaque ouverture.
  const { data: thread } = await supabase
    .from("assistant_threads")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let messages: ChatMessage[] = [];
  if (thread) {
    const { data } = await supabase
      .from("assistant_messages")
      .select("id, role, text")
      .eq("thread_id", thread.id)
      .eq("hidden", false)
      .order("created_at")
      .limit(60);
    messages = (data ?? []) as ChatMessage[];
  }

  return (
    <AppShell subtitle="Ecoles, dossiers, journee">
      <AssistantClient threadId={thread?.id ?? null} initialMessages={messages} />
    </AppShell>
  );
}
