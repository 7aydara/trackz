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
      className="shrink-0 rounded-full px-3 py-2 text-sm font-bold text-accent-ink transition hover:bg-sunk disabled:opacity-50"
    >
      Quitter
    </button>
  );
}
