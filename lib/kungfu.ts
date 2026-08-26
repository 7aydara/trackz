import type { ExerciseCategory, TaoluLevel, TaoluStatus } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Stances (positions statiques)                                       */
/* ------------------------------------------------------------------ */

export interface StanceDef {
  key: string;
  name: string;
  pinyin: string;
  emoji: string;
  tip: string;
  /** Objectif de tenue pour un debutant, en secondes. */
  goal: number;
}

export const STANCES: StanceDef[] = [
  {
    key: "ma_bu",
    name: "Posture du cavalier",
    pinyin: "Ma Bu 马步",
    emoji: "🐎",
    tip: "Cuisses vers l'horizontale, dos droit, genoux pousses vers l'exterieur.",
    goal: 120,
  },
  {
    key: "gong_bu",
    name: "Posture de l'arc",
    pinyin: "Gong Bu 弓步",
    emoji: "🏹",
    tip: "Jambe avant pliee a 90°, jambe arriere tendue, hanches de face.",
    goal: 90,
  },
  {
    key: "xu_bu",
    name: "Posture vide",
    pinyin: "Xu Bu 虚步",
    emoji: "🍃",
    tip: "90% du poids sur la jambe arriere, pointe du pied avant au sol.",
    goal: 60,
  },
  {
    key: "pu_bu",
    name: "Posture rampante",
    pinyin: "Pu Bu 仆步",
    emoji: "🐍",
    tip: "Une jambe tendue au ras du sol, l'autre profondement pliee.",
    goal: 45,
  },
  {
    key: "xie_bu",
    name: "Posture croisee",
    pinyin: "Xie Bu 歇步",
    emoji: "🌀",
    tip: "Jambes croisees, assise basse, buste droit.",
    goal: 45,
  },
];

export const STANCE_BY_KEY = Object.fromEntries(STANCES.map((s) => [s.key, s])) as Record<
  string,
  StanceDef
>;

/* ------------------------------------------------------------------ */
/* Conditionnement                                                     */
/* ------------------------------------------------------------------ */

export interface ExerciseDef {
  name: string;
  category: ExerciseCategory;
  emoji: string;
  /** Ce qu'on saisit : series x repetitions, ou une duree. */
  mode: "reps" | "duration";
}

export const CONDITIONING: ExerciseDef[] = [
  { name: "Pompes", category: "conditionnement", emoji: "💪", mode: "reps" },
  { name: "Pompes sur les poings", category: "conditionnement", emoji: "👊", mode: "reps" },
  { name: "Pompes sur les doigts", category: "conditionnement", emoji: "🖐️", mode: "reps" },
  { name: "Gainage", category: "conditionnement", emoji: "🧱", mode: "duration" },
  { name: "Squats", category: "conditionnement", emoji: "🦵", mode: "reps" },
  { name: "Sauts groupes", category: "conditionnement", emoji: "🦘", mode: "reps" },
  { name: "Abdos", category: "conditionnement", emoji: "🔥", mode: "reps" },
  { name: "Grand ecart lateral", category: "souplesse", emoji: "🧘", mode: "duration" },
  { name: "Etirements ischios", category: "souplesse", emoji: "🤸", mode: "duration" },
];

export const EXERCISE_CATEGORY_META: Record<ExerciseCategory, { label: string; emoji: string }> = {
  conditionnement: { label: "Conditionnement", emoji: "💪" },
  stance: { label: "Stance", emoji: "🧍" },
  taolu: { label: "Taolu", emoji: "🌀" },
  souplesse: { label: "Souplesse", emoji: "🤸" },
  autre: { label: "Autre", emoji: "✨" },
};

/* ------------------------------------------------------------------ */
/* Seances types pour demarrer a la maison, sans materiel              */
/* ------------------------------------------------------------------ */

export interface SessionTemplate {
  key: string;
  name: string;
  emoji: string;
  duration: number;
  level: "debutant" | "intermediaire";
  focus: string;
  blocks: string[];
  stances: { key: string; seconds: number }[];
  exercises: { name: string; sets: number; reps?: number; seconds?: number }[];
}

