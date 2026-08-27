import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

/**
 * L'assistant de Trackz, sur l'API Gemini.
 *
 * Deploye avec `verify_jwt: true` : Supabase valide le jeton avant nous.
 * Surtout, le client Supabase utilise le JWT de l'utilisateur et non la
 * cle service role — l'assistant passe donc par la RLS comme n'importe
 * quel appel de l'app, et ne peut toucher que les donnees de son
 * proprietaire, meme si le modele se trompe de parametre.
 *
 * On appelle l'API REST directement plutot qu'un SDK : la forme des
 * requetes est stable et documentee, et cela evite d'embarquer une
 * dependance de plus dans le runtime Deno.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const CONFIGURED_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3-flash";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_TOOL_ROUNDS = 5;

// La plateforme tue le worker vers 150 s. On s'arrete avant, pour rendre
// une reponse utile plutot que de mourir en silence — un worker tue ne
// repond rien du tout, et le client reste sans explication.
const DEADLINE_MS = 105_000;

// Aucun appel isole ne doit pouvoir manger tout le budget.
const FETCH_TIMEOUT_MS = 40_000;

const DEFAULT_DOCUMENTS = [
  "CV",
  "Lettre de motivation",
  "Releves de notes",
  "Piece d'identite",
  "Lettre de recommandation",
];

function todayIn(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(new Date());
  }
}

/* ------------------------------------------------------------------ */
/* Declarations d'outils                                               */
/* ------------------------------------------------------------------ */
/* Le schema Gemini attend des types en majuscules et n'accepte pas    */
/* `additionalProperties`.                                             */

const FUNCTION_DECLARATIONS = [
  {
    name: "list_schools",
    description:
      "Liste les dossiers d'ecole de l'utilisateur avec leur statut, leur deadline et leur checklist de documents. A appeler avant toute modification, pour connaitre les identifiants.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "add_school",
    description:
      "Ajoute un dossier d'ecole. Si `documents` est omis, une checklist standard est creee. N'invente jamais une deadline : laisse le champ vide si tu ne l'as pas verifiee sur une source.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Nom de l'ecole" },
        program: { type: "STRING", description: "Intitule du programme" },
        city: { type: "STRING" },
        url: { type: "STRING", description: "Lien vers la page de candidature" },
        deadline: { type: "STRING", description: "Date limite au format YYYY-MM-DD" },
        priority: {
          type: "INTEGER",
          description: "1 = ecole de reve, 2 = cible, 3 = securite",
        },
        notes: { type: "STRING", description: "Frais, prerequis, infos utiles" },
        documents: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Documents exiges par cette ecole",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "update_school",
    description: "Met a jour un dossier existant. Ne renseigne que les champs a changer.",
    parameters: {
      type: "OBJECT",
      properties: {
        school_id: { type: "STRING" },
        name: { type: "STRING" },
        program: { type: "STRING" },
        city: { type: "STRING" },
        url: { type: "STRING" },
        deadline: { type: "STRING" },
        priority: { type: "INTEGER" },
        notes: { type: "STRING" },
        status: {
          type: "STRING",
          enum: ["a_preparer", "envoye", "en_attente", "accepte", "refuse"],
        },
      },
      required: ["school_id"],
    },
  },
  {
    name: "set_document",
    description:
      "Ajoute un document a la checklist d'une ecole, ou marque un document existant comme fait ou a faire.",
    parameters: {
      type: "OBJECT",
      properties: {
        school_id: { type: "STRING" },
        label: { type: "STRING", description: "Intitule du document" },
        done: { type: "BOOLEAN" },
      },
      required: ["school_id", "label"],
    },
  },
  {
    name: "append_school_note",
    description:
      "Ajoute du texte aux notes d'un dossier, sans ecraser l'existant. Utile pour y deposer un brouillon de lettre ou des points a preparer.",
    parameters: {
      type: "OBJECT",
      properties: {
        school_id: { type: "STRING" },
        text: { type: "STRING" },
      },
      required: ["school_id", "text"],
    },
  },
  {
    name: "list_today",
    description:
      "Ce qu'il reste a cocher aujourd'hui : matieres, seance de Kung Fu, check-ins business et ecoles, habitudes.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "list_subjects",
    description: "Liste les matieres suivies par l'utilisateur, avec leur identifiant.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "list_habits",
    description:
      "Liste les habitudes personnelles suivies par l'utilisateur (hors matieres et domaines).",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "add_habit",
    description:
      "Cree une habitude personnelle a suivre chaque jour ou X fois par semaine. Choisis un emoji parlant.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Ex : Boire 2 L d'eau" },
        emoji: { type: "STRING", description: "Un seul emoji" },
        frequency: {
          type: "STRING",
          enum: ["daily", "weekly"],
          description: "daily = tous les jours, weekly = X fois par semaine",
        },
        target_per_week: {
          type: "INTEGER",
          description: "Nombre de fois par semaine si frequency vaut weekly (1 a 7)",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "add_subject",
    description:
      "Ajoute une matiere au suivi quotidien des cours. Choisis un emoji qui evoque la matiere.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Ex : Algorithmique" },
        emoji: { type: "STRING", description: "Un seul emoji" },
        teacher: { type: "STRING", description: "Nom de l'enseignant, si connu" },
      },
      required: ["name"],
    },
  },
  {
    name: "check_off",
    description:
      "Coche quelque chose pour une date donnee (aujourd'hui par defaut) : une matiere revisee, une habitude tenue, une seance de Kung Fu, ou un check-in business / ecoles. Pour une matiere ou une habitude, donne son identifiant obtenu via list_subjects ou list_habits.",
    parameters: {
      type: "OBJECT",
      properties: {
        kind: {
          type: "STRING",
          enum: ["subject", "habit", "workout", "business", "schools"],
        },
        id: { type: "STRING", description: "Identifiant de la matiere ou de l'habitude" },
        date: { type: "STRING", description: "Date au format YYYY-MM-DD, defaut aujourd'hui" },
        duration_min: {
          type: "INTEGER",
          description: "Duree en minutes, uniquement pour une seance de Kung Fu",
        },
      },
      required: ["kind"],
    },
  },
];

