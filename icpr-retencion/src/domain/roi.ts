/**
 * Caso financiero (Fundamentación §09). Los parámetros por defecto replican el
 * ejemplo ilustrativo del plan: pasar de 85 % a 92 % ≈ $15.6K por cohorte y
 * ≈ $62.5K al año con cuatro cohortes. Son cifras ilustrativas, no contables.
 */
export interface RoiInput {
  cohortSize: number;
  cohortsPerYear: number;
  baselineRetention: number;
  targetRetention: number;
  /** Matrícula restante que aporta cada estudiante retenido. */
  revenuePerRetained: number;
  annualSystemCost: number;
}

export interface RoiResult {
  retainedPerCohort: number;
  revenuePerCohort: number;
  revenuePerYear: number;
  netPerYear: number;
  roiMultiple: number;
}

export const DEFAULT_ROI: RoiInput = {
  cohortSize: 40,
  cohortsPerYear: 4,
  baselineRetention: 0.85,
  targetRetention: 0.92,
  revenuePerRetained: 5_575,
  annualSystemCost: 18_000,
};

export function computeRoi(i: RoiInput): RoiResult {
  const lift = Math.max(0, i.targetRetention - i.baselineRetention);
  const retainedPerCohort = i.cohortSize * lift;
  const revenuePerCohort = retainedPerCohort * i.revenuePerRetained;
  const revenuePerYear = revenuePerCohort * i.cohortsPerYear;
  const netPerYear = revenuePerYear - i.annualSystemCost;
  const roiMultiple = i.annualSystemCost > 0 ? revenuePerYear / i.annualSystemCost : 0;
  return { retainedPerCohort, revenuePerCohort, revenuePerYear, netPerYear, roiMultiple };
}
