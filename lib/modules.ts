export type ModuleKey = "tracker" | "cours" | "ecoles" | "business" | "sport";

export interface ModuleDef {
  key: ModuleKey;
  href: string;
  label: string;
  short: string;
  emoji: string;
  tagline: string;
  /** Classe de theme appliquee au shell (definit --accent). */
  theme: string;
  /** Couleur d'accent en dur, pour les degrades et le SVG. */
  accent: string;
  accentSoft: string;
}

export const MODULES: ModuleDef[] = [
  {
    key: "tracker",
    href: "/tracker",
    label: "Habit Tracker",
    short: "Tracker",
    emoji: "🔥",
    tagline: "Ta journee en un coup d'oeil : streaks, check-ins, heatmap.",
    theme: "theme-tracker",
    accent: "#7c3aed",
    accentSoft: "#ede9fe",
  },
  {
    key: "cours",
    href: "/cours",
    label: "Suivi des cours",
    short: "Cours",
    emoji: "📚",
    tagline: "Une case par matiere, chaque jour. Garde le rythme.",
    theme: "theme-cours",
    accent: "#0ea5e9",
    accentSoft: "#e0f2fe",
  },
  {
    key: "ecoles",
    href: "/ecoles",
    label: "Dossiers ecoles",
    short: "Ecoles",
    emoji: "🎓",
    tagline: "Deadlines, checklists de documents, comptes a rebours.",
    theme: "theme-ecoles",
    accent: "#f59e0b",
    accentSoft: "#fef3c7",
  },
  {
    key: "business",
    href: "/business",
    label: "Business freelance",
    short: "Business",
    emoji: "💼",
    tagline: "Clients, projets, factures et revenus du mois.",
    theme: "theme-business",
    accent: "#10b981",
    accentSoft: "#d1fae5",
  },
  {
    key: "sport",
    href: "/sport",
    label: "Kung Fu Shaolin",
    short: "Kung Fu",
    emoji: "🥋",
    tagline: "Stances, conditionnement, taolu et arbre de progression.",
    theme: "theme-sport",
    accent: "#f43f5e",
    accentSoft: "#ffe4e6",
  },
];

export const MODULE_BY_KEY = Object.fromEntries(
  MODULES.map((m) => [m.key, m]),
) as Record<ModuleKey, ModuleDef>;
