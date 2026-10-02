import { useMemo, useState } from "react";
import { AGENT_LIST, AGENTS } from "../domain/agents";
import { canSendNudge, fillTemplate } from "../domain/nudges";
import type { AgentId, Channel } from "../domain/types";
import type { Location } from "../router";
import { useStore } from "../state/store";
import { ago } from "../components/ui";

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Correo" },
];

export function Nudges({ loc }: { loc: Location }) {
  const { state, dispatch, rhi, student } = useStore();
  const [studentId, setStudentId] = useState(loc.params.get("e") ?? "");
  const s = student(studentId);
  const [agentId, setAgentId] = useState<AgentId>(() => (s ? rhi.get(s.id)!.suggestedAgent : "pulso"));
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [tpl, setTpl] = useState(0);
  const [draft, setDraft] = useState<string | null>(null);
  const [campaignAgent, setCampaignAgent] = useState<AgentId>("pulso");
  const now = new Date();

  const agent = AGENTS[agentId === "acompana" ? "pulso" : agentId];
  const text = draft ?? (s ? fillTemplate(agent.templates[tpl % agent.templates.length], s) : "");
  const check = s ? canSendNudge(s, state.nudges, now, state.policy) : null;

  const campaign = useMemo(() => {
    const targets = state.students.filter((x) => {
      const r = rhi.get(x.id)!;
      return r.level === "amarillo" && AGENTS[campaignAgent].areas.includes(r.primaryArea ?? "compromiso");
    });
    return targets.map((x) => ({ s: x, check: canSendNudge(x, state.nudges, now, state.policy) }));
  }, [state.students, state.nudges, state.policy, campaignAgent, rhi]);
  const eligible = campaign.filter((c) => c.check.ok);

  const p = state.policy;
  const setPolicy = (patch: Partial<typeof p>) => dispatch({ type: "setPolicy", policy: { ...p, ...patch } });

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Mensajes</h1>
          <p>
            Recordatorios breves y personales. La política anti-spam se aplica siempre: pocos mensajes, en buen
            horario, solo con consentimiento y nunca para temas de bienestar.
          </p>
        </div>
      </header>

      <div className="grid two">
        <section className="card card-pad stack">
          <h2>Enviar un mensaje</h2>
          <label className="field">
            <span>Estudiante</span>
            <select className="select" value={studentId} onChange={(e) => { setStudentId(e.target.value); setDraft(null); const r = rhi.get(e.target.value); if (r) setAgentId(r.suggestedAgent === "acompana" ? "pulso" : r.suggestedAgent); }}>
              <option value="">Elige un estudiante</option>
              {state.students.map((x) => <option key={x.id} value={x.id}>{x.name} · RHI {rhi.get(x.id)!.score}</option>)}
            </select>
          </label>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>Agente</span>
              <select className="select" value={agent.id} onChange={(e) => { setAgentId(e.target.value as AgentId); setTpl(0); setDraft(null); }}>
                {AGENT_LIST.filter((a) => a.id !== "acompana").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Canal</span>
              <select className="select" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
                {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
          </div>
          {s && (
            <>
              <div className="row">
                {agent.templates.map((_, i) => (
                  <button key={i} className={`btn sm ${i === tpl % agent.templates.length && draft === null ? "primary" : ""}`} onClick={() => { setTpl(i); setDraft(null); }}>
                    Plantilla {i + 1}
                  </button>
                ))}
              </div>
              <textarea className="textarea" value={text} onChange={(e) => setDraft(e.target.value)} aria-label="Texto del mensaje" />
              <div className="wa" aria-label="Vista previa">
                <div className="bubble">{text}</div>
                <p className="small muted" style={{ marginTop: 6 }}>{s.phone} · {CHANNELS.find((c) => c.value === channel)?.label}</p>
              </div>
              {check && !check.ok && <div className="notice warn">No se puede enviar: {check.reason}.</div>}
              <button
                className="btn primary"
                disabled={!check?.ok || !text.trim()}
                onClick={() => {
                  dispatch({ type: "sendNudge", nudge: { studentId: s.id, channel, agent: agent.id, text } });
                  setDraft(null);
                }}
              >
                Registrar envío
              </button>
              <p className="small muted">
                Demo: el envío queda registrado aquí. Conectar WhatsApp Business o Twilio requiere sus credenciales.
              </p>
            </>
          )}
        </section>

        <div className="stack">
          <section className="card card-pad stack">
            <h2>Política anti-spam</h2>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                <span>Máx. por semana</span>
                <input className="input num" type="number" min={1} max={7} value={p.maxPerWeek} onChange={(e) => setPolicy({ maxPerWeek: Number(e.target.value) || 1 })} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Horas entre mensajes</span>
                <input className="input num" type="number" min={1} max={168} value={p.minHoursBetween} onChange={(e) => setPolicy({ minHoursBetween: Number(e.target.value) || 1 })} />
              </label>
            </div>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                <span>Silencio desde</span>
                <input className="input num" type="number" min={0} max={23} value={p.quietStartHour} onChange={(e) => setPolicy({ quietStartHour: Number(e.target.value) })} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Silencio hasta</span>
                <input className="input num" type="number" min={0} max={23} value={p.quietEndHour} onChange={(e) => setPolicy({ quietEndHour: Number(e.target.value) })} />
              </label>
            </div>
          </section>

          <section className="card card-pad stack">
            <h2>Campaña para amarillos</h2>
            <label className="field">
              <span>Agente</span>
              <select className="select" value={campaignAgent} onChange={(e) => setCampaignAgent(e.target.value as AgentId)}>
                {AGENT_LIST.filter((a) => a.id !== "acompana" && a.id !== "seguimiento").map((a) => <option key={a.id} value={a.id}>{a.name} · {a.areas.length > 1 ? "varias áreas" : a.role}</option>)}
              </select>
            </label>
            <p className="small">
              {campaign.length} estudiantes en amarillo por esta área. <strong>{eligible.length}</strong> pueden recibir mensaje ahora.
            </p>
            {campaign.filter((c) => !c.check.ok).slice(0, 4).map((c) => (
              <p key={c.s.id} className="small muted">{c.s.name}: {!c.check.ok && c.check.reason}</p>
            ))}
            <button
              className="btn primary"
              disabled={!eligible.length}
              onClick={() => eligible.forEach(({ s: x }) =>
                dispatch({ type: "sendNudge", nudge: { studentId: x.id, channel: "whatsapp", agent: campaignAgent, text: fillTemplate(AGENTS[campaignAgent].templates[0], x) } }),
              )}
            >
              Enviar a {eligible.length} elegibles
            </button>
          </section>
        </div>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><h2>Historial</h2><span className="small muted">{state.nudges.length} mensajes</span></div>
        <ul className="list">
          {state.nudges.slice(0, 15).map((n) => (
            <li key={n.id}>
              <div className="grow">
                <strong>{student(n.studentId)?.name}</strong> <span className="small muted">· {AGENTS[n.agent].name} por {n.channel} · {ago(n.at)}</span>
                <p className="small muted">{n.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
