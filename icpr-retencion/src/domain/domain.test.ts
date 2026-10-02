import { describe, expect, it } from "vitest";
import { computeRhi } from "./rhi";
import { canSendNudge, DEFAULT_POLICY, fillTemplate } from "./nudges";
import { detectSafety } from "./safety";
import { auditAttribute } from "./fairness";
import { computeRoi, DEFAULT_ROI } from "./roi";
import { offlineReply } from "./agents";
import { seedStudents } from "./seed";
import type { Level, Nudge, Signals, Student } from "./types";

const healthy: Signals = {
  daysSinceLogin: 1,
  lateSubmissions: 0,
  tutorUsageTrend: 0.1,
  gpa: 3.4,
  attendancePct: 95,
  creditsEnrolled: 12,
  financialHold: false,
  aidRefilingPending: false,
  weeklyWorkHours: 0,
  dependents: 0,
  commuteMinutes: 20,
  belongingScore: 4,
  wellbeingConcern: false,
};

const student = (over: Partial<Student> = {}, sig: Partial<Signals> = {}): Student => ({
  id: "E1",
  name: "Coral Rivera Ortiz",
  phone: "787-555-1234",
  program: "Asistente Dental",
  campus: "Bayamón",
  cohort: "Ago 2026",
  weekOfTerm: 6,
  firstGen: true,
  enrollment: "completa",
  ageBand: "18-24",
  consent: true,
  contactPaused: false,
  ...over,
  signals: { ...healthy, ...sig },
});

describe("computeRhi", () => {
  it("da verde y sin factores a un estudiante sano", () => {
    const r = computeRhi(healthy);
    expect(r.score).toBe(100);
    expect(r.level).toBe("verde");
    expect(r.factors).toHaveLength(0);
    expect(r.requiresHuman).toBe(false);
  });

  it("explica cada punto que resta", () => {
    const r = computeRhi({ ...healthy, daysSinceLogin: 8, financialHold: true });
    expect(r.score).toBe(100 - 14 - 15);
    expect(r.factors.map((f) => f.reason)).toEqual([
      "Retención (hold) financiera activa",
      "8 días sin entrar al LMS",
    ]);
    expect(r.primaryArea).toBe("financiera");
    expect(r.suggestedAgent).toBe("enlace");
  });

  it("limita cada área para que una sola no hunda el índice", () => {
    const r = computeRhi({ ...healthy, lateSubmissions: 6, gpa: 1.2, attendancePct: 40 });
    // 16 + 14 + 12 = 42, con tope de 30.
    expect(r.score).toBe(70);
  });

  it("envía a los rojos a Seguimiento y exige una persona", () => {
    const r = computeRhi({
      ...healthy,
      daysSinceLogin: 15,
      tutorUsageTrend: -0.8,
      lateSubmissions: 4,
      gpa: 1.8,
      financialHold: true,
    });
    expect(r.level).toBe("rojo");
    expect(r.requiresHuman).toBe(true);
    expect(r.suggestedAgent).toBe("seguimiento");
  });

  it("envía siempre el bienestar a Acompaña con una persona", () => {
    const r = computeRhi({ ...healthy, wellbeingConcern: true, financialHold: true, aidRefilingPending: true });
    expect(r.primaryArea).toBe("bienestar");
    expect(r.suggestedAgent).toBe("acompana");
    expect(r.requiresHuman).toBe(true);
  });
});

