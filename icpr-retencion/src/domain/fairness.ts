import type { Level, Student } from "./types";

/**
 * Auditoría de sesgo del RHI (Fundamentación §08; Bird et al., 2024).
 * Compara qué proporción de cada grupo queda priorizada (amarillo o rojo).
 * Una razón entre grupos fuera de 0.8–1.25 (regla de cuatro quintos) pide
 * revisión humana de las reglas antes de usarlas para repartir apoyos.
 */

export type Attribute = "firstGen" | "enrollment" | "ageBand" | "campus";

export const ATTRIBUTE_LABEL: Record<Attribute, string> = {
  firstGen: "Primera generación",
  enrollment: "Carga académica",
  ageBand: "Edad",
  campus: "Recinto",
};

export interface GroupRate {
  group: string;
  n: number;
  flagged: number;
  rate: number;
}

export interface AuditResult {
  attribute: Attribute;
  groups: GroupRate[];
  /** Tasa del grupo menos priorizado / tasa del más priorizado. */
  ratio: number;
  needsReview: boolean;
}

function groupOf(s: Student, attr: Attribute): string {
  switch (attr) {
    case "firstGen":
      return s.firstGen ? "Primera generación" : "No primera generación";
    case "enrollment":
      return s.enrollment === "completa" ? "Tiempo completo" : "Tiempo parcial";
    case "ageBand":
      return s.ageBand;
    case "campus":
      return s.campus;
  }
}

export const MIN_GROUP_SIZE = 10;

export function auditAttribute(
  students: Student[],
  levels: Map<string, Level>,
  attribute: Attribute,
): AuditResult {
  const buckets = new Map<string, { n: number; flagged: number }>();
  for (const s of students) {
    const g = groupOf(s, attribute);
    const b = buckets.get(g) ?? { n: 0, flagged: 0 };
    b.n += 1;
    if (levels.get(s.id) !== "verde") b.flagged += 1;
    buckets.set(g, b);
  }
  const groups = [...buckets.entries()]
    .map(([group, b]) => ({ group, ...b, rate: b.n ? b.flagged / b.n : 0 }))
    .sort((a, b) => a.group.localeCompare(b.group));

  // Grupos muy pequeños dan razones inestables: se muestran, pero no cuentan.
  const comparable = groups.filter((g) => g.n >= MIN_GROUP_SIZE);
  const rates = comparable.map((g) => g.rate);
  const max = Math.max(0, ...rates);
  const min = rates.length ? Math.min(...rates) : 0;
  const ratio = max === 0 ? 1 : min / max;

  return { attribute, groups, ratio, needsReview: comparable.length > 1 && ratio < 0.8 };
}
