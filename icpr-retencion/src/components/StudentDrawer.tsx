import { useEffect } from "react";
import { AGENTS } from "../domain/agents";
import { AREA_LABEL } from "../domain/rhi";
import { canSendNudge } from "../domain/nudges";
import { go } from "../router";
import { useStore } from "../state/store";
import { Icon } from "./Icon";
import { ago, LevelBadge, Score } from "./ui";

export function StudentDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, dispatch, rhi, student } = useStore();
  const s = student(id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!s) return null;
  const r = rhi.get(s.id)!;
  const sig = s.signals;
  const openCase = state.cases.find((c) => c.studentId === s.id && c.status !== "cerrado");
  const nudges = state.nudges.filter((n) => n.studentId === s.id);
  const check = canSendNudge(s, state.nudges, new Date(), state.policy);
  const agent = AGENTS[r.suggestedAgent];

  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label={`Ficha de ${s.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <Score value={r.score} level={r.level} big />
          <div className="grow" style={{ flex: 1 }}>
            <h2>{s.name}</h2>
            <p className="muted small">
              {s.id} · {s.program} · {s.campus} · Cohorte {s.cohort}
            </p>
            <div className="row" style={{ marginTop: 6 }}>
              <LevelBadge level={r.level} />
              {r.primaryArea && <span className="badge plain tone-neutral">{AREA_LABEL[r.primaryArea]}</span>}
              {r.requiresHuman && <span className="badge plain tone-info">Requiere persona</span>}
            </div>
          </div>
          <button className="btn ghost" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>

        {sig.wellbeingConcern && (
          <div className="notice danger">
            Señal de bienestar: este caso lo atiende Consejería. Ningún agente de IA conversa sobre esto ni envía
            recordatorios automáticos.
          </div>
        )}

        <section className="card card-pad stack">
          <h3>Por qué tiene este índice</h3>
          {r.factors.length === 0 ? (
            <p className="muted small">Ninguna señal de riesgo activa.</p>
          ) : (
            <ul className="list" style={{ margin: "0 -20px" }}>
              {r.factors.map((f) => (
                <li key={f.reason} style={{ padding: "8px 20px" }}>
                  <span className="grow small">{f.reason}</span>
                  <span className="badge plain tone-neutral">{AREA_LABEL[f.area]}</span>
                  <span className="num small" style={{ width: 36, textAlign: "right", color: "var(--rojo)" }}>
                    −{f.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="small muted">
            Siguiente paso sugerido: <strong>{agent.name}</strong> ({agent.role.toLowerCase()})
            {r.requiresHuman ? " con un asesor humano a cargo." : "."}
          </p>
        </section>

        <div className="row">
          <button
            className="btn primary"
            disabled={!!openCase}
            onClick={() =>
              dispatch({
                type: "openCase",
                studentId: s.id,
                owner: sig.wellbeingConcern ? "Consejería" : "Asesoría académica",
              })
            }
          >
            <Icon name="folder" size={16} /> {openCase ? "Caso abierto" : "Abrir caso"}
          </button>
          <button className="btn" onClick={() => go("mensajes", { e: s.id })} disabled={!check.ok}>
            <Icon name="send" size={16} /> Enviar mensaje
          </button>
          <button
            className="btn"
            onClick={() => go("agentes", { e: s.id, a: r.suggestedAgent })}
          >
            <Icon name="chat" size={16} /> Simular conversación
          </button>
        </div>
        {!check.ok && <p className="small muted">Mensajes bloqueados: {check.reason}.</p>}

        <section className="card card-pad stack">
          <h3>Señales</h3>
          <dl className="signal-grid" style={{ margin: 0 }}>
            <div><dt>Días sin entrar al LMS</dt><dd className="num">{sig.daysSinceLogin}</dd></div>
            <div><dt>Entregas atrasadas</dt><dd className="num">{sig.lateSubmissions}</dd></div>
            <div><dt>Uso del tutor IA</dt><dd className="num">{sig.tutorUsageTrend > 0 ? "+" : ""}{Math.round(sig.tutorUsageTrend * 100)} %</dd></div>
            <div><dt>Promedio</dt><dd className="num">{sig.gpa.toFixed(2)}</dd></div>
            <div><dt>Asistencia</dt><dd className="num">{sig.attendancePct} %</dd></div>
            <div><dt>Créditos</dt><dd className="num">{sig.creditsEnrolled}</dd></div>
            <div><dt>Hold financiero</dt><dd>{sig.financialHold ? "Sí" : "No"}</dd></div>
            <div><dt>FAFSA pendiente</dt><dd>{sig.aidRefilingPending ? "Sí" : "No"}</dd></div>
            <div><dt>Trabajo semanal</dt><dd className="num">{sig.weeklyWorkHours} h</dd></div>
            <div><dt>Dependientes</dt><dd className="num">{sig.dependents}</dd></div>
            <div><dt>Viaje al recinto</dt><dd className="num">{sig.commuteMinutes} min</dd></div>
            <div><dt>Pertenencia</dt><dd className="num">{sig.belongingScore.toFixed(1)}/5</dd></div>
          </dl>
        </section>

        <section className="card card-pad stack">
          <h3>Consentimiento y contacto</h3>
          <label className="switch">
            <input
              type="checkbox"
              checked={s.consent}
              onChange={(e) => dispatch({ type: "updateStudent", studentId: s.id, patch: { consent: e.target.checked } })}
            />
            Consentimiento FERPA para contacto proactivo
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={s.contactPaused}
              onChange={(e) =>
                dispatch({ type: "updateStudent", studentId: s.id, patch: { contactPaused: e.target.checked } })
              }
            />
            El estudiante pausó los mensajes automáticos
          </label>
          <p className="small muted">Teléfono {s.phone} · {s.firstGen ? "Primera generación" : "No primera generación"} · {s.ageBand} años · Carga {s.enrollment}</p>
        </section>

        <section className="card card-pad stack">
          <h3>Historial</h3>
          {openCase && (
            <p className="small">
              Caso {openCase.status.replace("_", " ")} con {openCase.owner}, abierto {ago(openCase.openedAt)}.{" "}
              <a href={`#/casos?c=${openCase.id}`}>Ver caso</a>
            </p>
          )}
          {nudges.length === 0 ? (
            <p className="small muted">Sin mensajes enviados.</p>
          ) : (
            nudges.slice(0, 5).map((n) => (
              <p key={n.id} className="small">
                <strong>{AGENTS[n.agent].name}</strong> por {n.channel} · {ago(n.at)}
                <br />
                <span className="muted">{n.text}</span>
              </p>
            ))
          )}
        </section>
      </aside>
    </div>
  );
}
