import { useMemo, useState } from "react";
import { AGENTS } from "../domain/agents";
import { AREA_LABEL } from "../domain/rhi";
import { CAMPUSES, PROGRAMS } from "../domain/seed";
import type { Level } from "../domain/types";
import { useStore } from "../state/store";
import { LevelBadge, Score } from "../components/ui";

export function Students({ onOpen }: { onOpen: (id: string) => void }) {
  const { state, rhi } = useStore();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<"" | Level>("");
  const [program, setProgram] = useState("");
  const [campus, setCampus] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.students
      .map((s) => ({ s, r: rhi.get(s.id)! }))
      .filter(({ s, r }) =>
        (!needle || s.name.toLowerCase().includes(needle) || s.id.toLowerCase().includes(needle)) &&
        (!level || r.level === level) &&
        (!program || s.program === program) &&
        (!campus || s.campus === campus),
      )
      .sort((a, b) => a.r.score - b.r.score);
  }, [state.students, rhi, q, level, program, campus]);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Estudiantes</h1>
          <p>Ordenados de mayor a menor riesgo. Abre una ficha para ver por qué tiene su índice y qué hacer.</p>
        </div>
      </header>
      <div className="row" style={{ marginBottom: 14 }}>
        <input className="input" placeholder="Buscar por nombre o ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        <select className="select" value={level} onChange={(e) => setLevel(e.target.value as Level | "")} aria-label="Nivel">
          <option value="">Todos los niveles</option>
          <option value="rojo">Rojo</option>
          <option value="amarillo">Amarillo</option>
          <option value="verde">Verde</option>
        </select>
        <select className="select" value={program} onChange={(e) => setProgram(e.target.value)} aria-label="Programa">
          <option value="">Todos los programas</option>
          {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select className="select" value={campus} onChange={(e) => setCampus(e.target.value)} aria-label="Recinto">
          <option value="">Todos los recintos</option>
          {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="spacer" />
        <span className="small muted">{rows.length} estudiantes</span>
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>RHI</th>
              <th>Estudiante</th>
              <th>Programa · Recinto</th>
              <th>Área principal</th>
              <th>Motivo principal</th>
              <th>Agente sugerido</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, r }) => (
              <tr key={s.id} onClick={() => onOpen(s.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen(s.id)}>
                <td><Score value={r.score} level={r.level} /></td>
                <td>
                  <strong>{s.name}</strong>
                  <div className="small muted">{s.id}{s.contactPaused ? " · contacto pausado" : ""}{!s.consent ? " · sin consentimiento" : ""}</div>
                </td>
                <td className="small">{s.program}<div className="muted">{s.campus}</div></td>
                <td>{r.primaryArea ? <span className="badge plain tone-neutral">{AREA_LABEL[r.primaryArea]}</span> : <LevelBadge level="verde" />}</td>
                <td className="small">{r.factors[0]?.reason ?? "—"}</td>
                <td className="small">{AGENTS[r.suggestedAgent].name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
