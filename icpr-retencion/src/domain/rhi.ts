import type { AgentId, Area, Factor, Level, RhiResult, Signals } from "./types";

/**
 * Índice de Salud de Retención (RHI), 0–100: más alto = más sano.
 *
 * Arranca por reglas explicables (Fundamentación §02: el semáforo no retiene,
 * la intervención sí; se migra a ML solo con datos validados en ICPR). Cada
 * punto restado lleva su motivo para que asesoría pueda auditarlo.
 */

export const AREA_LABEL: Record<Area, string> = {
  academica: "Académica",
  compromiso: "Compromiso en el LMS",
  financiera: "Financiera",
  vida: "Vida y logística",
  pertenencia: "Pertenencia",
  bienestar: "Bienestar",
};

export const AREA_AGENT: Record<Area, AgentId> = {
  academica: "mentor",
  compromiso: "pulso",
  financiera: "enlace",
  vida: "enlace",
  pertenencia: "bienvenida",
  bienestar: "acompana",
};

export const LEVEL_LABEL: Record<Level, string> = {
  verde: "Verde",
  amarillo: "Amarillo",
  rojo: "Rojo",
};

export const THRESHOLDS = { verde: 70, amarillo: 45 } as const;

/** Tope por área: ninguna señal aislada hunde el índice entero. */
const AREA_CAP: Record<Area, number> = {
  academica: 30,
  compromiso: 30,
  financiera: 25,
  vida: 20,
  pertenencia: 15,
  bienestar: 20,
};

type Rule = (s: Signals) => Factor | null;

const rule =
  (area: Area, test: (s: Signals) => number | false, reason: (s: Signals) => string): Rule =>
  (s) => {
    const points = test(s);
    return points ? { area, points, reason: reason(s) } : null;
  };

const RULES: Rule[] = [
  // Compromiso: señales líder del LMS (Arnold & Pistilli, 2012).
  rule(
    "compromiso",
    (s) => (s.daysSinceLogin >= 14 ? 22 : s.daysSinceLogin >= 7 ? 14 : s.daysSinceLogin >= 4 ? 6 : false),
    (s) => `${s.daysSinceLogin} días sin entrar al LMS`,
  ),
  rule(
    "compromiso",
    (s) => (s.tutorUsageTrend <= -0.6 ? 10 : s.tutorUsageTrend <= -0.3 ? 5 : false),
    (s) => `Uso del tutor IA cayó ${Math.round(-s.tutorUsageTrend * 100)} %`,
  ),
  // Académica.
  rule(
    "academica",
    (s) => (s.lateSubmissions >= 4 ? 16 : s.lateSubmissions >= 2 ? 9 : false),
    (s) => `${s.lateSubmissions} entregas atrasadas en 4 semanas`,
  ),
  rule(
    "academica",
    (s) => (s.gpa < 2 ? 14 : s.gpa < 2.5 ? 7 : false),
    (s) => `Promedio ${s.gpa.toFixed(2)}`,
  ),
  rule(
    "academica",
    (s) => (s.attendancePct < 70 ? 12 : s.attendancePct < 85 ? 5 : false),
    (s) => `Asistencia ${Math.round(s.attendancePct)} %`,
  ),
  // Financiera: decisiva en estudiantes no tradicionales (Bean & Metzner, 1985).
  rule("financiera", (s) => (s.financialHold ? 15 : false), () => "Retención (hold) financiera activa"),
  rule(
    "financiera",
    (s) => (s.aidRefilingPending ? 10 : false),
    () => "Renovación de ayuda económica (FAFSA) pendiente",
  ),
  // Vida y logística.
  rule(
    "vida",
    (s) => (s.weeklyWorkHours >= 35 ? 9 : s.weeklyWorkHours >= 25 ? 5 : false),
    (s) => `Trabaja ${s.weeklyWorkHours} h/semana`,
  ),
  rule(
    "vida",
    (s) => (s.dependents >= 2 ? 6 : s.dependents === 1 ? 3 : false),
    (s) => `${s.dependents} dependiente${s.dependents === 1 ? "" : "s"} a cargo`,
  ),
  rule(
    "vida",
    (s) => (s.commuteMinutes >= 60 ? 6 : s.commuteMinutes >= 40 ? 3 : false),
    (s) => `${s.commuteMinutes} min de viaje al recinto`,
  ),
  rule(
    "vida",
    (s) => (s.creditsEnrolled < 6 ? 4 : false),
    (s) => `Solo ${s.creditsEnrolled} créditos matriculados`,
  ),
  // Pertenencia (Walton & Cohen, 2011).
  rule(
    "pertenencia",
    (s) => (s.belongingScore <= 2 ? 12 : s.belongingScore < 3 ? 6 : false),
    (s) => `Pertenencia ${s.belongingScore.toFixed(1)}/5 en el onboarding`,
  ),
  // Bienestar: nunca lo resuelve la IA (Fundamentación §07).
  rule(
    "bienestar",
    (s) => (s.wellbeingConcern ? 20 : false),
    () => "Señal de malestar reportada: requiere consejería humana",
  ),
];

export function levelFor(score: number): Level {
  if (score >= THRESHOLDS.verde) return "verde";
  if (score >= THRESHOLDS.amarillo) return "amarillo";
  return "rojo";
}

export function computeRhi(signals: Signals): RhiResult {
  const raw = RULES.map((r) => r(signals)).filter((f): f is Factor => f !== null);

  const byArea = new Map<Area, number>();
  for (const f of raw) byArea.set(f.area, (byArea.get(f.area) ?? 0) + f.points);

  let penalty = 0;
  for (const [area, pts] of byArea) penalty += Math.min(pts, AREA_CAP[area]);

  const score = Math.max(0, Math.min(100, 100 - penalty));
  const level = levelFor(score);

  let primaryArea: Area | null = null;
  let worst = 0;
  for (const [area, pts] of byArea) {
    const capped = Math.min(pts, AREA_CAP[area]);
    if (capped > worst) {
      worst = capped;
      primaryArea = area;
    }
  }
  if (signals.wellbeingConcern) primaryArea = "bienestar";

  const factors = raw.sort((a, b) => b.points - a.points);
  const requiresHuman = signals.wellbeingConcern || level === "rojo";
  const suggestedAgent: AgentId = primaryArea
    ? level === "rojo" && primaryArea !== "bienestar"
      ? "seguimiento"
      : AREA_AGENT[primaryArea]
    : "pulso";

  return { score, level, factors, primaryArea, requiresHuman, suggestedAgent };
}
