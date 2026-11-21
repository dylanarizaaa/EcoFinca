/**
 * Producción de café:
 *
 *   Producción = Área × Rendimiento base × fFertilidad × fHídrico × fSalud × fClimático
 *
 * En el motor, los factores se promedian durante las etapas reproductivas
 * (floración → maduración) porque es en ese periodo cuando se define la
 * cosecha. Se aplican además factores de edad, variedad, sombrío y broca.
 */

import { PRODUCTION } from '../config/model'
import { VARIETIES } from '../config/crops'
import type { CropState } from '../domain/types'
import { clamp01 } from '../lib/math'

export interface ProductionInput {
  areaHa: number
  baseYieldKgHa: number
  fertilityFactor: number
  moistureFactor: number
  healthFactor: number
  climateFactor: number
}

/** Ecuación de producción del modelo (kg cps). Factores normalizados 0–1. */
export function computeProduction(input: ProductionInput): number {
  const result =
    Math.max(0, input.areaHa) *
    Math.max(0, input.baseYieldKgHa) *
    clamp01(input.fertilityFactor) *
    clamp01(input.moistureFactor) *
    clamp01(input.healthFactor) *
    clamp01(input.climateFactor)
  return result
}

/** Factor por edad de la planta y número de cosechas. */
export function ageFactor(crop: Pick<CropState, 'harvests' | 'ageMonths'>): number {
  if (crop.harvests === 0) return PRODUCTION.firstHarvestFactor
  if (crop.ageMonths > PRODUCTION.oldAgeMonths) return PRODUCTION.oldAgeFactor
  return 1
}

export function brocaFactor(brocaIncidence: number): number {
  return clamp01(1 - brocaIncidence * PRODUCTION.brocaLossPerPoint)
}

export interface HarvestEstimateInput {
  crop: CropState
  areaHa: number
  baseYieldKgHa: number
  /** Factor combinado actual (se usa si aún no hay meses reproductivos acumulados). */
  currentFactor: number
  shadeLevel: number
  brocaIncidence: number
}

/** Estimación de cosecha (kg cps) a partir de los factores acumulados. */
export function estimateHarvest(input: HarvestEstimateInput): number {
  const { crop } = input
  if (!crop.variety) return 0
  const meanFactor = crop.reproMonths > 0 ? crop.reproFactorSum / crop.reproMonths : input.currentFactor
  const variety = VARIETIES[crop.variety]
  const shadePenalty = 1 - PRODUCTION.shadeYieldPenalty * input.shadeLevel
  const lateLoss = crop.stage === 'cosecha' && crop.monthsInStage >= 1 ? 1 - PRODUCTION.lateHarvestLoss : 1
  return (
    input.areaHa *
    input.baseYieldKgHa *
    meanFactor *
    ageFactor(crop) *
    variety.yieldFactor *
    shadePenalty *
    brocaFactor(input.brocaIncidence) *
    lateLoss
  )
}
