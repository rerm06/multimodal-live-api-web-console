import type { Nudge, Student } from "./types";

/**
 * Política anti-spam del agente Pulso. Los nudges funcionan cuando son pocos,
 * personales y bien sincronizados (Castleman & Meyer, 2020); de más, cansan.
 */
export interface NudgePolicy {
  maxPerWeek: number;
  minHoursBetween: number;
  quietStartHour: number;
  quietEndHour: number;
}

export const DEFAULT_POLICY: NudgePolicy = {
  maxPerWeek: 2,
  minHoursBetween: 24,
  quietStartHour: 21,
  quietEndHour: 8,
};

export type NudgeCheck = { ok: true } | { ok: false; reason: string };

const HOUR = 3_600_000;

export function inQuietHours(date: Date, policy: NudgePolicy): boolean {
  const h = date.getHours();
  return policy.quietStartHour > policy.quietEndHour
    ? h >= policy.quietStartHour || h < policy.quietEndHour
    : h >= policy.quietStartHour && h < policy.quietEndHour;
}

export function canSendNudge(
  student: Student,
  history: Nudge[],
  now: Date,
  policy: NudgePolicy = DEFAULT_POLICY,
): NudgeCheck {
  if (!student.consent) return { ok: false, reason: "Sin consentimiento FERPA para contacto proactivo" };
  if (student.contactPaused) return { ok: false, reason: "El estudiante pausó el contacto automatizado" };
  if (student.signals.wellbeingConcern)
    return { ok: false, reason: "Caso de bienestar: el contacto lo hace una persona, no Pulso" };
  if (inQuietHours(now, policy))
    return {
      ok: false,
      reason: `Horario de descanso (${policy.quietStartHour}:00–${policy.quietEndHour}:00)`,
    };

  const mine = history
    .filter((n) => n.studentId === student.id)
    .map((n) => new Date(n.at).getTime())
    .filter((t) => t <= now.getTime());

  const lastWeek = mine.filter((t) => now.getTime() - t < 7 * 24 * HOUR);
  if (lastWeek.length >= policy.maxPerWeek)
    return { ok: false, reason: `Ya recibió ${lastWeek.length} mensajes esta semana (máx. ${policy.maxPerWeek})` };

  const last = Math.max(0, ...mine);
  const gapH = (now.getTime() - last) / HOUR;
  if (last && gapH < policy.minHoursBetween)
    return {
      ok: false,
      reason: `Último mensaje hace ${Math.floor(gapH)} h (mínimo ${policy.minHoursBetween} h)`,
    };

  return { ok: true };
}

/** Rellena {nombre}, {programa} y {recinto} en una plantilla. */
export function fillTemplate(template: string, student: Student): string {
  const first = student.name.split(" ")[0];
  return template
    .replaceAll("{nombre}", first)
    .replaceAll("{programa}", student.program)
    .replaceAll("{recinto}", student.campus);
}