type ToolInput = Record<string, unknown>;

async function runTool(
  db: SupabaseClient,
  userId: string,
  today: string,
  name: string,
  input: ToolInput,
): Promise<unknown> {
  switch (name) {
    case "list_schools": {
      const { data, error } = await db
        .from("schools")
        .select(
          "id, name, program, city, url, deadline, status, priority, notes, school_documents(id, label, done)",
        )
        .order("deadline", { nullsFirst: false });
      if (error) throw error;
      return { today, schools: data ?? [] };
    }

    case "add_school": {
      const { data, error } = await db
        .from("schools")
        .insert({
          user_id: userId,
          name: input.name,
          program: input.program ?? null,
          city: input.city ?? null,
          url: input.url ?? null,
          deadline: input.deadline ?? null,
          priority: input.priority ?? 2,
          notes: input.notes ?? null,
        })
        .select("id, name")
        .single();
      if (error) throw error;

      const labels =
        Array.isArray(input.documents) && input.documents.length
          ? (input.documents as string[])
          : DEFAULT_DOCUMENTS;

      await db.from("school_documents").insert(
        labels.map((label, i) => ({
          user_id: userId,
          school_id: data.id,
          label,
          sort_order: i,
        })),
      );

      return { created: data, documents: labels };
    }

    case "update_school": {
      const patch: Record<string, unknown> = {};
      for (const key of [
        "name",
        "program",
        "city",
        "url",
        "deadline",
        "priority",
        "notes",
        "status",
      ]) {
        if (input[key] !== undefined) patch[key] = input[key];
      }
      const { data, error } = await db
        .from("schools")
        .update(patch)
        .eq("id", input.school_id)
        .select("id, name, status, deadline")
        .single();
      if (error) throw error;
      return { updated: data };
    }

    case "set_document": {
      const { data: existing } = await db
        .from("school_documents")
        .select("id")
        .eq("school_id", input.school_id)
        .eq("label", input.label)
        .maybeSingle();

      if (existing) {
        const { error } = await db
          .from("school_documents")
          .update({ done: input.done ?? false })
          .eq("id", existing.id);
        if (error) throw error;
        return { updated: input.label, done: input.done ?? false };
      }

      const { error } = await db.from("school_documents").insert({
        user_id: userId,
        school_id: input.school_id,
        label: input.label,
        done: input.done ?? false,
        sort_order: 99,
      });
      if (error) throw error;
      return { created: input.label, done: input.done ?? false };
    }

    case "append_school_note": {
      const { data: school, error: readError } = await db
        .from("schools")
        .select("notes")
        .eq("id", input.school_id)
        .single();
      if (readError) throw readError;

      const merged = [school?.notes, input.text].filter(Boolean).join("\n\n");
      const { error } = await db
        .from("schools")
        .update({ notes: merged })
        .eq("id", input.school_id);
      if (error) throw error;
      return { ok: true, length: merged.length };
    }

    case "list_today": {
      const [subjects, subjectLogs, habits, habitLogs, workouts, checkins] =
        await Promise.all([
          db.from("subjects").select("id, name, emoji").eq("archived", false),
          db.from("subject_logs").select("subject_id").eq("log_date", today).eq("done", true),
          db.from("habits").select("id, name, emoji").eq("archived", false),
          db.from("habit_logs").select("habit_id").eq("log_date", today).eq("done", true),
          db.from("workouts").select("id").eq("session_date", today).limit(1),
          db.from("domain_checkins").select("domain").eq("log_date", today).eq("done", true),
        ]);

      const doneSubjects = new Set((subjectLogs.data ?? []).map((l) => l.subject_id));
      const doneHabits = new Set((habitLogs.data ?? []).map((l) => l.habit_id));
      const doneDomains = new Set((checkins.data ?? []).map((c) => c.domain));

      return {
        date: today,
        remaining: [
          ...(subjects.data ?? [])
            .filter((s) => !doneSubjects.has(s.id))
            .map((s) => `${s.emoji} ${s.name} (cours)`),
          ...((workouts.data ?? []).length === 0 ? ["🥋 Seance de Kung Fu"] : []),
          ...(!doneDomains.has("business") ? ["💼 Avancer le business"] : []),
          ...(!doneDomains.has("schools") ? ["🎓 Avancer un dossier ecole"] : []),
          ...(habits.data ?? [])
            .filter((h) => !doneHabits.has(h.id))
            .map((h) => `${h.emoji} ${h.name}`),
        ],
      };
    }

    case "list_subjects": {
      const { data, error } = await db
        .from("subjects")
        .select("id, name, emoji, teacher")
        .eq("archived", false)
        .order("sort_order");
      if (error) throw error;
      return { subjects: data ?? [] };
    }

    case "list_habits": {
      const { data, error } = await db
        .from("habits")
        .select("id, name, emoji, frequency, target_per_week")
        .eq("archived", false)
        .order("sort_order");
      if (error) throw error;
      return { habits: data ?? [] };
    }

    case "add_habit": {
      const frequency = input.frequency === "weekly" ? "weekly" : "daily";
      const { data, error } = await db
        .from("habits")
        .insert({
          user_id: userId,
          name: input.name,
          emoji: (input.emoji as string) || "\u2728",
          frequency,
          target_per_week:
            frequency === "daily"
              ? 7
              : Math.min(7, Math.max(1, Number(input.target_per_week ?? 3))),
        })
        .select("id, name, emoji, frequency, target_per_week")
        .single();
      if (error) throw error;
      return { created: data };
    }

    case "add_subject": {
      const { data, error } = await db
        .from("subjects")
        .insert({
          user_id: userId,
          name: input.name,
          emoji: (input.emoji as string) || "\ud83d\udcd8",
          teacher: (input.teacher as string) || null,
        })
        .select("id, name, emoji, teacher")
        .single();
      if (error) throw error;
      return { created: data };
    }

    case "check_off": {
      const date = (input.date as string) || today;
      const kind = input.kind as string;

      if (kind === "subject") {
        if (!input.id) throw new Error("Identifiant de matiere manquant.");
        const { error } = await db
          .from("subject_logs")
          .upsert(
            { user_id: userId, subject_id: input.id, log_date: date, done: true },
            { onConflict: "subject_id,log_date" },
          );
        if (error) throw error;
        return { checked: "subject", id: input.id, date };
      }

      if (kind === "habit") {
        if (!input.id) throw new Error("Identifiant d'habitude manquant.");
        const { error } = await db
          .from("habit_logs")
          .upsert(
            { user_id: userId, habit_id: input.id, log_date: date, done: true },
            { onConflict: "habit_id,log_date" },
          );
        if (error) throw error;
        return { checked: "habit", id: input.id, date };
      }

      if (kind === "workout") {
        const { data: existing } = await db
          .from("workouts")
          .select("id")
          .eq("session_date", date)
          .limit(1)
          .maybeSingle();
        if (existing) return { already: "workout", date };

        const { data, error } = await db
          .from("workouts")
          .insert({
            user_id: userId,
            session_date: date,
            duration_min: Number(input.duration_min ?? 30),
            focus: "Seance enregistree par l'assistant",
            intensity: 3,
          })
          .select("id")
          .single();
        if (error) throw error;
        return { checked: "workout", id: data.id, date };
      }

      if (kind === "business" || kind === "schools") {
        const { error } = await db
          .from("domain_checkins")
          .upsert(
            { user_id: userId, domain: kind, log_date: date, done: true },
            { onConflict: "user_id,domain,log_date" },
          );
        if (error) throw error;
        return { checked: kind, date };
      }

      throw new Error(`Type inconnu : ${kind}`);
    }

    default:
      throw new Error(`Outil inconnu : ${name}`);
  }
}

