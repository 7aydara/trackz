"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await createClient().auth.signOut();
        router.replace("/login");
        router.refresh();
      }}
      className="rounded-full border border-hair bg-white px-3 py-1.5 text-xs font-bold text-muted transition hover:text-ink disabled:opacity-50"
    >
      Deconnexion
    </button>
  );
}
