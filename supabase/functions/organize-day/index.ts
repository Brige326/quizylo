import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Quizylo — Assistant d'organisation de la journee (Anthropic / Claude Haiku 5.5).
// Lit ANTHROPIC_API_KEY. Honnete : configured:false si aucune cle. Ne modifie jamais le planning (texte seulement).

const MODEL = "claude-haiku-5-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { request?: string; day?: string; events?: unknown[]; tasks?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const request = (body.request ?? "").toString().slice(0, 2000).trim();
  const day = (body.day ?? "").toString().slice(0, 40);
  const events = Array.isArray(body.events) ? body.events.slice(0, 50) : [];
  const tasks = Array.isArray(body.tasks) ? body.tasks.slice(0, 50) : [];

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ configured: false });

  const system =
    "Tu es Quizylo, un assistant d'organisation pour etudiants francophones. " +
    "On te donne les evenements et taches deja prevus pour une journee, et une demande. " +
    "Tu proposes un emploi du temps realiste et clair, en tenant compte des creneaux deja occupes, " +
    "des durees, des priorites et des conflits. Reponds en francais, de maniere concise, " +
    "sous forme d'une liste horaire (ex. '09:00-12:00 Cours'). " +
    "Tu proposes seulement : tu ne modifies rien. Termine par une courte phrase invitant l'utilisateur a ajuster.";

  const user =
    `Jour : ${day || "(non precise)"}\n` +
    `Deja prevu (evenements) : ${JSON.stringify(events)}\n` +
    `Taches a caser : ${JSON.stringify(tasks)}\n` +
    `Demande : ${request || "Organise ma journee de maniere equilibree."}`;

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
        max_tokens: 1024,
        temperature: 0.4,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Anthropic error", resp.status, detail);
      return json({ configured: true, error: "failed" }, 200);
    }
    const data = await resp.json();
    const text = extractText(data) || "Je n'ai pas de proposition pour le moment.";
    return json({ configured: true, text });
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

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