/* ------------------------------------------------------------------ */

function systemPrompt(today: string, displayName: string): string {
  return `Tu es l'assistant de Trackz, l'application personnelle de ${displayName}.

CONTEXTE
${displayName} est en 6e semestre et mene quatre choses de front :
- un business freelance (clients, projets, factures) ;
- des candidatures a des ecoles (deadlines, dossiers, documents) ;
- ses cours, qu'il coche chaque jour ;
- un entrainement de Kung Fu Shaolin a la maison.

Nous sommes le ${today}.

TON ROLE
Tu l'aides sur deux fronts.
1. Les ecoles : trouver des formations qui correspondent, les comparer, les
   trier par deadline, et preparer les documents demandes.
2. Son suivi quotidien : tu peux creer des matieres et des habitudes, et
   cocher a sa place ce qu'il te dit avoir fait.

REGLES
- Reponds en francais, sur un ton direct et concret. L'app est lue sur un
  telephone : va a l'essentiel, pas de listes interminables.
- Utilise la recherche Google pour tout ce qui touche aux ecoles :
  programmes, dates limites, frais, prerequis. Ne te fie jamais a ta
  memoire pour une date limite ou un montant.
- N'invente jamais une deadline. Si tu ne l'as pas vue sur une source,
  laisse le champ vide et dis-le.
- Cite tes sources quand tu proposes une ecole.
- Avant d'ajouter plusieurs ecoles d'un coup, montre la liste et demande
  confirmation. Une seule ecole clairement demandee, tu peux l'ajouter
  directement.
- Quand tu rediges un document (lettre de motivation, CV), ecris-le dans la
  conversation. Ne le deposes dans les notes du dossier que s'il te le
  demande.
- Pour cocher ou modifier une matiere ou une habitude, recupere d'abord son
  identifiant avec list_subjects ou list_habits. N'invente jamais un
  identifiant.
- Quand il dit avoir fait quelque chose ("j'ai revise les maths", "seance
  faite"), coche-le sans lui redemander confirmation.
- Tu ne sais rien de sa vie en dehors de ce que contient l'app : ne suppose
  ni ses notes, ni son budget, ni son parcours. Demande.`;
}

