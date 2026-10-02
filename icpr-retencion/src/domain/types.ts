export type Area =
  | "academica"
  | "compromiso"
  | "financiera"
  | "vida"
  | "pertenencia"
  | "bienestar";

export type Level = "verde" | "amarillo" | "rojo";

export type AgentId =
  | "bienvenida"
  | "mentor"
  | "enlace"
  | "pulso"
  | "seguimiento"
  | "acompana";

export interface Signals {
  /** Días desde el último acceso al LMS. */
  daysSinceLogin: number;
  /** Entregas atrasadas en las últimas 4 semanas. */
  lateSubmissions: number;
  /** Cambio en uso del tutor IA vs. las 2 semanas previas (-1 = cayó 100 %). */
  tutorUsageTrend: number;
  /** Promedio académico 0–4. */
  gpa: number;
  /** Asistencia del cuatrimestre, 0–100. */
  attendancePct: number;
  creditsEnrolled: number;
  financialHold: boolean;
  aidRefilingPending: boolean;
  weeklyWorkHours: number;
  dependents: number;
  commuteMinutes: number;
  /** Encuesta de pertenencia del onboarding, 1–5. */
  belongingScore: number;
  /** El estudiante o un docente reportó malestar emocional. */
  wellbeingConcern: boolean;
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  program: string;
  campus: string;
  cohort: string;
  weekOfTerm: number;
  firstGen: boolean;
  enrollment: "completa" | "parcial";
  ageBand: "18-24" | "25-34" | "35+";
  /** Consentimiento FERPA para contacto proactivo. */
  consent: boolean;
  /** El estudiante pidió pausar el contacto automatizado. */
  contactPaused: boolean;
  signals: Signals;
}

export interface Factor {
  area: Area;
  points: number;
  reason: string;
}

export interface RhiResult {
  score: number;
  level: Level;
  factors: Factor[];
  primaryArea: Area | null;
  /** Requiere una persona: bienestar o riesgo rojo. */
  requiresHuman: boolean;
  suggestedAgent: AgentId;
}

export type CaseStatus = "abierto" | "en_progreso" | "escalado" | "cerrado";
export type CaseOutcome = "retenido" | "derivado" | "baja" | "sin_respuesta";

export interface CaseNote {
  at: string;
  by: string;
  text: string;
}

export interface RetentionCase {
  id: string;
  studentId: string;
  openedAt: string;
  firstContactAt?: string;
  area: Area;
  level: Level;
  owner: string;
  status: CaseStatus;
  notes: CaseNote[];
  outcome?: CaseOutcome;
  closedAt?: string;
}

export type Channel = "whatsapp" | "sms" | "email";

export interface Nudge {
  id: string;
  studentId: string;
  at: string;
  channel: Channel;
  agent: AgentId;
  text: string;
}

export interface AuditEntry {
  at: string;
  actor: string;
  action: string;
}
