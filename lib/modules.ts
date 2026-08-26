import type { IconName } from "@/components/Icon";

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
  /** Icone de la navigation basse. */
  icon: IconName;
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
    icon: "flame",
  },
  {
    key: "cours",
    href: "/cours",
    label: "Suivi des cours",
    short: "Cours",
    emoji: "📚",
    tagline: "Une case par matiere, chaque jour. Garde le rythme.",
    theme: "theme-cours",
    icon: "book",
  },
  {
    key: "ecoles",
    href: "/ecoles",
    label: "Dossiers ecoles",
    short: "Ecoles",
    emoji: "🎓",
    tagline: "Deadlines, checklists de documents, comptes a rebours.",
    theme: "theme-ecoles",
    icon: "school",
  },
  {
    key: "business",
    href: "/business",
    label: "Business freelance",
    short: "Business",
    emoji: "💼",
    tagline: "Clients, projets, factures et revenus du mois.",
    theme: "theme-business",
    icon: "briefcase",
  },
  {
    key: "sport",
    href: "/sport",
    label: "Kung Fu Shaolin",
    short: "Kung Fu",
    emoji: "🥋",
    tagline: "Stances, conditionnement, taolu et arbre de progression.",
    theme: "theme-sport",
    icon: "martial",
  },
];

export const MODULE_BY_KEY = Object.fromEntries(
  MODULES.map((m) => [m.key, m]),
) as Record<ModuleKey, ModuleDef>;
