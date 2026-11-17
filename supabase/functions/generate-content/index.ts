import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Quizylo — Generation de supports de revision (quiz, examen, flashcards, fiche, resume).
// Anthropic / Claude Haiku 5.5, MULTIMODAL : l'IA lit directement les documents de l'eleve
// (images + PDF) recuperes dans le stockage prive, en plus de la matiere, du format,
// de la difficulte et du niveau. Honnete : configured:false sans cle, jamais de faux contenu.

const MODEL = "claude-haiku-5-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DOCS_BUCKET = "documents";

// Limites de sécurité pour la requête multimodale.
const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 24 * 1024 * 1024; // ~24 Mo (bien sous la limite de 128 Mo)

type Kind = "quiz" | "fiche" | "flashcards" | "resume" | "examen";
type Difficulty = "facile" | "moyen" | "difficile";
type Level = "college" | "lycee" | "superieur";

const KIND_SPEC: Record<Kind, { count: number; schema: string; guide: string }> = {
  quiz: {
    count: 8,
    schema:
      '{"summary":"string","questions":[{"q":"string","choices":["string","string","string","string"],"answer":0,"explanation":"string"}]}',
    guide:
      "Cree un quiz a choix multiples base STRICTEMENT sur les documents fournis. Chaque question a 4 choix, un seul correct (answer = index 0-3) et une explication pedagogique. 'summary' est un court resume explicatif de la partie concernee, a lire AVANT de commencer.",
  },
  examen: {
    count: 15,
    schema:
      '{"summary":"string","questions":[{"q":"string","choices":["string","string","string","string"],"answer":0,"explanation":"string"}]}',
    guide:
      "Cree un examen blanc a choix multiples, complet et progressif, base STRICTEMENT sur les documents fournis. Chaque question a 4 choix, un seul correct (answer = index 0-3) et une explication. 'summary' est un resume explicatif a lire avant l'examen.",
  },
  flashcards: {
    count: 10,
    schema: '{"summary":"string","cards":[{"front":"string","back":"string"}]}',
    guide:
      "Cree des flashcards basees STRICTEMENT sur les documents : recto une notion/question courte, verso la reponse/definition claire. 'summary' resume la partie concernee.",
  },
  fiche: {
    count: 0,
    schema: '{"summary":"string","sections":[{"heading":"string","points":["string"]}]}',
    guide:
      "Cree une fiche de revision structuree en sections (titre + points cles concis), basee STRICTEMENT sur les documents. 'summary' est une intro explicative courte.",
  },
  resume: {
    count: 0,
    schema: '{"text":"string"}',
    guide:
      "Cree un resume clair, synthetique et fidele du contenu des documents fournis, en plusieurs paragraphes. Mets en avant les notions essentielles.",
  },
};

const DIFF_GUIDE: Record<Difficulty, string> = {
  facile:
    "Difficulte FACILE : questions directes de rappel et de comprehension de base, formulations simples.",
  moyen:
    "Difficulte MOYENNE : application et comprehension, quelques raisonnements, distracteurs plausibles.",
  difficile:
    "Difficulte DIFFICILE : analyse, nuances, cas limites et pieges subtils ; exige une vraie maitrise.",
};

