/* ------------------------------------------------------------------ */
/* Notes                                                               */
/* ------------------------------------------------------------------ */

const SOLFEGE = ["Do", "Do♯", "Ré", "Ré♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"];
const LETTERS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Numero MIDI continu : 69 = La 440, un demi-ton = 1. */
export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

/** "Do4", en notation francaise. L'octave suit la convention americaine (La4 = 440 Hz). */
export function noteName(midi: number): string {
  const m = Math.round(midi);
  return `${SOLFEGE[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

/** "C4", pour qui lit les partitions anglo-saxonnes. */
export function letterName(midi: number): string {
  const m = Math.round(midi);
  return `${LETTERS[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(((Math.round(midi) % 12) + 12) % 12);
}

/**
 * Ecart en cents, ramene dans [-600, 600[. Chanter la bonne note une octave
 * au-dessus ou en dessous compte comme juste : une voix d'homme qui reprend
 * un modele aigu ne doit pas etre punie pour ca.
 */
export function foldedCents(sungMidi: number, targetMidi: number): number {
  const c = (sungMidi - targetMidi) * 100;
  return ((((c + 600) % 1200) + 1200) % 1200) - 600;
}

/** Tolerance de justesse : un quart de ton de part et d'autre. */
export const IN_TUNE_CENTS = 50;

/* ------------------------------------------------------------------ */
/* Detection de hauteur                                                */
/* ------------------------------------------------------------------ */

export interface PitchEstimate {
  freq: number;
  /** 0 → 1 : a quel point le signal est periodique (une voix tenue ≈ 0.95). */
  clarity: number;
}

const MIN_FREQ = 60;
const MAX_FREQ = 1100;
const MIN_RMS = 0.012;
const MIN_CLARITY = 0.8;

/**
 * Methode de McLeod (fonction de difference carree normalisee) : on mesure
 * la ressemblance du signal avec lui-meme decale de `tau` echantillons, et
 * la premiere periode qui ressemble presque autant que la meilleure gagne.
 * Prendre "la premiere" plutot que "la meilleure" evite l'erreur classique
 * de l'octave en dessous, ou deux periodes ressemblent autant qu'une.
 */
export function detectPitch(buf: Float32Array, sampleRate: number): PitchEstimate | null {
  const maxLag = Math.min(Math.floor(sampleRate / MIN_FREQ), Math.floor(buf.length / 2));
  const minLag = Math.floor(sampleRate / MAX_FREQ);
  const W = buf.length - maxLag;
  if (W <= 0) return null;

  let energy = 0;
  for (let i = 0; i < buf.length; i++) energy += buf[i] * buf[i];
  if (Math.sqrt(energy / buf.length) < MIN_RMS) return null;

  let e0 = 0;
  for (let i = 0; i < W; i++) e0 += buf[i] * buf[i];

  const nsdf = new Float32Array(maxLag + 1);
  let eTau = e0;
  for (let tau = 0; tau <= maxLag; tau++) {
    if (tau > 0) eTau += buf[tau + W - 1] * buf[tau + W - 1] - buf[tau - 1] * buf[tau - 1];
    let acf = 0;
    for (let i = 0; i < W; i++) acf += buf[i] * buf[i + tau];
    const m = e0 + eTau;
    nsdf[tau] = m > 0 ? (2 * acf) / m : 0;
  }

  // Un pic par bosse positive, apres le premier passage sous zero.
  const peaks: number[] = [];
  let tau = 1;
  while (tau < maxLag && nsdf[tau] > 0) tau++;
  while (tau < maxLag) {
    while (tau < maxLag && nsdf[tau] <= 0) tau++;
    let best = tau;
    while (tau < maxLag && nsdf[tau] > 0) {
      if (nsdf[tau] > nsdf[best]) best = tau;
      tau++;
    }
    if (best < maxLag && nsdf[best] > 0) peaks.push(best);
  }
  if (peaks.length === 0) return null;

  const highest = Math.max(...peaks.map((p) => nsdf[p]));
  const chosen = peaks.find((p) => nsdf[p] >= 0.9 * highest)!;
  if (chosen < minLag || nsdf[chosen] < MIN_CLARITY) return null;

  // Interpolation parabolique : la vraie periode tombe entre deux echantillons.
  const a = nsdf[chosen - 1];
  const b = nsdf[chosen];
  const c = nsdf[chosen + 1] ?? b;
  const denom = a - 2 * b + c;
  const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
  const period = chosen + Math.max(-1, Math.min(1, shift));

  return { freq: sampleRate / period, clarity: b };
}

/* ------------------------------------------------------------------ */
/* Tessitures                                                          */
/* ------------------------------------------------------------------ */

export interface VoiceType {
  key: string;
  label: string;
  low: number;
  high: number;
  blurb: string;
}

/** Etendues de reference d'un chanteur forme, en numeros MIDI. */
export const VOICE_TYPES: VoiceType[] = [
  { key: "basse", label: "Basse", low: 40, high: 64, blurb: "La voix la plus grave, profonde et ronde." },
  { key: "baryton", label: "Baryton", low: 45, high: 69, blurb: "La voix d'homme la plus courante, entre chaleur et eclat." },
  { key: "tenor", label: "Ténor", low: 48, high: 72, blurb: "Voix d'homme aigue, brillante dans le haut." },
  { key: "alto", label: "Alto", low: 53, high: 77, blurb: "La voix de femme la plus grave, riche dans le medium." },
  { key: "mezzo", label: "Mezzo-soprano", low: 57, high: 81, blurb: "Voix de femme centrale, souple et chaude." },
  { key: "soprano", label: "Soprano", low: 60, high: 84, blurb: "La voix la plus aigue, legere dans les sommets." },
];

export const VOICE_TYPE_BY_KEY = Object.fromEntries(VOICE_TYPES.map((v) => [v.key, v])) as Record<
  string,
  VoiceType
>;

/**
 * Le type dont l'etendue recouvre le mieux celle mesuree. Un debutant a
 * rarement toute l'etendue de reference : c'est le recouvrement qui compte,
 * et a egalite on privilegie le centre le plus proche.
 */
export function classifyVoice(low: number, high: number): VoiceType {
  const center = (low + high) / 2;
  let best = VOICE_TYPES[0];
  let bestScore = -Infinity;
  for (const v of VOICE_TYPES) {
    const overlap = Math.min(high, v.high) - Math.max(low, v.low);
    const score = overlap - Math.abs(center - (v.low + v.high) / 2) * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}

/**
 * Note de depart confortable pour les exercices : un peu au-dessus du bas
 * de la tessiture, la ou la voix est stable sans forcer.
 */
export function comfortableRoot(profile: { low_midi: number; high_midi: number } | null): number {
  if (!profile) return 48; // Do3 : chantable par la plupart des voix, a l'octave pres.
  return Math.round(profile.low_midi + (profile.high_midi - profile.low_midi) * 0.25);
}

/* ------------------------------------------------------------------ */
/* Exercices                                                           */
/* ------------------------------------------------------------------ */

export type ExerciseLevel = "debutant" | "intermediaire" | "avance";

export interface ExerciseDef {
  key: string;
  title: string;
  emoji: string;
  level: ExerciseLevel;
  /** Ecarts en demi-tons depuis la note de depart. */
  pattern: number[];
  /** Duree de chaque note, en secondes. */
  noteSec: number;
  syllable: string;
  goal: string;
  tip: string;
}

export const EXERCISES: ExerciseDef[] = [
  {
    key: "unisson",
    title: "Note tenue",
    emoji: "🎯",
    level: "debutant",
    pattern: [0, 0],
    noteSec: 2.5,
    syllable: "« a »",
    goal: "Trouver une note et la tenir sans qu'elle bouge.",
    tip: "Ecoute d'abord, puis attaque doucement : il vaut mieux arriver juste que fort.",
  },
  {
    key: "tierce",
    title: "Monter d'une tierce",
    emoji: "🪜",
    level: "debutant",
    pattern: [0, 4, 0],
    noteSec: 1.2,
    syllable: "« ma — mé — ma »",
    goal: "Sentir un premier intervalle : do — mi — do.",
    tip: "Pense la note d'arrivee avant de la chanter : l'oreille guide la voix.",
  },
  {
    key: "quinte",
    title: "La quinte",
    emoji: "🏔️",
    level: "debutant",
    pattern: [0, 7, 0],
    noteSec: 1.2,
    syllable: "« no — no — no »",
    goal: "L'intervalle du debut de « Star Wars » : do — sol — do.",
    tip: "Ne leve pas le menton pour monter : la hauteur se fait dedans, pas avec la tete.",
  },
  {
    key: "gamme5",
    title: "Cinq notes",
    emoji: "🎼",
    level: "debutant",
    pattern: [0, 2, 4, 5, 7, 5, 4, 2, 0],
    noteSec: 0.6,
    syllable: "« a »",
    goal: "Do ré mi fa sol fa mi ré do — l'echauffement de tous les chanteurs.",
    tip: "Garde la meme voyelle du debut a la fin, et le meme volume en haut qu'en bas.",
  },
  {
    key: "arpege",
    title: "Arpege majeur",
    emoji: "✨",
    level: "intermediaire",
    pattern: [0, 4, 7, 12, 7, 4, 0],
    noteSec: 0.7,
    syllable: "« a — é — i — o — i — é — a »",
    goal: "Do mi sol do : sauter proprement jusqu'a l'octave.",
    tip: "Allege la voix en montant, comme si tu lancais la note plutot que de la pousser.",
  },
  {
    key: "mineur",
    title: "Gamme mineure",
    emoji: "🌙",
    level: "intermediaire",
    pattern: [0, 2, 3, 5, 7, 5, 3, 2, 0],
    noteSec: 0.6,
    syllable: "« lou »",
    goal: "La couleur triste : la tierce est plus basse d'un demi-ton.",
    tip: "Le mi bemol a tendance a remonter : vise-le un tout petit peu plus bas que tu ne crois.",
  },
  {
    key: "octave",
    title: "Saut d'octave",
    emoji: "🚀",
    level: "intermediaire",
    pattern: [0, 12, 12, 0],
    noteSec: 1,
    syllable: "« ou — i — i — ou »",
    goal: "Passer du grave a l'aigu sans casser la voix.",
    tip: "Le « i » aide a monter, le « ou » a redescendre. Laisse la voix basculer en voix de tete.",
  },
  {
    key: "gamme",
    title: "Gamme complete",
    emoji: "🎹",
    level: "avance",
    pattern: [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0],
    noteSec: 0.5,
    syllable: "« la »",
    goal: "L'octave entiere, aller et retour.",
    tip: "Respire avant de commencer : toute la gamme tient dans un seul souffle.",
  },
  {
    key: "chromatique",
    title: "Demi-tons",
    emoji: "🔬",
    level: "avance",
    pattern: [0, 1, 2, 3, 4, 3, 2, 1, 0],
    noteSec: 0.7,
    syllable: "« a »",
    goal: "La precision fine : chaque pas est le plus petit possible.",
    tip: "C'est l'exercice le plus dur a l'oreille. Ecoute deux fois s'il le faut.",
  },
];

export const EXERCISE_BY_KEY = Object.fromEntries(EXERCISES.map((e) => [e.key, e])) as Record<
  string,
  ExerciseDef
>;

export const LEVEL_LABEL: Record<ExerciseLevel, string> = {
  debutant: "Debutant",
  intermediaire: "Intermediaire",
  avance: "Avance",
};

/** Exercice du jour : tourne dans la liste, stable sur la journee. */
export function exerciseOfTheDay(today: string): ExerciseDef {
  return EXERCISES[Number(today.replaceAll("-", "")) % EXERCISES.length];
}

/* ------------------------------------------------------------------ */
/* Echauffement                                                        */
/* ------------------------------------------------------------------ */

export interface WarmupStep {
  key: string;
  title: string;
  emoji: string;
  seconds: number;
  how: string;
  why: string;
  /** Affiche la courbe de hauteur en direct pendant l'etape. */
  listen?: boolean;
  /** Etape de respiration guidee : inspire / bloque / expire, en secondes. */
  breath?: [number, number, number];
}

export const WARMUP: WarmupStep[] = [
  {
    key: "posture",
    title: "Posture",
    emoji: "🧍",
    seconds: 30,
    how: "Pieds a largeur de hanches, genoux souples, epaules basses. Imagine un fil qui tire le haut de ta tete vers le plafond.",
    why: "Un corps aligne laisse l'air circuler librement : la voix sort sans effort.",
  },
  {
    key: "respiration",
    title: "Respiration 4 — 4 — 6",
    emoji: "🌬️",
    seconds: 56,
    breath: [4, 4, 6],
    how: "Inspire par le nez en gonflant le ventre, bloque, puis expire lentement sur un « sss ». Les epaules ne bougent pas.",
    why: "Le chant, c'est d'abord du souffle controle. Le ventre travaille, pas la gorge.",
  },
  {
    key: "trilles",
    title: "Trilles des levres",
    emoji: "🐴",
    seconds: 40,
    listen: true,
    how: "Fais vibrer les levres (« brrr ») en glissant du grave a l'aigu et retour, comme une sirene.",
    why: "La vibration masse les cordes vocales et equilibre le souffle sans aucune tension.",
  },
  {
    key: "humming",
    title: "Bouche fermee",
    emoji: "🐝",
    seconds: 40,
    listen: true,
    how: "Chante « mmm » sur une note confortable. Cherche la vibration sur les levres et le nez.",
    why: "C'est la resonance : la voix porte plus loin sans chanter plus fort.",
  },
  {
    key: "sirene",
    title: "Sirene sur « ng »",
    emoji: "🎢",
    seconds: 40,
    listen: true,
    how: "Comme la fin de « parking » : la langue touche le palais. Glisse doucement du plus grave au plus aigu.",
    why: "Relie la voix de poitrine et la voix de tete, sans cassure au milieu.",
  },
  {
    key: "voyelles",
    title: "Voyelles",
    emoji: "👄",
    seconds: 40,
    listen: true,
    how: "Sur une seule note : « mi — mé — ma — mo — mou ». La note ne doit pas bouger quand la voyelle change.",
    why: "Chaque voyelle change la forme de la bouche : on apprend a garder la justesse quand meme.",
  },
];

export const TIPS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: "💧",
    title: "Hydrate-toi",
    body: "Les cordes vocales vibrent des centaines de fois par seconde. Bois de l'eau tout au long de la journee, pas juste avant de chanter.",
  },
  {
    emoji: "🤫",
    title: "Jamais de douleur",
    body: "Chanter ne doit pas faire mal ni gratter. Si ca tire, arrete-toi : c'est la gorge qui force au lieu du souffle.",
  },
  {
    emoji: "👂",
    title: "L'oreille d'abord",
    body: "On chante juste ce qu'on entend juste. Ecoute la note, imagine-la dans ta tete, puis seulement chante-la.",
  },
  {
    emoji: "📱",
    title: "Enregistre-toi",
    body: "On ne s'entend pas comme les autres nous entendent. Un enregistrement par semaine vaut mille impressions.",
  },
  {
    emoji: "⏱️",
    title: "Peu mais souvent",
    body: "Quinze minutes par jour valent mieux que deux heures le dimanche. La voix est un muscle : elle progresse avec la regularite.",
  },
  {
    emoji: "😴",
    title: "Le repos compte",
    body: "Une voix fatiguee chante bas et faux. Apres une longue journee de parole, prefere un echauffement doux a un exercice aigu.",
  },
];

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m ? `${m} min ${String(s).padStart(2, "0")}` : `${s} s`;
}