/* ------------------------------------------------------------------ */
/* Appel Gemini                                                        */
/* ------------------------------------------------------------------ */

interface GeminiPart {
  text?: string;
  functionCall?: { id?: string; name: string; args?: Record<string, unknown> };
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> };
  thoughtSignature?: string;
  [key: string]: unknown;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
}

async function callGemini(
  model: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: GeminiResponse }> {
  const res = await fetch(`${BASE}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json()) as GeminiResponse;
  return { ok: res.ok, status: res.status, data };
}

/** Modeles disponibles pour cette cle, si le modele configure n'existe pas. */
async function pickFallbackModel(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/models`, {
      headers: { "x-goog-api-key": GEMINI_API_KEY },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    };
    const usable = (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => (m.name ?? "").replace(/^models\//, ""))
      .filter(Boolean);

    // On privilegie un Flash recent : c'est celui du palier gratuit.
    return (
      usable.find((n) => /^gemini-3.*flash/.test(n) && !n.includes("lite")) ??
      usable.find((n) => /^gemini-3/.test(n)) ??
      usable.find((n) => /flash/.test(n)) ??
      null
    );
  } catch {
    return null;
  }
}

/**
 * Envoie la requete, en degradant proprement si l'API refuse une option.
 * L'objectif : ne jamais tomber en panne totale a cause d'un champ que
 * cette version de l'API ne connait pas.
 */
async function generate(
  model: string,
  contents: GeminiContent[],
  system: string,
): Promise<{ data: GeminiResponse; model: string; searchEnabled: boolean }> {
  const base = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
  };

  const withSearch = {
    ...base,
    tools: [{ googleSearch: {} }, { functionDeclarations: FUNCTION_DECLARATIONS }],
    // Necessaire pour que le contexte des outils integres circule jusqu'aux
    // outils maison dans le meme echange.
    toolConfig: { includeServerSideToolInvocations: true },
  };

  let current = model;
  let attempt = await callGemini(current, withSearch);

  // Modele introuvable : on demande a la cle ce qu'elle sait faire.
  if (!attempt.ok && attempt.status === 404) {
    const fallback = await pickFallbackModel();
    if (fallback && fallback !== current) {
      current = fallback;
      attempt = await callGemini(current, withSearch);
    }
  }

  if (attempt.ok) return { data: attempt.data, model: current, searchEnabled: true };

  // Champ inconnu : on retire le drapeau de circulation, puis la recherche.
  const withoutToolConfig = { ...withSearch };
  delete (withoutToolConfig as Record<string, unknown>).toolConfig;
  attempt = await callGemini(current, withoutToolConfig);
  if (attempt.ok) return { data: attempt.data, model: current, searchEnabled: true };

  const withoutSearch = {
    ...base,
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
  };
  attempt = await callGemini(current, withoutSearch);
  if (attempt.ok) return { data: attempt.data, model: current, searchEnabled: false };

  throw new Error(
    attempt.data.error?.message ??
      `Gemini a repondu ${attempt.status} sans detail exploitable.`,
  );
}

/** Lignes de sources issues du grounding, si le modele ne cite pas lui-meme. */
function groundingSources(response: GeminiResponse): string {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const links = chunks
    .map((c) => c.web)
    .filter((w): w is { uri?: string; title?: string } => Boolean(w?.uri))
    .slice(0, 5)
    .map((w) => `- [${w.title ?? w.uri}](${w.uri})`);

  return links.length ? `\n\nSources :\n${links.join("\n")}` : "";
}

/**
 * Repare un historique laisse a moitie ecrit.
 *
 * Si le worker est tue au milieu d'un tour — ce que fait la plateforme au
 * bout de 150 s — le fil garde un appel d'outil dont la reponse du modele
 * n'est jamais arrivee. Les messages suivants s'empilent par-dessus, et
 * l'echange casse se retrouve enterre au milieu du fil : Gemini refuse
 * alors tout l'historique, et le fil devient definitivement inutilisable.
 *
 * On balaye donc l'ensemble et on retire les echanges d'outils avortes,
 * ou qu'ils se trouvent. Le message utilisateur qui les avait declenches
 * est conserve : la demande reste visible et l'assistant peut la reprendre.
 */
function repairHistory(contents: GeminiContent[]): GeminiContent[] {
  const isToolResult = (c?: GeminiContent) =>
    !!c && c.role === "user" && c.parts.length > 0 && c.parts.every((p) => p.functionResponse);
  const isToolCall = (c?: GeminiContent) =>
    !!c && c.role === "model" && c.parts.some((p) => p.functionCall);

  const keep = new Array<boolean>(contents.length).fill(true);

  for (let i = 0; i < contents.length; i++) {
    if (isToolCall(contents[i])) {
      // Un appel d'outil doit etre suivi de son resultat, lui-meme suivi
      // d'un tour du modele. Sinon l'echange n'a jamais abouti.
      if (!isToolResult(contents[i + 1])) {
        keep[i] = false;
        continue;
      }
      const after = contents[i + 2];
      if (!after || after.role !== "model") {
        keep[i] = false;
        keep[i + 1] = false;
      }
    } else if (isToolResult(contents[i]) && !isToolCall(contents[i - 1])) {
      // Resultat orphelin : son appel a disparu.
      keep[i] = false;
    }
  }

  const out = contents.filter((_, i) => keep[i]);

  // Gemini exige que la conversation commence par l'utilisateur.
  while (out.length > 0 && out[0].role !== "user") out.shift();

  return out;
}

/* ------------------------------------------------------------------ */

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "GEMINI_API_KEY manquante. Ajoute-la dans les secrets de l'Edge Function (cle obtenue sur aistudio.google.com/apikey).",
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const db = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await db.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const user = userData.user;

  let body: { message?: string; thread_id?: string; tz?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "corps de requete invalide" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return new Response(JSON.stringify({ error: "message vide" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const today = todayIn(body.tz ?? "UTC");
  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "l'utilisateur";

  // ----- Fil de conversation ------------------------------------------
  let threadId = body.thread_id ?? null;
  if (!threadId) {
    const { data, error } = await db
      .from("assistant_threads")
      .insert({ user_id: user.id, title: message.slice(0, 60) })
      .select("id")
      .single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
    threadId = data.id;
  }

  const { data: history } = await db
    .from("assistant_messages")
    .select("role, text, blocks")
    .eq("thread_id", threadId)
    .order("created_at")
    .limit(120);

  /**
   * Les `parts` sont rejouees telles quelles : Gemini 3 attache une
   * `thoughtSignature` a ses appels d'outils et attend de la retrouver
   * dans l'historique. La reecrire casserait la chaine d'outils.
   */
  const rawContents: GeminiContent[] = (history ?? [])
    .map((row) => {
      const parts = Array.isArray(row.blocks) ? (row.blocks as GeminiPart[]) : null;
      const usable =
        parts && parts.every((p) => p && typeof p === "object" && !("type" in p))
          ? parts
          : row.text
            ? [{ text: row.text }]
            : null;
      if (!usable) return null;
      return { role: row.role === "assistant" ? "model" : "user", parts: usable };
    })
    .filter((c): c is GeminiContent => c !== null);

  const contents = repairHistory(rawContents);
  contents.push({ role: "user", parts: [{ text: message }] });

  await db.from("assistant_messages").insert({
    user_id: user.id,
    thread_id: threadId,
    role: "user",
    text: message,
    blocks: [{ text: message }],
  });

  // ----- Boucle d'outils ----------------------------------------------
  let reply = "";
  let usedModel = CONFIGURED_MODEL;
  let searchEnabled = true;
  let truncated = false;
  const startedAt = Date.now();

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      if (Date.now() - startedAt > DEADLINE_MS) {
        truncated = true;
        break;
      }
      const result = await generate(usedModel, contents, systemPrompt(today, displayName));
      usedModel = result.model;
      searchEnabled = result.searchEnabled;

      const candidate = result.data.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];

      if (parts.length === 0) {
        const blocked =
          result.data.promptFeedback?.blockReason ?? candidate?.finishReason ?? "";
        reply =
          reply ||
          (blocked
            ? `Je n'ai pas pu repondre (${blocked}).`
            : "Je n'ai pas de reponse a afficher pour ce tour.");
        break;
      }

      contents.push({ role: "model", parts });

      const text = parts
        .map((p) => p.text ?? "")
        .join("\n")
        .trim();

      await db.from("assistant_messages").insert({
        user_id: user.id,
        thread_id: threadId,
        role: "assistant",
        text,
        blocks: parts,
        hidden: text.length === 0,
      });

      if (text) {
        // On n'ajoute les sources que si le modele n'a pas deja mis de lien.
        reply = text.includes("http") ? text : text + groundingSources(result.data);
      }

      const calls = parts.filter((p) => p.functionCall);
      if (calls.length === 0) break;

      const responses: GeminiPart[] = [];
      for (const part of calls) {
        const call = part.functionCall!;
        try {
          const output = await runTool(
            db,
            user.id,
            today,
            call.name,
            (call.args ?? {}) as ToolInput,
          );
          responses.push({
            functionResponse: {
              ...(call.id ? { id: call.id } : {}),
              name: call.name,
              response: { result: output },
            },
          });
        } catch (err) {
          responses.push({
            functionResponse: {
              ...(call.id ? { id: call.id } : {}),
              name: call.name,
              response: { error: err instanceof Error ? err.message : String(err) },
            },
          });
        }
      }

      contents.push({ role: "user", parts: responses });
      await db.from("assistant_messages").insert({
        user_id: user.id,
        thread_id: threadId,
        role: "user",
        text: "",
        blocks: responses,
        hidden: true,
      });
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: detail, thread_id: threadId }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  if (truncated) {
    reply =
      (reply ? reply + "\n\n" : "") +
      "J'ai du m'arreter avant d'avoir fini — la recherche prenait trop de temps. Redemande-moi en decoupant en deux, ou precise l'ecole qui t'interesse.";
  }

  return new Response(
    JSON.stringify({
      thread_id: threadId,
      reply: reply || "Je n'ai pas de reponse a afficher pour ce tour.",
      model: usedModel,
      search: searchEnabled,
      truncated,
    }),
    { headers: { "content-type": "application/json" } },
  );
});