const LEVEL_GUIDE: Record<Level, string> = {
  college:
    "Niveau COLLEGE : vocabulaire simple et accessible, notions fondamentales, exemples concrets.",
  lycee:
    "Niveau LYCEE : rigueur du programme de lycee, vocabulaire precis, raisonnement structure.",
  superieur:
    "Niveau SUPERIEUR (licence a doctorat) : exigeant et approfondi, terminologie experte, nuances et esprit critique.",
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: {
    kind?: string;
    context?: string;
    title?: string;
    difficulty?: string;
    level?: string;
    subjectLabel?: string;
    attachments?: { storage_path?: string; mime?: string; name?: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const kind = body.kind as Kind;
  if (!kind || !(kind in KIND_SPEC)) return json({ error: "Invalid kind" }, 400);

  const difficulty: Difficulty = isDifficulty(body.difficulty) ? body.difficulty : "moyen";
  const level: Level = isLevel(body.level) ? body.level : "lycee";
  const subjectLabel = (body.subjectLabel ?? "").toString().slice(0, 120).trim();
  const context = (body.context ?? "").toString().slice(0, 12000).trim();
  const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, MAX_FILES) : [];

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ configured: false });

  // --- Recuperation des documents (service role, bucket prive) ---
  const docBlocks: unknown[] = [];
  let totalBytes = 0;
  let skipped = 0;

  if (attachments.length > 0) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey);
      for (const att of attachments) {
        const path = (att?.storage_path ?? "").toString();
        if (!path) continue;
        const kindOf = blockKind(att?.mime, att?.name);
        if (!kindOf) {
          skipped++;
          continue;
        }
        try {
          const { data, error } = await admin.storage.from(DOCS_BUCKET).download(path);
          if (error || !data) {
            skipped++;
            continue;
          }
          const buf = new Uint8Array(await data.arrayBuffer());
          if (totalBytes + buf.byteLength > MAX_TOTAL_BYTES) {
            skipped++;
            continue;
          }
          totalBytes += buf.byteLength;
          const b64 = toBase64(buf);
          if (kindOf.type === "image") {
            docBlocks.push({
              type: "image",
              source: { type: "base64", media_type: kindOf.mediaType, data: b64 },
            });
          } else {
            docBlocks.push({
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: b64 },
            });
          }
        } catch {
          skipped++;
        }
      }
    }
  }

  if (docBlocks.length === 0 && !context) {
    return json({ configured: true, error: "no_source" }, 200);
  }

  const spec = KIND_SPEC[kind];
  const system =
    "Tu es Quizylo, un generateur de supports de revision pour etudiants francophones, " +
    "du college au doctorat. Tu t'appuies UNIQUEMENT sur les documents et le contexte fournis : " +
    "tu n'inventes jamais de faits. Si les documents sont insuffisants, tu l'indiques dans 'summary' " +
    "et tu fais au mieux avec ce qui est donne. Tu reponds UNIQUEMENT avec un objet JSON valide, " +
    "sans texte autour, sans balises de code. Tout le contenu est en francais.";

  const countLine = spec.count ? ` Produis environ ${spec.count} elements.` : "";
  const subjectLine = subjectLabel ? `Matiere : ${subjectLabel}.\n` : "";
  const notesLine = context ? `\n\nNotes / contexte supplementaire de l'eleve :\n${context}` : "";
  const instruction =
    `${subjectLine}${spec.guide}${countLine}\n` +
    `${DIFF_GUIDE[difficulty]}\n${LEVEL_GUIDE[level]}\n\n` +
    `Reponds STRICTEMENT avec ce schema JSON : ${spec.schema}` +
    `${notesLine}`;

  // Documents d'abord, puis l'instruction (recommandation Anthropic).
  const content = [...docBlocks, { type: "text", text: instruction }];

  try {
    const resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8192,
        temperature: 0.3,
        system,
        messages: [{ role: "user", content }],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Anthropic error", resp.status, detail);
      return json({ configured: true, error: errorCode(resp.status) }, 200);
    }

    const data = await resp.json();
    const raw = extractText(data);
    const obj = extractJson(raw) as Record<string, unknown> | null;
    if (!obj) return json({ configured: true, error: "parse_failed" }, 200);

    const summary = typeof obj.summary === "string" ? obj.summary : null;
    const payload: Record<string, unknown> = { ...obj };
    delete payload.summary;

    return json({
      configured: true,
      kind,
      difficulty,
      level,
      title: body.title ?? defaultTitle(kind),
      summary,
      payload,
      meta: { files: docBlocks.length, skipped },
    });
  } catch (e) {
    console.error("Anthropic fetch failed", e);
    return json({ configured: true, error: "unreachable" }, 200);
  }
});

/* ---------- Helpers ---------- */

function isDifficulty(v: unknown): v is Difficulty {
  return v === "facile" || v === "moyen" || v === "difficile";
}
function isLevel(v: unknown): v is Level {
  return v === "college" || v === "lycee" || v === "superieur";
}

function blockKind(
  mime: string | undefined,
  name: string | undefined,
): { type: "image"; mediaType: string } | { type: "pdf" } | null {
  const m = (mime ?? "").toLowerCase();
  const n = (name ?? "").toLowerCase();
  if (m === "application/pdf" || n.endsWith(".pdf")) return { type: "pdf" };
  if (m === "image/jpeg" || m === "image/jpg" || n.endsWith(".jpg") || n.endsWith(".jpeg")) {
    return { type: "image", mediaType: "image/jpeg" };
  }
  if (m === "image/png" || n.endsWith(".png")) return { type: "image", mediaType: "image/png" };
  if (m === "image/gif" || n.endsWith(".gif")) return { type: "image", mediaType: "image/gif" };
  if (m === "image/webp" || n.endsWith(".webp")) return { type: "image", mediaType: "image/webp" };
  // HEIC et autres formats non supportes par l'API vision -> ignores.
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function extractText(data: unknown): string {
  const content = (data as { content?: { type?: string; text?: string }[] })?.content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => b?.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("")
    .trim();
}

function defaultTitle(kind: Kind): string {
  return {
    quiz: "Quiz",
    examen: "Examen blanc",
    flashcards: "Flashcards",
    fiche: "Fiche de revision",
    resume: "Resume",
  }[kind];
}

function errorCode(status: number): string {
  if (status === 401 || status === 403) return "bad_key";
  if (status === 429) return "rate_limited";
  if (status === 400) return "bad_request";
  return "generation_failed";
}

function extractJson(raw: string): unknown | null {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
