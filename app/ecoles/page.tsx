import { createClient } from "@/lib/supabase/server";
import type { SchoolWithDocs } from "@/lib/types";
import { EcolesClient } from "./EcolesClient";

export const dynamic = "force-dynamic";

export default async function EcolesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("schools")
    .select("*, school_documents(id, school_id, label, done, sort_order)")
    .order("deadline", { ascending: true, nullsFirst: false });

  const schools = (data ?? []).map((s) => ({
    ...s,
    school_documents: [...(s.school_documents ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  })) as SchoolWithDocs[];

  return <EcolesClient userId={user!.id} schools={schools} />;
}
