import { ATTRIBUTE_LABEL, auditAttribute, MIN_GROUP_SIZE, type Attribute } from "../domain/fairness";
import { useStore } from "../state/store";
import { ago, pct } from "../components/ui";

const ATTRS: Attribute[] = ["firstGen", "enrollment", "ageBand", "campus"];

export function Governance() {
  const { state, rhi, dispatch } = useStore();
  const levels = new Map([...rhi].map(([id, r]) => [id, r.level]));
  const audits = ATTRS.map((a) => auditAttribute(state.students, levels, a));
  const noConsent = state.students.filter((s) => !s.consent).length;
  const paused = state.students.filter((s) => s.contactPaused).length;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Gobernanza</h1>
          <p>
            Los modelos de riesgo pueden repartir apoyos de forma desigual (Bird et al., 2024). Aquí se audita el
            RHI, se respeta el consentimiento y queda registro de cada acción.
          </p>
        </div>
      </header>

      <div className="grid two">
        <section className="card card-pad stack">
          <h2>Auditoría de sesgo del RHI</h2>
          <p className="small muted">
            Proporción de cada grupo priorizada (amarillo o rojo). Si la razón entre el grupo menos y el más
            priorizado baja de 0.80 (regla de cuatro quintos), las reglas se revisan con personas antes de usarlas para
            asignar apoyos. Grupos con menos de {MIN_GROUP_SIZE} estudiantes no se comparan.
          </p>
          {audits.map((a) => (
            <div key={a.attribute} className="stack" style={{ gap: 6 }}>
              <div className="row">
                <h3>{ATTRIBUTE_LABEL[a.attribute]}</h3>
                <span className="spacer" />
                <span className={`badge ${a.needsReview ? "lv-amarillo" : "lv-verde"}`}>
                  Razón {a.ratio.toFixed(2)} · {a.needsReview ? "Revisar" : "Dentro de rango"}
                </span>
              </div>
              {a.groups.map((g) => (
                <div key={g.group}>
                  <div className="row small" style={{ justifyContent: "space-between" }}>
                    <span>{g.group} <span className="muted">(n={g.n})</span></span>
                    <span className="num">{pct(g.rate)}</span>
                  </div>
                  <div className="meter"><span style={{ width: `${g.rate * 100}%`, opacity: g.n < MIN_GROUP_SIZE ? 0.4 : 1 }} /></div>
                </div>
              ))}
            </div>
          ))}
          <p className="small muted">
            Una diferencia no siempre es sesgo: puede reflejar necesidad real. La auditoría obliga a mirarla, no la
            decide sola.
          </p>
        </section>

        <div className="stack">
          <section className="card card-pad stack">
            <h2>Reglas no negociables</h2>
            <p className="small"><strong>Bienestar y crisis siempre van a una persona.</strong> Los agentes detectan señales y derivan a Consejería con la Línea PAS 1-800-981-0023 y el 988; nunca aconsejan ni evalúan riesgo.</p>
            <p className="small"><strong>Rojo = contacto humano.</strong> La IA prepara, una persona decide y llama.</p>
            <p className="small"><strong>FERPA.</strong> Sin consentimiento no hay contacto proactivo. Al modelo solo llega el primer nombre y señales agregadas.</p>
            <p className="small"><strong>Pausa.</strong> El estudiante puede detener los mensajes automáticos cuando quiera.</p>
            <p className="small"><strong>Reglas antes que ML.</strong> El RHI es explicable; se migra a modelos solo con datos validados de ICPR y tras auditoría.</p>
          </section>
          <section className="card card-pad stack">
            <h2>Consentimiento</h2>
            <p className="small">{noConsent} sin consentimiento FERPA · {paused} con contacto pausado</p>
          </section>
          <section className="card">
            <div className="card-head">
              <h2>Registro de acciones</h2>
              <button className="btn sm danger" onClick={() => confirm("¿Restaurar los datos de demostración? Se pierde lo registrado.") && dispatch({ type: "reset" })}>
                Restaurar demo
              </button>
            </div>
            <ul className="list" style={{ maxHeight: 360, overflowY: "auto" }}>
              {state.audit.slice(0, 50).map((e, i) => (
                <li key={i} className="small">
                  <div className="grow">{e.action}<div className="muted">{e.actor} · {ago(e.at)}</div></div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
