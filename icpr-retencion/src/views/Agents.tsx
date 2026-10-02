import { useEffect, useRef, useState } from "react";
import { AGENT_LIST, AGENTS } from "../domain/agents";
import { askAgent, type AgentReply, type ChatTurn } from "../domain/agentClient";
import { AREA_LABEL } from "../domain/rhi";
import type { AgentId } from "../domain/types";
import { go, type Location } from "../router";
import { useStore } from "../state/store";
import { Icon } from "../components/Icon";

interface Msg extends ChatTurn {
  meta?: AgentReply["source"];
  alert?: boolean;
}

const SOURCE_LABEL: Record<AgentReply["source"], string> = {
  gemini: "Gemini",
  "sin-conexion": "Modo sin conexión (respuestas guía)",
  "frontera-humana": "Frontera humana: respuesta fija, sin IA",
};

export function Agents({ loc }: { loc: Location }) {
  const { state, rhi, dispatch, student } = useStore();
  const agentId = (loc.params.get("a") as AgentId) || "bienvenida";
  const studentId = loc.params.get("e") ?? "";
  const agent = AGENTS[agentId] ?? AGENTS.bienvenida;
  const s = student(studentId);
  const [log, setLog] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setLog([]), [agentId, studentId]);
  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [log]);

  const setParams = (a: string, e: string) => go("agentes", e ? { a, e } : { a });

  const context = s
    ? (() => {
        const r = rhi.get(s.id)!;
        return `Nombre: ${s.name.split(" ")[0]}. Programa: ${s.program}, recinto ${s.campus}. Semana ${s.weekOfTerm}. ` +
          `Área de riesgo principal: ${r.primaryArea ? AREA_LABEL[r.primaryArea] : "ninguna"}. ` +
          `Señales: ${r.factors.slice(0, 3).map((f) => f.reason).join("; ") || "ninguna"}.`;
      })()
    : "";

  async function send() {
    const t = text.trim();
    if (!t || busy) return;
    const history: Msg[] = [...log, { role: "user", text: t }];
    setLog(history);
    setText("");
    setBusy(true);
    const reply = await askAgent(agent.id, history.map(({ role, text }) => ({ role, text })), context);
    const alert = reply.safety !== "ninguno";
    if (alert && s) dispatch({ type: "escalate", studentId: s.id, reason: reply.safety === "crisis" ? "señal de crisis en conversación" : "malestar expresado en conversación" });
    setLog([...history, { role: "agent", text: reply.text, meta: reply.source, alert }]);
    setBusy(false);
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Agentes de IA</h1>
          <p>
            Seis agentes que escalan el contacto humano, nunca lo reemplazan. Prueba cómo responde cada uno; si
            alguien expresa malestar o crisis, la conversación sale de la IA y se deriva a Consejería.
          </p>
        </div>
      </header>
      <div className="grid two agents-layout">
        <div className="stack">
          <label className="field">
            <span>Conversar como</span>
            <select className="select" value={studentId} onChange={(e) => setParams(agent.id, e.target.value)}>
              <option value="">Estudiante de prueba (sin datos)</option>
              {state.students.map((x) => (
                <option key={x.id} value={x.id}>{x.name} · RHI {rhi.get(x.id)!.score}</option>
              ))}
            </select>
          </label>
          <div className="agent-pick" role="group" aria-label="Agente">
            {AGENT_LIST.map((a) => (
              <button key={a.id} className="agent-card" aria-pressed={a.id === agent.id} onClick={() => setParams(a.id, studentId)}>
                <strong>{a.name}</strong>
                <span className="small muted">{a.role}</span>
              </button>
            ))}
          </div>
        </div>

        <section className="card chat">
          <div className="card-head">
            <div>
              <h2>{agent.name}</h2>
              <p className="small muted">Evidencia: {agent.evidence}</p>
            </div>
            {s && <span className="badge plain tone-neutral">{s.name}</span>}
          </div>
          <div className="chat-log" aria-live="polite">
            {log.length === 0 && (
              <div className="msg agent">
                {agent.id === "acompana"
                  ? "Acompaña solo escucha y conecta con Consejería. No da consejos clínicos."
                  : `Escribe como si fueras ${s ? s.name.split(" ")[0] : "un estudiante"}. Ej.: “${examplePrompt(agent.id)}”`}
              </div>
            )}
            {log.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div className={`msg ${m.role} ${m.alert ? "alert" : ""}`}>
                  {m.alert && <strong style={{ display: "flex", gap: 6, alignItems: "center" }}><Icon name="alert" size={14} /> Derivado a Consejería</strong>}
                  {m.text}
                </div>
                {m.meta && <span className="msg-meta">{SOURCE_LABEL[m.meta]}</span>}
              </div>
            ))}
            {busy && <div className="msg agent muted">Escribiendo…</div>}
            <div ref={endRef} />
          </div>
          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe un mensaje…" aria-label="Mensaje" maxLength={2000} />
            <button className="btn primary" disabled={busy || !text.trim()}><Icon name="send" size={16} /> Enviar</button>
          </form>
        </section>
      </div>
    </>
  );
}

function examplePrompt(id: AgentId): string {
  switch (id) {
    case "bienvenida": return "No conozco a nadie en mi grupo";
    case "mentor": return "Tengo tres tareas atrasadas y no sé por dónde empezar";
    case "enlace": return "No sé cómo renovar la FAFSA";
    case "pulso": return "No he podido entrar, he estado ocupado";
    case "seguimiento": return "Estoy pensando en darme de baja";
    case "acompana": return "";
  }
}
