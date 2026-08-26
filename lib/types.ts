/**
 * Types des lignes de la base. Ecrits a la main pour rester lisibles ;
 * ils reprennent exactement les migrations de `supabase/migrations/`.
 * (Regenerables avec `supabase gen types typescript --linked`.)
 */

export type Frequency = "daily" | "weekly";

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
  frequency: Frequency;
  target_per_week: number;
  sort_order: number;
  archived: boolean;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string;
  done: boolean;
  note: string | null;
}

export type CheckinDomain = "business" | "schools";

export interface DomainCheckin {
  id: string;
  domain: CheckinDomain;
  log_date: string;
  done: boolean;
  note: string | null;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
  teacher: string | null;
  goal_minutes: number;
  sort_order: number;
  archived: boolean;
  created_at: string;
}

export interface SubjectLog {
  id: string;
  subject_id: string;
  log_date: string;
  done: boolean;
  minutes: number | null;
  note: string | null;
}

export type SchoolStatus =
  | "a_preparer"
  | "envoye"
  | "en_attente"
  | "accepte"
  | "refuse";

export interface School {
  id: string;
  user_id: string;
  name: string;
  program: string | null;
  city: string | null;
  url: string | null;
  deadline: string | null;
  status: SchoolStatus;
  priority: number;
  notes: string | null;
  created_at: string;
}

export interface SchoolDocument {
  id: string;
  school_id: string;
  label: string;
  done: boolean;
  sort_order: number;
}

export interface SchoolWithDocs extends School {
  school_documents: SchoolDocument[];
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: "actif" | "inactif";
  notes: string | null;
  created_at: string;
}

export type ProjectStatus = "en_attente" | "en_cours" | "livre" | "paye";

export interface Project {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;
  amount: number | null;
  created_at: string;
}

export type InvoiceStatus = "brouillon" | "envoyee" | "payee";

export interface Invoice {
  id: string;
  user_id: string;
  project_id: string | null;
  client_id: string | null;
  number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issued_on: string;
  due_on: string | null;
  paid_on: string | null;
  notes: string | null;
}

export interface Workout {
  id: string;
  user_id: string;
  session_date: string;
  duration_min: number;
  focus: string | null;
  intensity: number;
  notes: string | null;
}

export type ExerciseCategory =
  | "conditionnement"
  | "stance"
  | "taolu"
  | "souplesse"
  | "autre";

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  name: string;
  category: ExerciseCategory;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  sort_order: number;
  notes: string | null;
}

export interface StanceLog {
  id: string;
  workout_id: string | null;
  stance_key: string;
  log_date: string;
  hold_seconds: number;
  note: string | null;
}

export type TaoluStatus = "a_apprendre" | "en_cours" | "maitrise";
export type TaoluLevel = "debutant" | "intermediaire" | "avance";

export interface TaoluProgress {
  id: string;
  user_id: string;
  item_key: string;
  name: string;
  category: "taolu" | "technique" | "stance";
  level: TaoluLevel;
  status: TaoluStatus;
  sort_order: number;
  notes: string | null;
}

export interface PhilosophyNote {
  id: string;
  content: string;
  author: string | null;
  note_date: string;
  pinned: boolean;
}
