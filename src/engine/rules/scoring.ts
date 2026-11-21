/**
 * Sistema de puntuación:
 *
 *   Puntuación = Productividad × 0,30 + Rentabilidad × 0,30 + Sostenibilidad × 0,40
 *
 * Con topes que impiden obtener una clasificación alta cuando la
 * sostenibilidad es baja (rentabilidad obtenida destruyendo el ecosistema).
 */

import { SCORING } from '../config/model'
import { agriculturalArea, farmIndicators } from '../domain/selectors'
import type { Classification, CycleRecord, GameState, Indicators, Parcel, Scores } from '../domain/types'
import { fertilityFactor, healthFactor, moistureFactor } from '../formulas/factors'
import { computeEquity, profitMargin } from '../formulas/economy'
import { clamp01, clamp100, round, sum } from '../lib/math'

type ScoringState = Pick<
  GameState,
  'parcels' | 'environment' | 'infrastructure' | 'inventory' | 'params' | 'market' | 'history' | 'turn' | 'counters'
>

/** Capacidad productiva de una parcela (0–1) según su estado. */
export function parcelCapacity(parcel: Parcel): number {
  const crop = parcel.crop
  if (parcel.landUse !== 'cafe' || !crop || !crop.variety) return 0
  let stageFactor = 1
  if (crop.stage === 'establecimiento') stageFactor = 0.35
  else if (crop.stage === 'vegetativo' && crop.harvests === 0) stageFactor = 0.55
  else if (crop.stage === 'preparacion') stageFactor = 0
  return (
    stageFactor *
    fertilityFactor(parcel.soil.fertility) *
    moistureFactor(parcel.soil.moisture) *
    healthFactor(crop.health)
  )
}

export function computeProductivity(state: ScoringState): number {
  const area = agriculturalArea(state)
  if (area === 0) return 0
  const capacity = sum(state.parcels.map((p) => parcelCapacity(p) * p.areaHa)) / area
  const recent = state.history.slice(-12)
  const realizedKg = sum(recent.map((h) => h.production))
  const realized = clamp01(realizedKg / (area * state.params.baseYieldKgHa))
  const w = 0.4 * Math.min(1, state.turn / 12)
  return clamp100(100 * (capacity * (1 - w) + realized * w))
}

export function computeProfitability(state: ScoringState): number {
  const initial = Math.max(1, state.counters.initialEquity)
  const equity = computeEquity(state)
  const years = Math.max(1, state.turn / 12)
  const annualReturn = (equity - initial) / initial / years
  return clamp100(50 + 50 * annualReturn)
}

export function waterSecurity(state: Pick<GameState, 'inventory' | 'infrastructure' | 'environment'>): number {
  const stock = clamp100((state.inventory.agua / Math.max(1, state.infrastructure.reservoirCapacity)) * 125)
  return clamp100(0.6 * stock + 0.4 * state.environment.streamFlow)
}

export function sustainabilityFromIndicators(ind: Indicators, water: number): number {
  const w = SCORING.sustainabilityWeights
  return clamp100(
    w.fertility * ind.fertility +
      w.erosion * (100 - ind.erosion) +
      w.waterQuality * ind.waterQuality +
      w.biodiversity * ind.biodiversity +
      w.contamination * (100 - ind.contamination) +
      w.water * water,
  )
}

export function computeSustainability(state: ScoringState): number {
  return sustainabilityFromIndicators(farmIndicators(state), waterSecurity(state))
}

export function classify(global: number, sustainability: number): Classification {
  const t = SCORING.thresholds
  if (global >= t.excelente && sustainability >= SCORING.excellentMinSustainability) return 'Excelente'
  if (global >= t.buena) return 'Buena'
  if (global >= t.aceptable) return 'Aceptable'
  return 'Deficiente'
}

/** Combina las tres dimensiones aplicando los topes por baja sostenibilidad. */
export function combineScores(productivity: number, profitability: number, sustainability: number): Scores {
  const w = SCORING.weights
  let global = productivity * w.productivity + profitability * w.profitability + sustainability * w.sustainability
  if (sustainability < SCORING.capLowSustainability.below) global = Math.min(global, SCORING.capLowSustainability.max)
  else if (sustainability < SCORING.capMediumSustainability.below)
    global = Math.min(global, SCORING.capMediumSustainability.max)
  const scores = {
    productivity: round(productivity, 1),
    profitability: round(profitability, 1),
    sustainability: round(sustainability, 1),
    global: round(global, 1),
  }
  return { ...scores, classification: classify(scores.global, scores.sustainability) }
}

export function computeScores(state: ScoringState): Scores {
  return combineScores(computeProductivity(state), computeProfitability(state), computeSustainability(state))
}

/** Evaluación de un ciclo productivo (12 meses) a partir de su historial. */
export function scoreCycle(
  cycle: Omit<CycleRecord, 'scores'>,
  agriArea: number,
  baseYield: number,
  avgCapacity: number,
  sustainability: number,
): Scores {
  const realized = clamp01(cycle.production / Math.max(1, agriArea * baseYield))
  const productivity = clamp100(100 * (0.5 * avgCapacity + 0.5 * realized))
  const profitability = clamp100(50 + 50 * profitMargin(cycle.income, cycle.expenses))
  return combineScores(productivity, profitability, sustainability)
}

export const CLASSIFICATION_INFO: Record<Classification, { color: string; description: string }> = {
  Excelente: { color: 'excelente', description: 'Finca productiva, rentable y ambientalmente sana.' },
  Buena: { color: 'buena', description: 'Buen desempeño con aspectos por mejorar.' },
  Aceptable: { color: 'aceptable', description: 'Desempeño suficiente, pero con riesgos importantes.' },
  Deficiente: { color: 'deficiente', description: 'La finca no es sostenible en su estado actual.' },
}