describe("canSendNudge", () => {
  const noon = new Date(2026, 9, 6, 12, 0);
  const nudge = (hoursAgo: number): Nudge => ({
    id: String(hoursAgo),
    studentId: "E1",
    at: new Date(noon.getTime() - hoursAgo * 3_600_000).toISOString(),
    channel: "whatsapp",
    agent: "pulso",
    text: "x",
  });

  it("permite un primer mensaje de día", () => {
    expect(canSendNudge(student(), [], noon)).toEqual({ ok: true });
  });

  it("bloquea sin consentimiento, con pausa y en casos de bienestar", () => {
    expect(canSendNudge(student({ consent: false }), [], noon).ok).toBe(false);
    expect(canSendNudge(student({ contactPaused: true }), [], noon).ok).toBe(false);
    expect(canSendNudge(student({}, { wellbeingConcern: true }), [], noon).ok).toBe(false);
  });

  it("respeta el horario de silencio", () => {
    expect(canSendNudge(student(), [], new Date(2026, 9, 6, 22, 0)).ok).toBe(false);
    expect(canSendNudge(student(), [], new Date(2026, 9, 6, 7, 59)).ok).toBe(false);
    expect(canSendNudge(student(), [], new Date(2026, 9, 6, 8, 0)).ok).toBe(true);
  });

  it("aplica la separación mínima y el tope semanal", () => {
    expect(canSendNudge(student(), [nudge(5)], noon).ok).toBe(false);
    expect(canSendNudge(student(), [nudge(30)], noon).ok).toBe(true);
    const r = canSendNudge(student(), [nudge(30), nudge(100)], noon, DEFAULT_POLICY);
    expect(r).toEqual({ ok: false, reason: "Ya recibió 2 mensajes esta semana (máx. 2)" });
    expect(canSendNudge(student(), [nudge(30), nudge(200)], noon).ok).toBe(true);
  });

  it("ignora los mensajes de otros estudiantes", () => {
    expect(canSendNudge(student(), [{ ...nudge(1), studentId: "E2" }], noon).ok).toBe(true);
  });
});

describe("detectSafety", () => {
  it("detecta lenguaje de crisis antes que nada", () => {
    expect(detectSafety("a veces pienso en quitarme la vida").level).toBe("crisis");
    expect(detectSafety("tengo ansiedad y me quiero morir").level).toBe("crisis");
  });
  it("detecta lenguaje de malestar", () => {
    expect(detectSafety("estoy muy abrumada con todo").level).toBe("bienestar");
    expect(detectSafety("tengo mucha ansiedad").level).toBe("bienestar");
  });
  it("deja pasar preguntas comunes", () => {
    expect(detectSafety("¿cuándo vence la FAFSA?").level).toBe("ninguno");
  });
});

describe("auditAttribute", () => {
  it("marca una disparidad bajo la regla de cuatro quintos", () => {
    const students = Array.from({ length: 20 }, (_, i) => student({ id: `S${i}`, firstGen: i < 10 }));
    const levels = new Map<string, Level>(
      students.map((s, i) => [s.id, (i < 10 ? i < 6 : i < 12) ? "rojo" : "verde"]),
    );
    const r = auditAttribute(students, levels, "firstGen");
    expect(r.groups.map((g) => g.rate)).toEqual([0.2, 0.6]);
    expect(r.ratio).toBeCloseTo(1 / 3);
    expect(r.needsReview).toBe(true);
  });

  it("no compara grupos menores que el mínimo", () => {
    const students = [
      ...Array.from({ length: 12 }, (_, i) => student({ id: `A${i}`, ageBand: "18-24" })),
      student({ id: "B0", ageBand: "35+" }),
    ];
    const levels = new Map<string, Level>(students.map((s) => [s.id, s.id === "B0" ? "rojo" : "verde"]));
    expect(auditAttribute(students, levels, "ageBand").needsReview).toBe(false);
  });
});

describe("computeRoi", () => {
  it("reproduce las cifras ilustrativas del plan", () => {
    const r = computeRoi(DEFAULT_ROI);
    expect(r.revenuePerCohort).toBeCloseTo(15_610, 0);
    expect(r.revenuePerYear).toBeCloseTo(62_440, 0);
  });
});

describe("utilidades", () => {
  it("rellena las plantillas con el primer nombre", () => {
    expect(fillTemplate("Hola {nombre} de {recinto}", student())).toBe("Hola Coral de Bayamón");
  });
  it("responde sin conexión según la intención", () => {
    expect(offlineReply("enlace", "no sé cómo renovar la FAFSA")).toMatch(/studentaid\.gov/);
  });
  it("genera una cohorte reproducible con los tres niveles", () => {
    const a = seedStudents();
    expect(seedStudents()).toEqual(a);
    const levels = new Set(a.map((s) => computeRhi(s.signals).level));
    expect(levels).toEqual(new Set(["verde", "amarillo", "rojo"]));
  });
});
