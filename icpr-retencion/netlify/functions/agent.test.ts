import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "./agent.mts";

const post = (body: unknown) =>
  new Request("http://x/.netlify/functions/agent", { method: "POST", body: JSON.stringify(body) });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("función del agente", () => {
  it("responde a la crisis con el texto fijo y nunca llama al modelo", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubEnv("GEMINI_API_KEY", "k");
    const res = await handler(post({ agentId: "mentor", history: [{ role: "user", text: "quiero quitarme la vida" }] }));
    expect(await res.json()).toMatchObject({ safety: "crisis" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rechaza agentes desconocidos y solicitudes que no terminan en un turno del usuario", async () => {
    expect((await handler(post({ agentId: "x", history: [{ role: "user", text: "hola" }] }))).status).toBe(400);
    expect((await handler(post({ agentId: "pulso", history: [{ role: "agent", text: "hola" }] }))).status).toBe(400);
  });

  it("devuelve 503 sin clave para que el cliente use el modo sin conexión", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = await handler(post({ agentId: "pulso", history: [{ role: "user", text: "hola" }] }));
    expect(res.status).toBe(503);
  });

  it("envía las instrucciones del agente y devuelve el texto del modelo", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    const fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "¡Claro!" }] } }] })),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const res = await handler(post({ agentId: "enlace", history: [{ role: "user", text: "¿FAFSA?" }], context: "Nombre: Coral." }));
    expect(await res.json()).toEqual({ text: "¡Claro!", safety: "ninguno" });
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(":generateContent");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("k");
    expect(JSON.parse(init.body as string).systemInstruction.parts[0].text).toContain("Eres Enlace");
  });
});
