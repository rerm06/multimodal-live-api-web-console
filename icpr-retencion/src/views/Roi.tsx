import { useState } from "react";
import { computeRoi, DEFAULT_ROI, type RoiInput } from "../domain/roi";
import { Kpi, money } from "../components/ui";

const FIELDS: { key: keyof RoiInput; label: string; step: number; percent?: boolean }[] = [
  { key: "cohortSize", label: "Estudiantes por cohorte", step: 1 },
  { key: "cohortsPerYear", label: "Cohortes por año", step: 1 },
  { key: "baselineRetention", label: "Retención actual (%)", step: 1, percent: true },
  { key: "targetRetention", label: "Retención meta (%)", step: 1, percent: true },
  { key: "revenuePerRetained", label: "Ingreso por estudiante retenido ($)", step: 50 },
  { key: "annualSystemCost", label: "Costo anual del sistema ($)", step: 500 },
];

export function Roi() {
  const [input, setInput] = useState<RoiInput>(DEFAULT_ROI);
  const r = computeRoi(input);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Caso financiero</h1>
          <p>
            Cada baja es matrícula y créditos que no llegan a credencial (Schneider & Yin, 2012). Los valores por
            defecto reproducen el ejemplo del plan; son ilustrativos, no contables.
          </p>
        </div>
      </header>
      <div className="grid two">
        <section className="card card-pad stack">
          <h2>Supuestos</h2>
          {FIELDS.map((f) => (
            <label key={f.key} className="field">
              <span>{f.label}</span>
              <input
                className="input num"
                type="number"
                step={f.step}
                min={0}
                value={f.percent ? Math.round(input[f.key] * 1000) / 10 : input[f.key]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setInput({ ...input, [f.key]: f.percent ? Math.min(100, Math.max(0, v)) / 100 : Math.max(0, v) });
                }}
              />
            </label>
          ))}
          <button className="btn sm" onClick={() => setInput(DEFAULT_ROI)}>Restaurar ejemplo del plan</button>
        </section>
        <div className="stack">
          <div className="grid kpis">
            <Kpi label="Estudiantes retenidos por cohorte" value={r.retainedPerCohort.toFixed(1)} />
            <Kpi label="Ingreso recuperado por cohorte" value={money(r.revenuePerCohort)} />
            <Kpi label="Ingreso recuperado al año" value={money(r.revenuePerYear)} />
            <Kpi label="Neto anual" value={money(r.netPerYear)} hint={`${r.roiMultiple.toFixed(1)}× el costo`} />
          </div>
          <div className="notice info">
            Mide el resultado por cohorte real en ICPR: los efectos de nudges y chatbots suelen ser modestos y dependen
            del contexto. Este cálculo sirve para decidir, no para presupuestar.
          </div>
        </div>
      </div>
    </>
  );
}
