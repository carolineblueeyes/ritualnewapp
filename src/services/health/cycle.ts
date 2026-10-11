import type { CyclePhase } from './types';
import type { Baseline, ShineConfig, ShineDriver } from './shineConfig';

/**
 * EPIC 1 — фазы менструального цикла и беременность.
 * Фаза выводится из cycleDay/cycleLength; поправки к mu И sigma берутся из конфига.
 * При беременности лютеиновая логика отключается, действуют поправки по триместрам.
 */

export type Trimester = 1 | 2 | 3 | null;

export interface CycleContext {
  cyclePhase: CyclePhase;
  pregnancyMode: boolean;
  pregnancyTrimester: Trimester;
}

export function phaseFromCycleDay(
  cycleDay: number | null | undefined,
  cycleLength = 28,
): CyclePhase {
  if (cycleDay == null || !Number.isFinite(cycleDay) || cycleDay < 1) return null;
  const length = cycleLength >= 21 && cycleLength <= 35 ? Math.round(cycleLength) : 28;
  const day = ((Math.round(cycleDay) - 1) % length) + 1;
  if (day <= 5) return 'menstrual';
  if (day <= 13) return 'follicular';
  if (day <= 16) return 'ovulatory';
  return 'luteal';
}

export function applyCycleAndPregnancy(
  driver: ShineDriver,
  base: Baseline,
  ctx: CycleContext,
  config: ShineConfig,
): Baseline {
  let mu = base.mean;
  let sigma = base.sigma;

  if (ctx.cyclePhase && !ctx.pregnancyMode) {
    const adj = config.cycle[driver]?.[ctx.cyclePhase];
    if (adj?.muMult) mu *= adj.muMult;
    if (adj?.muDelta) mu += adj.muDelta;
    if (adj?.sigmaMult) sigma *= adj.sigmaMult;
  }

  if (ctx.pregnancyMode) {
    const t = ctx.pregnancyTrimester ?? 1;
    const p = config.pregnancy;
    if (driver === 'restingHR') mu += p.restingHRDelta[t];
    if (driver === 'hrv') mu *= p.hrvMult[t];
    if (driver === 'temperature') mu += p.temperatureDelta[t];
    if (driver === 'sleep') mu += p.sleepDelta[t];
    sigma *= p.sigmaMult;
  }

  return { mean: mu, sigma, lowerIsBetter: base.lowerIsBetter };
}
