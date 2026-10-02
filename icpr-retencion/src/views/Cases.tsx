import { useState } from "react";
import { AREA_LABEL } from "../domain/rhi";
import type { CaseOutcome, CaseStatus, RetentionCase } from "../domain/types";
import { go, type Location } from "../router";
import { useStore } from "../state/store";
import { Icon } from "../components/Icon";
import { ago, Kpi, LevelBadge } from "../components/ui";

const COLUMNS: { status: CaseStatus; label: string }[] = [
  { status: "abierto", label: "Sin contactar" },
  { status: "en_progreso", label: "En seguimiento" },
  { status: "escalado", label: "Escalado a persona" },
  { status: "cerrado", label: "Cerrado" },
];

const OUTCOMES: { value: CaseOutcome; label: string }[] = [
  { value: "retenido", label: "Retenido: sigue matriculado" },
  { value: "derivado", label: "Derivado a otra oficina" },
  { value: "baja", label: "Se dio de baja" },
  { value: "sin_respuesta", label: "Sin respuesta tras 3 intentos" },
];

export function Cases({ loc, onOpen }: { loc: Location; onOpen: (id: string) => void }) {
  const { state } = useStore();
  const selected = loc.params.get("c");
  const closed = state.cases.filter((c) => c.status === "cerrado");
  const contacted = state.cases.filter((c) => c.firstContactAt);
  const avgHours =
    contacted.reduce((a, c) => a + (new Date(c.firstContactAt!).getTime() - new Date(c.openedAt).getTime()), 0) /
    Math.max(1, contacted.length) /
    3_600_000;
  const retained = closed.filter((c) => c.outcome === "retenido").length;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Casos</h1>
          <p>Gestión de ciclo cerrado: todo caso termina con un resultado documentado.</p>
        </div>
      </header>
      <div className="grid kpis" style={{ marginBottom: 16 }}>
        <Kpi label="Abiertos" value={state.cases.length - closed.length} />
        <Kpi label="Tiempo al primer contacto" value={contacted.length ? `${avgHours.toFixed(1)} h` : "—"} hint="Promedio" />
        <Kpi label="Cerrados" value={closed.length} hint={closed.length ? `${retained} retenidos` : undefined} />
      </div>
      <div className="board">
        {COLUMNS.map((col) => {
          const items = state.cases.filter((c) => c.status === col.status);
          return (
            <section key={col.status} className="col" aria-label={col.label}>
              <h3>
                {col.label} <span className="muted num">{items.length}</span>
              </h3>
              {items.map((c) => (
                <CaseCard key={c.id} c={c} onClick={() => go("casos", { c: c.id })} />
              ))}
            </section>
          );
        })}
      </div>
      {selected && <CaseDetail id={selected} onOpen={onOpen} />}
    </>
  );
}

function CaseCard({ c, onClick }: { c: RetentionCase; onClick: () => void }) {
  const { student } = useStore();
  const s = student(c.studentId);
  return (
    <button className="case" onClick={onClick} style={{ textAlign: "left" }}>
      <strong>{s?.name}</strong>
      <div className="row">
        <LevelBadge level={c.level} />
        <span className="badge plain tone-neutral">{AREA_LABEL[c.area]}</span>
      </div>
      <span className="small muted">
        {c.owner} · abierto {ago(c.openedAt)}
        {c.outcome ? ` · ${c.outcome.replace("_", " ")}` : ""}
      </span>
    </button>
  );
}

function CaseDetail({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  const { state, dispatch, student } = useStore();
  const c = state.cases.find((x) => x.id === id);
  const [note, setNote] = useState("");
  const [contact, setContact] = useState(true);
  const [outcome, setOutcome] = useState<CaseOutcome>("retenido");
  const [closing, setClosing] = useState(false);
  if (!c) return null;
  const s = student(c.studentId);
  const close = () => go("casos");

  return (
    <div className="overlay" onClick={close}>
      <aside className="drawer" role="dialog" aria-label="Detalle del caso" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <div style={{ flex: 1 }}>
            <h2>Caso de {s?.name}</h2>
            <p className="small muted">
              {AREA_LABEL[c.area]} · {c.owner} · abierto {ago(c.openedAt)}
            </p>
          </div>
          <button className="btn ghost" onClick={close} aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>
        <div className="row">
          <button className="btn sm" onClick={() => s && onOpen(s.id)}>Ver ficha</button>
          {c.status !== "cerrado" && (
            <select
              className="select"
              value={c.status}
              onChange={(e) => dispatch({ type: "setStatus", caseId: c.id, status: e.target.value as CaseStatus })}
              aria-label="Estado"
            >
              <option value="abierto">Sin contactar</option>
              <option value="en_progreso">En seguimiento</option>
              <option value="escalado">Escalado a persona</option>
            </select>
          )}
        </div>

        <section className="card card-pad stack">
          <h3>Bitácora</h3>
          {c.notes.map((n, i) => (
            <div key={i} className="small">
              <strong>{n.by}</strong> <span className="muted">· {ago(n.at)}</span>
              <p>{n.text}</p>
            </div>
          ))}
        </section>

        {c.status !== "cerrado" && (
          <section className="card card-pad stack">
            <h3>{closing ? "Cerrar el caso" : "Agregar nota"}</h3>
            {closing && (
              <select className="select" value={outcome} onChange={(e) => setOutcome(e.target.value as CaseOutcome)} aria-label="Resultado">
                {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            <textarea
              className="textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={closing ? "Qué se acordó y qué pasó (obligatorio)" : "Ej.: Llamé, acordamos plan de pago con Asistencia Económica"}
            />
            {!closing && (
              <label className="switch">
                <input type="checkbox" checked={contact} onChange={(e) => setContact(e.target.checked)} />
                Hubo contacto con el estudiante
              </label>
            )}
            <div className="row">
              {closing ? (
                <>
                  <button
                    className="btn primary"
                    disabled={!note.trim()}
                    onClick={() => {
                      dispatch({ type: "closeCase", caseId: c.id, outcome, note });
                      setNote("");
                      setClosing(false);
                    }}
                  >
                    Cerrar con resultado
                  </button>
                  <button className="btn ghost" onClick={() => setClosing(false)}>Cancelar</button>
                </>
              ) : (
                <>
                  <button
                    className="btn primary"
                    disabled={!note.trim()}
                    onClick={() => {
                      dispatch({ type: "addNote", caseId: c.id, text: note, contact });
                      setNote("");
                    }}
                  >
                    Guardar nota
                  </button>
                  <button className="btn" onClick={() => setClosing(true)}>Cerrar caso…</button>
                </>
              )}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}
