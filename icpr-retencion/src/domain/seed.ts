import type { Signals, Student } from "./types";

/** Datos sintéticos y reproducibles: ningún estudiante real. */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Yamilet", "José", "Coral", "Luis", "Keishla", "Ángel", "Nicole", "Carlos", "Paola", "Jean",
  "Glorimar", "Héctor", "Valeria", "Xavier", "Adriana", "Josué", "Natalia", "Edwin", "Kiara", "Omar",
  "Mariela", "Jorge", "Zuleyka", "Gabriel", "Ivelisse", "Christian", "Lourdes", "Raúl", "Darlene", "Wilfredo",
];
const LAST = [
  "Rivera", "Santiago", "Rodríguez", "Ortiz", "Colón", "Torres", "Cruz", "Vázquez", "Meléndez", "Figueroa",
  "Ramos", "Pagán", "Maldonado", "Rosario", "Nieves", "Acevedo", "Quiñones", "Burgos", "Matos", "Cintrón",
];
export const PROGRAMS = [
  "Técnico de Farmacia",
  "Asistente Dental",
  "Cosmetología",
  "Electricidad",
  "Refrigeración y A/C",
  "Artes Culinarias",
  "Sistemas de Oficina",
  "Instalación de Gypsum Board",
];
export const CAMPUSES = ["Hato Rey", "Bayamón", "Manatí", "Arecibo", "Mayagüez"];

type Profile = "estable" | "vigilar" | "riesgo";

function signalsFor(profile: Profile, r: () => number): Signals {
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const between = (lo: number, hi: number) => lo + r() * (hi - lo);
  const base: Signals = {
    daysSinceLogin: Math.floor(between(0, 3)),
    lateSubmissions: pick([0, 0, 0, 1]),
    tutorUsageTrend: between(-0.2, 0.4),
    gpa: between(2.8, 3.9),
    attendancePct: between(86, 100),
    creditsEnrolled: pick([9, 12, 12, 15]),
    financialHold: false,
    aidRefilingPending: r() < 0.15,
    weeklyWorkHours: pick([0, 0, 10, 20, 25]),
    dependents: pick([0, 0, 0, 1]),
    commuteMinutes: Math.floor(between(10, 45)),
    belongingScore: between(3.2, 5),
    wellbeingConcern: false,
  };
  if (profile === "estable") return base;
  if (profile === "vigilar") {
    return {
      ...base,
      daysSinceLogin: Math.floor(between(4, 9)),
      lateSubmissions: pick([1, 2, 2]),
      tutorUsageTrend: between(-0.45, 0),
      gpa: between(2.4, 3.2),
      attendancePct: between(80, 92),
      aidRefilingPending: r() < 0.3,
      weeklyWorkHours: pick([10, 20, 25, 30]),
      belongingScore: between(2.6, 3.8),
    };
  }
  return {
    ...base,
    daysSinceLogin: Math.floor(between(9, 21)),
    lateSubmissions: pick([3, 4, 5]),
    tutorUsageTrend: between(-1, -0.5),
    gpa: between(1.4, 2.4),
    attendancePct: between(50, 75),
    creditsEnrolled: pick([6, 9, 12]),
    financialHold: r() < 0.55,
    aidRefilingPending: r() < 0.6,
    weeklyWorkHours: pick([30, 35, 40]),
    dependents: pick([0, 1, 2, 3]),
    commuteMinutes: Math.floor(between(30, 80)),
    belongingScore: between(1.5, 3),
  };
}

export function seedStudents(count = 64, seed = 2026): Student[] {
  const r = mulberry32(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const out: Student[] = [];
  for (let i = 0; i < count; i++) {
    const roll = r();
    const profile: Profile = roll < 0.58 ? "estable" : roll < 0.9 ? "vigilar" : "riesgo";
    const signals = signalsFor(profile, r);
    if (profile !== "estable" && r() < 0.12) signals.wellbeingConcern = true;
    signals.gpa = Math.round(signals.gpa * 100) / 100;
    signals.attendancePct = Math.round(signals.attendancePct);
    signals.tutorUsageTrend = Math.round(signals.tutorUsageTrend * 100) / 100;
    signals.belongingScore = Math.round(signals.belongingScore * 10) / 10;
    const ageRoll = r();
    out.push({
      id: `E${String(1001 + i)}`,
      name: `${pick(FIRST)} ${pick(LAST)} ${pick(LAST)}`,
      phone: `787-${String(200 + Math.floor(r() * 799))}-${String(1000 + Math.floor(r() * 8999))}`,
      program: pick(PROGRAMS),
      campus: pick(CAMPUSES),
      cohort: pick(["Ago 2026", "Ago 2026", "May 2026"]),
      weekOfTerm: 6,
      firstGen: r() < 0.55,
      enrollment: signals.creditsEnrolled >= 12 ? "completa" : "parcial",
      ageBand: ageRoll < 0.5 ? "18-24" : ageRoll < 0.8 ? "25-34" : "35+",
      consent: r() < 0.94,
      contactPaused: r() < 0.04,
      signals,
    });
  }
  return out;
}
