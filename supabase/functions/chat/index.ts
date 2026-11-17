import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Quizylo — fonction Chat IA (Anthropic / Claude Haiku 5.5).
// Lit la cle dans le secret ANTHROPIC_API_KEY. Jamais de fausse reponse :
// si la cle manque, on le dit honnetement.

const MODEL = "claude-haiku-5-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const SYSTEM_PROMPT =
  "Tu es Quizylo, un professeur particulier pour etudiants francophones. " +
  "Tu expliques clairement, etape par etape, avec un ton encourageant et pedagogue. " +
  "Tu aides a comprendre, resumer, t'entrainer et reviser. Va a l'essentiel, " +
  "donne des exemples concrets quand c'est utile. Reponds toujours en francais.";

const NOT_CONFIGURED =
  "⚠️ L'assistant IA n'est pas encore configure. " +
  "Ajoute la cle ANTHROPIC_API_KEY dans les secrets du projet pour activer les reponses.";

type Role = "user" | "assistant";
type ChatMessage = { role: Role; content: string };

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { messages?: { role?: string; content?: string }[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Nettoyage : uniquement user/assistant, contenu non vide, et on commence par un user.
  const clean: ChatMessage[] = [];
  for (const m of Array.isArray(body.messages) ? body.messages : []) {
    const role = m?.role === "assistant" ? "assistant" : m?.role === "user" ? "user" : null;
    const content = (m?.content ?? "").toString().trim();
    if (!role || !content) continue;
    if (clean.length === 0 && role !== "user") continue; // Anthropic exige de commencer par user
    clean.push({ role, content });
  }
  if (clean.length === 0) return json({ reply: "Pose-moi ta question !", configured: true });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ reply: NOT_CONFIGURED, configured: false });

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
        system: SYSTEM_PROMPT,
        messages: clean,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Anthropic error", resp.status, detail);
      return json({ reply: errorReply(resp.status), configured: true }, 200);
    }

    const data = await resp.json();
    const reply = extractText(data) || "Je n'ai pas de reponse pour le moment.";
    return json({ reply, configured: true });
  } catch (e) {
    console.error("Anthropic fetch failed", e);
    return json({ reply: "L'assistant est injoignable pour le moment. Reessaie.", configured: true }, 200);
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

function errorReply(status: number): string {
  if (status === 401 || status === 403) {
    return "La cle IA semble invalide. Verifie ANTHROPIC_API_KEY dans les secrets.";
  }
  if (status === 429) return "Trop de demandes d'un coup. Patiente quelques secondes et reessaie.";
  if (status === 400) {
    return "Je n'ai pas pu traiter ce message. Reformule un peu, s'il te plait.";
  }
  return "L'assistant a rencontre une erreur. Reessaie dans un instant.";
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