export const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    key: "fondations",
    name: "Fondations",
    emoji: "🧱",
    duration: 30,
    level: "debutant",
    focus: "Stances de base",
    blocks: [
      "5 min d'echauffement : rotations des articulations, montees de genoux",
      "Ma Bu 3 x 30 s, Gong Bu 2 x 30 s de chaque cote",
      "Chong Quan : 3 x 20 poings en Ma Bu",
      "Conditionnement leger : pompes et squats",
      "5 min d'etirements + 2 min assis en silence",
    ],
    stances: [
      { key: "ma_bu", seconds: 30 },
      { key: "gong_bu", seconds: 30 },
    ],
    exercises: [
      { name: "Pompes", sets: 3, reps: 10 },
      { name: "Squats", sets: 3, reps: 15 },
      { name: "Gainage", sets: 3, seconds: 30 },
    ],
  },
  {
    key: "endurance_stances",
    name: "Endurance des jambes",
    emoji: "🐎",
    duration: 40,
    level: "debutant",
    focus: "Tenue longue des stances",
    blocks: [
      "8 min d'echauffement complet",
      "Ma Bu : 4 x 60 s, 1 min de repos entre les series",
      "Xu Bu et Pu Bu : 2 x 30 s de chaque cote",
      "Deplacements en Gong Bu : 4 allers-retours",
      "Etirements longs des jambes",
    ],
    stances: [
      { key: "ma_bu", seconds: 60 },
      { key: "xu_bu", seconds: 30 },
      { key: "pu_bu", seconds: 30 },
    ],
    exercises: [{ name: "Squats", sets: 4, reps: 20 }],
  },
  {
    key: "conditionnement",
    name: "Conditionnement Shaolin",
    emoji: "👊",
    duration: 35,
    level: "debutant",
    focus: "Force et resistance",
    blocks: [
      "Echauffement articulaire complet",
      "Pompes sur les poings : 4 x 12 (poignets alignes)",
      "Gainage : 4 x 45 s",
      "Sauts groupes : 3 x 12",
      "Abdos : 3 x 20",
      "Retour au calme et respiration",
    ],
    stances: [{ key: "ma_bu", seconds: 45 }],
    exercises: [
      { name: "Pompes sur les poings", sets: 4, reps: 12 },
      { name: "Gainage", sets: 4, seconds: 45 },
      { name: "Sauts groupes", sets: 3, reps: 12 },
      { name: "Abdos", sets: 3, reps: 20 },
    ],
  },
  {
    key: "taolu",
    name: "Premiers taolu",
    emoji: "🌀",
    duration: 45,
    level: "intermediaire",
    focus: "Wu Bu Quan et Tan Tui",
    blocks: [
      "10 min d'echauffement et de mobilite",
      "Revision des 5 stances, 20 s chacune",
      "Wu Bu Quan : 5 passages lents puis 3 a vitesse normale",
      "Tan Tui routines 1 a 3 : 3 passages chacune",
      "Etirements et 5 min de meditation assise",
    ],
    stances: [
      { key: "ma_bu", seconds: 20 },
      { key: "gong_bu", seconds: 20 },
      { key: "xu_bu", seconds: 20 },
      { key: "pu_bu", seconds: 20 },
      { key: "xie_bu", seconds: 20 },
    ],
    exercises: [{ name: "Wu Bu Quan", sets: 8, reps: 1 }],
  },
];

/* ------------------------------------------------------------------ */
/* Arbre de progression                                                */
/* ------------------------------------------------------------------ */

export const TAOLU_LEVEL_META: Record<
  TaoluLevel,
  { label: string; emoji: string; belt: string; hint: string }
> = {
  debutant: {
    label: "Debutant",
    emoji: "⚪",
    belt: "Ceinture blanche",
    hint: "Les fondations : stances, poing direct, premiers enchainements.",
  },
  intermediaire: {
    label: "Intermediaire",
    emoji: "🟡",
    belt: "Ceinture jaune",
    hint: "Coups de pied, deplacements, taolu plus longs.",
  },
  avance: {
    label: "Avance",
    emoji: "🔴",
    belt: "Ceinture rouge",
    hint: "Formes classiques, armes traditionnelles, Qin Na.",
  },
};

export const TAOLU_LEVELS: TaoluLevel[] = ["debutant", "intermediaire", "avance"];

export const TAOLU_STATUS_META: Record<
  TaoluStatus,
  { label: string; emoji: string; weight: number }
> = {
  a_apprendre: { label: "A apprendre", emoji: "🔒", weight: 0 },
  en_cours: { label: "En cours", emoji: "⚙️", weight: 0.5 },
  maitrise: { label: "Maitrise", emoji: "🏅", weight: 1 },
};

export const TAOLU_STATUSES: TaoluStatus[] = ["a_apprendre", "en_cours", "maitrise"];

/* ------------------------------------------------------------------ */
/* Espace Chan                                                         */
/* ------------------------------------------------------------------ */

export const CHAN_QUOTES: { content: string; author: string }[] = [
  {
    content:
      "La pratique n'est pas la recherche de la perfection, mais la repetition sincere du geste juste.",
    author: "Proverbe Chan",
  },
  {
    content: "Un jour d'entrainement, un jour de gain. Un jour sans, dix jours de perte.",
    author: "Dicton Shaolin",
  },
  {
    content: "D'abord l'endurance, ensuite la technique, enfin l'esprit.",
    author: "Tradition Shaolin",
  },
  {
    content: "Assieds-toi, respire, observe. Le corps suit ce que l'esprit a deja accepte.",
    author: "Chan",
  },
  {
    content:
      "Ce n'est pas la force du coup qui compte, mais le calme de celui qui n'a pas besoin de le donner.",
    author: "Proverbe martial",
  },
];

export function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
}
