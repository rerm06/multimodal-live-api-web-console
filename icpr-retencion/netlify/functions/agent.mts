import { AGENTS } from "../../src/domain/agents";
import { CRISIS_RESPONSE, detectSafety, WELLBEING_RESPONSE } from "../../src/domain/safety";
import type { AgentId } from "../../src/domain/types";

/**
 * Proxy de los agentes hacia Gemini. La clave vive solo en el servidor
 * (variable GEMINI_API_KEY en Netlify); el navegador nunca la ve.
 */

interface Body {
  agentId: AgentId;
  history: { role: "user" | "agent"; text: string }[];
  context?: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const agent = AGENTS[body.agentId];
  const history = (body.history ?? []).slice(-12);
  const last = history[history.length - 1];
  if (!agent || !last || last.role !== "user" || last.text.length > 2000)
    return json({ error: "Solicitud inválida" }, 400);

  // Frontera humana, también en el servidor.
  const safety = detectSafety(last.text);
  if (safety.level === "crisis") return json({ text: CRISIS_RESPONSE, safety: "crisis" });
  if (safety.level === "bienestar") return json({ text: WELLBEING_RESPONSE, safety: "bienestar" });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: "GEMINI_API_KEY no está configurada" }, 503);

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const system = `${agent.instructions}\n\nContexto del estudiante (no lo repitas literalmente): ${(body.context ?? "sin contexto").slice(0, 800)}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: history.map((t) => ({ role: t.role === "user" ? "user" : "model", parts: [{ text: t.text }] })),
        generationConfig: { temperature: 0.5, maxOutputTokens: 400 },
      }),
    },
  );
  if (!res.ok) return json({ error: `Gemini respondió ${res.status}` }, 502);

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) return json({ error: "Respuesta vacía" }, 502);
  return json({ text, safety: "ninguno" });
};
