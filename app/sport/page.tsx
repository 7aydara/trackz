import { addDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getToday } from "@/lib/today";
import type { StanceLog, Workout, WorkoutExercise } from "@/lib/types";
import { SportClient } from "./SportClient";

export const dynamic = "force-dynamic";

export default async function SportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = await getToday();

  const [workoutsRes, exercisesRes, stancesRes] = await Promise.all([
    supabase
      .from("workouts")
      .select("*")
      .gte("session_date", addDays(today, -364))
      .order("session_date", { ascending: false }),
    supabase
      .from("workout_exercises")
      .select("id, workout_id, name, category, sets, reps, duration_sec, sort_order, notes")
      .order("sort_order"),
    supabase
      .from("stance_logs")
      .select("id, workout_id, stance_key, log_date, hold_seconds, note")
      .gte("log_date", addDays(today, -364)),
  ]);

  return (
    <SportClient
      userId={user!.id}
      today={today}
      workouts={(workoutsRes.data ?? []) as Workout[]}
      exercises={(exercisesRes.data ?? []) as WorkoutExercise[]}
      stanceLogs={(stancesRes.data ?? []) as StanceLog[]}
    />
  );
}
