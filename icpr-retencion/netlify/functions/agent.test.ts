import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "./agent.mts";

const post = (body: unknown) =>
  new Request("http://x/.netlify/functions/agent", { method: "POST", body: JSON.stringify(body) });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("agent function", () => {
  it("answers crisis messages with the fixed response and never calls the model", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubEnv("GEMINI_API_KEY", "k");
    const res = await handler(post({ agentId: "mentor", history: [{ role: "user", text: "quiero quitarme la vida" }] }));
    expect(await res.json()).toMatchObject({ safety: "crisis" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects unknown agents and requests that do not end on a user turn", async () => {
    expect((await handler(post({ agentId: "x", history: [{ role: "user", text: "hola" }] }))).status).toBe(400);
    expect((await handler(post({ agentId: "pulso", history: [{ role: "agent", text: "hola" }] }))).status).toBe(400);
  });

  it("returns 503 without an API key so the client falls back to offline mode", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = await handler(post({ agentId: "pulso", history: [{ role: "user", text: "hola" }] }));
    expect(res.status).toBe(503);
  });

  it("sends the agent instructions and returns the model text", async () => {
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
