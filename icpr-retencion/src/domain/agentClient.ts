import { AGENTS, offlineReply } from "./agents";
import { CRISIS_RESPONSE, detectSafety, WELLBEING_RESPONSE, type SafetyLevel } from "./safety";
import type { AgentId } from "./types";

export interface ChatTurn {
  role: "user" | "agent";
  text: string;
}

export interface AgentReply {
  text: string;
  safety: SafetyLevel;
  source: "gemini" | "sin-conexion" | "frontera-humana";
}

export const AGENT_ENDPOINT = "/.netlify/functions/agent";

/**
 * Pide respuesta a un agente. Primero aplica la frontera humana en el
 * navegador: si hay señal de crisis o malestar, nunca se llama al modelo.
 */
export async function askAgent(
  agentId: AgentId,
  history: ChatTurn[],
  context: string,
): Promise<AgentReply> {
  const last = history[history.length - 1]?.text ?? "";
  const safety = detectSafety(last);
  if (safety.level === "crisis") return { text: CRISIS_RESPONSE, safety: "crisis", source: "frontera-humana" };
  if (safety.level === "bienestar")
    return { text: WELLBEING_RESPONSE, safety: "bienestar", source: "frontera-humana" };

  try {
    const res = await fetch(AGENT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, history, context }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { text?: string; safety?: SafetyLevel };
    if (!data.text) throw new Error("vacío");
    return { text: data.text, safety: data.safety ?? "ninguno", source: "gemini" };
  } catch {
    return { text: offlineReply(agentId, last), safety: "ninguno", source: "sin-conexion" };
  }
}

export function agentName(id: AgentId): string {
  return AGENTS[id].name;
}
