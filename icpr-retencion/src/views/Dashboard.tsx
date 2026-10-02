import { AGENTS } from "../domain/agents";
import { AREA_LABEL } from "../domain/rhi";
import type { Area, Level } from "../domain/types";
import { go } from "../router";
import { useStore } from "../state/store";
import { Kpi, LevelBadge, Score } from "../components/ui";

const LEVELS: Level[] = ["rojo", "amarillo", "verde"];

export function Dashboard({ onOpen }: { onOpen: (id: string) => void }) {
  const { state, rhi } = useStore();
  const all = state.students.map((s) => ({ s, r: rhi.get(s.id)! }));
  const count = (l: Level) => all.filter((x) => x.r.level === l).length;
  const avg = Math.round(all.reduce((a, x) => a + x.r.score, 0) / Math.max(1, all.length));
  const openCases = state.cases.filter((c) => c.status !== "cerrado");
  const noContact = openCases.filter((c) => !c.firstContactAt).length;
  const weekAgo = Date.now() - 7 * 86_400_000;
  const nudgesWeek = state.nudges.filter((n) => new Date(n.at).getTime() > weekAgo).length;

  const queue = all
    .filter((x) => x.r.level !== "verde")
    .sort((a, b) => a.r.score - b.r.score)
    .slice(0, 8);

  const areaCounts = new Map<Area, number>();
  for (const { r } of all) if (r.level !== "verde" && r.primaryArea) areaCounts.set(r.primaryArea, (areaCounts.get(r.primaryArea) ?? 0) + 1);
  const areas = [...areaCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxArea = Math.max(1, ...areas.map((a) => a[1]));

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Panel de retención</h1>
          <p>
            Semana {state.students[0]?.weekOfTerm ?? "–"} del cuatrimestre. El índice (RHI) prioriza a quién contactar
            primero; el contacto lo inicia ICPR, no el estudiante.
          </p>
        </div>
      </header>

      <div className="grid kpis" style={{ marginBottom: 16 }}>
        <Kpi label="Estudiantes monitoreados" value={all.length} hint={`RHI promedio ${avg}`} />
        <Kpi label="En rojo" value={count("rojo")} hint="Contacto humano esta semana" />
        <Kpi label="En amarillo" value={count("amarillo")} hint="Agentes + seguimiento" />
        <Kpi label="Casos abiertos" value={openCases.length} hint={`${noContact} sin primer contacto`} />
        <Kpi label="Mensajes (7 días)" value={nudgesWeek} hint={`Máx. ${state.policy.maxPerWeek} por estudiante`} />
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row" style={{ marginBottom: 10 }}>
          <h2>Distribución del riesgo</h2>
          <span className="spacer" />
          {LEVELS.map((l) => (
            <span key={l} className="row small">
              <LevelBadge level={l} /> <span className="num">{count(l)}</span>
            </span>
          ))}
        </div>
        <div className="bar" role="img" aria-label={`Rojo ${count("rojo")}, amarillo ${count("amarillo")}, verde ${count("verde")}`}>
          {LEVELS.map((l) => (
            <span key={l} style={{ width: `${(count(l) / Math.max(1, all.length)) * 100}%`, background: `var(--${l})` }} />
          ))}
        </div>
      </div>

      <div className="grid two">
        <section className="card">
          <div className="card-head">
            <h2>Atender primero</h2>
            <button className="btn sm" onClick={() => go("estudiantes")}>Ver todos</button>
          </div>
          <ul className="list">
            {queue.map(({ s, r }) => {
              const hasCase = state.cases.some((c) => c.studentId === s.id && c.status !== "cerrado");
              return (
                <li key={s.id} className="clickable" onClick={() => onOpen(s.id)}>
                  <Score value={r.score} level={r.level} />
                  <div className="grow">
                    <strong>{s.name}</strong>
                    <p className="small muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.factors[0]?.reason} · {s.program}
                    </p>
                  </div>
                  <span className="badge plain tone-primary">{AGENTS[r.suggestedAgent].name}</span>
                  {hasCase && <span className="badge plain tone-neutral">Con caso</span>}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="stack">
          <section className="card card-pad stack">
            <h2>Qué está causando el riesgo</h2>
            <p className="small muted">Área principal de quienes están en amarillo o rojo.</p>
            {areas.map(([area, n]) => (
              <div key={area}>
                <div className="row small" style={{ justifyContent: "space-between" }}>
                  <span>{AREA_LABEL[area]}</span>
                  <span className="num">{n}</span>
                </div>
                <div className="meter">
                  <span style={{ width: `${(n / maxArea) * 100}%` }} />
                </div>
              </div>
            ))}
          </section>
          <section className="card card-pad stack">
            <h2>Principios</h2>
            <p className="small">
              <strong>Humano en el circuito.</strong> Los casos rojos y todo tema de bienestar los atiende una persona.
            </p>
            <p className="small">
              <strong>Explicable.</strong> Cada punto del índice muestra su motivo.
            </p>
            <p className="small">
              <strong>Auditado.</strong> El RHI se revisa contra sesgo antes de repartir apoyos.{" "}
              <a href="#/gobernanza">Ver auditoría</a>
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
