"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { addDays, formatShort } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";

/** 30 derniers jours cochables : pour rattraper un oubli sans tricher sur la date. */
export function SubjectHistory({
  userId,
  subjectId,
  subjectName,
  today,
  doneDays,
}: {
  userId: string;
  subjectId: string;
  subjectName: string;
  today: string;
  doneDays: string[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  const base = new Set(doneDays);
  const isDone = (d: string) => (d in optimistic ? optimistic[d] : base.has(d));

  async function toggle(date: string) {
    const next = !isDone(date);
    setOptimistic((prev) => ({ ...prev, [date]: next }));

    if (next) {
      await supabase
        .from("subject_logs")
        .upsert(
          { user_id: userId, subject_id: subjectId, log_date: date, done: true },
          { onConflict: "subject_id,log_date" },
        );
    } else {
      await supabase
        .from("subject_logs")
        .delete()
        .eq("subject_id", subjectId)
        .eq("log_date", date);
    }
    router.refresh();
  }

  return (
    <Card>
      <CardTitle emoji="🔁">Rattraper un jour</CardTitle>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
        {days.map((d) => {
          const done = isDone(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggle(d)}
              aria-pressed={done}
              aria-label={`${subjectName} le ${d}`}
              className={`rounded-xl border-2 px-1 py-2 text-[10px] font-black transition ${
                done
                  ? "border-transparent bg-accent text-white"
                  : "border-dashed border-hair bg-white text-muted hover:border-accent"
              } ${d === today ? "ring-2 ring-accent ring-offset-1" : ""}`}
            >
              {formatShort(d).replace(".", "")}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
