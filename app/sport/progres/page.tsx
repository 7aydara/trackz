import { addDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import type { StanceLog, Workout, WorkoutExercise } from "@/lib/types";
import { ProgressClient } from "./ProgressClient";

export const dynamic = "force-dynamic";

export default async function ProgresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = await getToday();
  const from = addDays(today, -364);

  const [stancesRes, workoutsRes, exercisesRes] = await Promise.all([
    supabase
      .from("stance_logs")
      .select("id, workout_id, stance_key, log_date, hold_seconds, note")
      .gte("log_date", from)
      .order("log_date"),
    supabase.from("workouts").select("id, session_date").gte("session_date", from),
    supabase
      .from("workout_exercises")
      .select("id, workout_id, name, category, sets, reps, duration_sec, sort_order, notes"),
  ]);

  return (
    <ProgressClient
      userId={user!.id}
      today={today}
      stanceLogs={(stancesRes.data ?? []) as StanceLog[]}
      workouts={(workoutsRes.data ?? []) as Pick<Workout, "id" | "session_date">[]}
      exercises={(exercisesRes.data ?? []) as WorkoutExercise[]}
    />
  );
}
