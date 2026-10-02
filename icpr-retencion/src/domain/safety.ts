/**
 * Frontera humana (Fundamentación §07): la IA puede detectar señales, pero
 * ninguna crisis ni tema de bienestar se resuelve por IA. Se usa en el
 * navegador y otra vez en la función del servidor.
 */

export type SafetyLevel = "crisis" | "bienestar" | "ninguno";

const CRISIS = [
  /suicid/i,
  /quitarme la vida/i,
  /no quiero (seguir )?viviendo/i,
  /no quiero vivir/i,
  /me quiero morir/i,
  /quiero morirme/i,
  /matarme/i,
  /hacerme da[ñn]o/i,
  /cortarme/i,
  /autoles/i,
  /me (est[aá]n )?pegando/i,
  /abus(o|an|ando) de m[ií]/i,
  /violencia (dom[eé]stica|en mi casa)/i,
  /kill myself/i,
  /suicide/i,
];

const BIENESTAR = [
  /ansiedad/i,
  /ansios[oa]/i,
  /depresi[oó]n/i,
  /deprimid[oa]/i,
  /p[aá]nico/i,
  /no puedo dormir/i,
  /insomnio/i,
  /estoy (muy )?(mal|triste|agotad[oa]|abrumad[oa])/i,
  /me siento (muy )?(sol[oa]|vac[ií][oa]|triste|abrumad[oa])/i,
  /estr[eé]s/i,
  /llorando/i,
  /no puedo m[aá]s/i,
];

export function detectSafety(text: string): { level: SafetyLevel; matched: string | null } {
  for (const re of CRISIS) {
    const m = text.match(re);
    if (m) return { level: "crisis", matched: m[0] };
  }
  for (const re of BIENESTAR) {
    const m = text.match(re);
    if (m) return { level: "bienestar", matched: m[0] };
  }
  return { level: "ninguno", matched: null };
}

export const CRISIS_RESPONSE =
  "Gracias por decírmelo. Lo que sientes importa y no tienes que pasarlo solo/a. " +
  "Ahora mismo te estoy conectando con una persona de Consejería de ICPR. " +
  "Si estás en peligro inmediato llama al 911. Puedes llamar o escribir 24/7 a la " +
  "Línea PAS (ASSMCA) 1-800-981-0023 o al 988 (Línea de Prevención del Suicidio y Crisis).";

export const WELLBEING_RESPONSE =
  "Gracias por contarme cómo te sientes. Eso es importante y merece la atención de una persona. " +
  "Le aviso ahora a Consejería de ICPR para que te contacten hoy. Mientras tanto, si en algún " +
  "momento te sientes en peligro, llama a la Línea PAS 1-800-981-0023 o al 988.";
