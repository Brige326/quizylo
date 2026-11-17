import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Quizylo — Generation de contenus pedagogiques (quiz, fiche, flashcards, resume, examen).
// Anthropic / Claude Haiku 5.5. Lit ANTHROPIC_API_KEY. configured:false si absente (jamais de faux contenu).

const MODEL = "claude-haiku-5-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

type Kind = "quiz" | "fiche" | "flashcards" | "resume" | "examen";

const KIND_SPEC: Record<Kind, { count: number; schema: string; guide: string }> = {
  quiz: {
    count: 8,
    schema: '{"questions":[{"q":"string","choices":["string","string","string","string"],"answer":0,"explanation":"string"}]}',
    guide: "Cree un quiz a choix multiples. Chaque question a 4 choix, un seul correct (answer = index 0-3) et une courte explication.",
  },
  examen: {
    count: 15,
    schema: '{"questions":[{"q":"string","choices":["string","string","string","string"],"answer":0,"explanation":"string"}]}',
    guide: "Cree un examen blanc a choix multiples, plus complet et progressif. Chaque question a 4 choix, un seul correct (answer = index 0-3) et une explication.",
  },
  flashcards: {
    count: 10,
    schema: '{"cards":[{"front":"string","back":"string"}]}',
    guide: "Cree des flashcards : recto une notion/question courte, verso la reponse/definition claire.",
  },
  fiche: {
    count: 0,
    schema: '{"sections":[{"heading":"string","points":["string"]}]}',
    guide: "Cree une fiche de revision structuree en sections, chacune avec un titre et des points cles concis.",
  },
  resume: {
    count: 0,
    schema: '{"text":"string"}',
    guide: "Cree un resume clair et synthetique du sujet, en quelques paragraphes.",
  },
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { kind?: string; context?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const kind = body.kind as Kind;
  if (!kind || !(kind in KIND_SPEC)) return json({ error: "Invalid kind" }, 400);
  const context = (body.context ?? "").toString().slice(0, 12000).trim();
  if (!context) return json({ error: "Missing context" }, 400);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ configured: false });

  const spec = KIND_SPEC[kind];

  const system =
    "Tu es Quizylo, un generateur de supports de revision pour etudiants francophones. " +
    "Tu reponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises de code. " +
    "Tout le contenu (questions, reponses, titres) est en francais.";

  const count = spec.count ? ` Produis environ ${spec.count} elements.` : "";
  const user =
    `${spec.guide}${count}\n\n` +
    `Reponds STRICTEMENT avec ce schema JSON : ${spec.schema}\n\n` +
    `Sujet / contenu source :\n${context}`;

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
        max_tokens: 4096,
        temperature: 0.3,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Anthropic error", resp.status, detail);
      return json({ configured: true, error: "generation_failed" }, 200);
    }

    const data = await resp.json();
    const raw = extractText(data);
    const payload = extractJson(raw);
    if (!payload) return json({ configured: true, error: "parse_failed" }, 200);

    return json({ configured: true, kind, title: body.title ?? defaultTitle(kind), payload });
  } catch (e) {
    console.error("Anthropic fetch failed", e);
    return json({ configured: true, error: "unreachable" }, 200);
  }
});

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
  return { quiz: "Quiz", examen: "Examen blanc", flashcards: "Flashcards", fiche: "Fiche de revision", resume: "Resume" }[kind];
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
