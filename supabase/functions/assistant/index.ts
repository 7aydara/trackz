import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.121.0";

/**
 * L'assistant de Trackz.
 *
 * Deploye avec `verify_jwt: true` : Supabase valide le jeton avant nous.
 * Surtout, le client Supabase utilise le JWT de l'utilisateur et non la
 * cle service role — l'assistant passe donc par la RLS comme n'importe
 * quel appel de l'app, et ne peut toucher que les donnees de son
 * proprietaire, meme si le modele se trompe de parametre.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const MODEL = "claude-opus-5";
const MAX_TOOL_ROUNDS = 8;

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
/* Outils                                                              */
/* ------------------------------------------------------------------ */

const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_schools",
    description:
      "Liste les dossiers d'ecole de l'utilisateur avec leur statut, leur deadline et leur checklist de documents. A appeler avant toute modification, pour connaitre les identifiants.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "add_school",
    description:
      "Ajoute un dossier d'ecole. Si `documents` est omis, une checklist standard est creee. N'invente jamais une deadline : laisse le champ vide si tu ne l'as pas verifiee.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nom de l'ecole" },
        program: { type: "string", description: "Intitule du programme" },
        city: { type: "string" },
        url: { type: "string", description: "Lien vers la page de candidature" },
        deadline: { type: "string", description: "Date limite au format YYYY-MM-DD" },
        priority: {
          type: "integer",
          description: "1 = ecole de reve, 2 = cible, 3 = securite",
        },
        notes: { type: "string", description: "Frais, prerequis, infos utiles" },
        documents: {
          type: "array",
          items: { type: "string" },
          description: "Documents exiges par cette ecole",
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "update_school",
    description: "Met a jour un dossier existant. Ne renseigne que les champs a changer.",
    input_schema: {
      type: "object",
      properties: {
        school_id: { type: "string" },
        name: { type: "string" },
        program: { type: "string" },
        city: { type: "string" },
        url: { type: "string" },
        deadline: { type: "string" },
        priority: { type: "integer" },
        notes: { type: "string" },
        status: {
          type: "string",
          enum: ["a_preparer", "envoye", "en_attente", "accepte", "refuse"],
        },
      },
      required: ["school_id"],
      additionalProperties: false,
    },
  },
  {
    name: "set_document",
    description:
      "Ajoute un document a la checklist d'une ecole, ou marque un document existant comme fait ou a faire.",
    input_schema: {
      type: "object",
      properties: {
        school_id: { type: "string" },
        label: { type: "string", description: "Intitule du document" },
        done: { type: "boolean" },
      },
      required: ["school_id", "label"],
      additionalProperties: false,
    },
  },
  {
    name: "append_school_note",
    description:
      "Ajoute du texte aux notes d'un dossier, sans ecraser l'existant. Utile pour y deposer un brouillon de lettre ou des points a preparer.",
    input_schema: {
      type: "object",
      properties: {
        school_id: { type: "string" },
        text: { type: "string" },
      },
      required: ["school_id", "text"],
      additionalProperties: false,
    },
  },
  {
    name: "list_today",
    description:
      "Ce qu'il reste a cocher aujourd'hui : matieres, seance de Kung Fu, check-ins business et ecoles, habitudes.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_subjects",
    description: "Liste les matieres suivies par l'utilisateur.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
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

      const labels = Array.isArray(input.documents) && input.documents.length
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
      for (const key of ["name", "program", "city", "url", "deadline", "priority", "notes", "status"]) {
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
      const [subjects, subjectLogs, habits, habitLogs, workouts, checkins] = await Promise.all([
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
Tu l'aides surtout sur les ecoles : trouver des formations qui correspondent,
les comparer, les trier par deadline, et preparer les documents demandes.
Tu peux aussi consulter et mettre a jour son suivi quotidien.

REGLES
- Reponds en francais, sur un ton direct et concret. L'app est lue sur un
  telephone : va a l'essentiel, pas de listes interminables.
- Utilise la recherche web pour tout ce qui touche aux ecoles : programmes,
  dates limites, frais, prerequis. Ne te fie jamais a ta memoire pour une
  date limite ou un montant.
- N'invente jamais une deadline. Si tu ne l'as pas vue sur une source,
  laisse le champ vide et dis-le.
- Cite tes sources quand tu proposes une ecole.
- Avant d'ajouter plusieurs ecoles d'un coup, montre la liste et demande
  confirmation. Une seule ecole clairement demandee, tu peux l'ajouter
  directement.
- Quand tu rediges un document (lettre de motivation, CV), ecris-le dans la
  conversation. Ne le deposes dans les notes du dossier que s'il te le
  demande.
- Tu ne sais rien de sa vie en dehors de ce que contient l'app : ne suppose
  ni ses notes, ni son budget, ni son parcours. Demande.`;
}

/* ------------------------------------------------------------------ */

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "ANTHROPIC_API_KEY manquante. Ajoute-la dans les secrets de l'Edge Function.",
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

  const messages: Anthropic.MessageParam[] = (history ?? []).map((row) => ({
    role: row.role as "user" | "assistant",
    content: (row.blocks as Anthropic.ContentBlockParam[] | null) ?? row.text,
  }));

  messages.push({ role: "user", content: message });

  await db.from("assistant_messages").insert({
    user_id: user.id,
    thread_id: threadId,
    role: "user",
    text: message,
    blocks: [{ type: "text", text: message }],
  });

  // ----- Boucle d'outils ----------------------------------------------
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const tools = [
    ...TOOLS,
    // Recherche web cote Anthropic : indispensable pour les ecoles.
    { type: "web_search_20260209", name: "web_search", max_uses: 6 },
  ] as Anthropic.ToolUnion[];

  let reply = "";

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 24000,
        thinking: { type: "adaptive" },
        system: systemPrompt(today, displayName),
        tools,
        messages,
      });
      const response = await stream.finalMessage();

      messages.push({ role: "assistant", content: response.content });

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      await db.from("assistant_messages").insert({
        user_id: user.id,
        thread_id: threadId,
        role: "assistant",
        text,
        blocks: response.content,
        hidden: text.length === 0,
      });

      if (text) reply = text;

      if (response.stop_reason === "refusal") {
        reply = reply || "Je prefere ne pas repondre a cette demande.";
        break;
      }

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      if (toolUses.length === 0) break;

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const call of toolUses) {
        try {
          const output = await runTool(
            db,
            user.id,
            today,
            call.name,
            call.input as ToolInput,
          );
          results.push({
            type: "tool_result",
            tool_use_id: call.id,
            content: JSON.stringify(output),
          });
        } catch (err) {
          results.push({
            type: "tool_result",
            tool_use_id: call.id,
            is_error: true,
            content: err instanceof Error ? err.message : String(err),
          });
        }
      }

      messages.push({ role: "user", content: results });
      await db.from("assistant_messages").insert({
        user_id: user.id,
        thread_id: threadId,
        role: "user",
        text: "",
        blocks: results,
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

  return new Response(
    JSON.stringify({
      thread_id: threadId,
      reply: reply || "Je n'ai pas de reponse a afficher pour ce tour.",
    }),
    { headers: { "content-type": "application/json" } },
  );
});
