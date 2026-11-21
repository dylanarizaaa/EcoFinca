/**
 * Balance hídrico del suelo:
 *
 *   H(t+1) = H(t) + Precipitación − Escorrentía + Riego efectivo − Evapotranspiración − Drenaje
 *
 * Todos los términos están expresados en puntos de humedad (escala 0–100).
 */

import { WATER } from '../config/model'
import type { WeatherCondition } from '../domain/types'
import { clamp, clamp100 } from '../lib/math'

export interface RunoffInput {
  slope: number
  rainIntensity: number
  erosion: number
  coverLevel: number
  barrierLevel: number
  shadeLevel: number
}

/** Coeficiente de escorrentía (fracción de la lluvia que no infiltra). */
export function runoffCoefficient(input: RunoffInput): number {
  const coef =
    WATER.runoffBase +
    WATER.runoffSlope * input.slope +
    WATER.runoffIntensity * (input.rainIntensity / 100) +
    WATER.runoffErosion * (input.erosion / 100) -
    WATER.runoffCover * input.coverLevel -
    WATER.runoffBarrier * input.barrierLevel -
    WATER.runoffShade * input.shadeLevel
  return clamp(coef, WATER.runoffMin, WATER.runoffMax)
}

export interface EtInput {
  temperature: number
  condition: WeatherCondition
  coverLevel: number
  shadeLevel: number
  bareSoil: boolean
}

/** Evapotranspiración mensual (mm). */
export function evapotranspirationMm(input: EtInput): number {
  const base = WATER.baseEtMm + WATER.etPerDegree * (input.temperature - 20)
  const conditionFactor = WATER.etConditionFactor[input.condition]
  const practiceFactor =
    1 -
    WATER.etReductionCover * input.coverLevel -
    WATER.etReductionShade * input.shadeLevel +
    (input.bareSoil ? WATER.etIncreaseBare : 0)
  return Math.max(0, base * conditionFactor * practiceFactor)
}

/** Fracción de la ET potencial que ocurre según la humedad del suelo. */
export function etStressFactor(moisture: number): number {
  const ratio = Math.min(1, Math.max(0, moisture) / WATER.etStressThreshold)
  return WATER.etMinFraction + (1 - WATER.etMinFraction) * ratio
}

export interface MoistureInput extends RunoffInput, EtInput {
  moisture: number
  precipitationMm: number
  /** Riego efectivo aplicado durante el mes (mm efectivos). */
  irrigationMm: number
}

export interface MoistureResult {
  moisture: number
  precipitation: number
  runoff: number
  irrigation: number
  evapotranspiration: number
  drainage: number
}

export function computeMoisture(input: MoistureInput): MoistureResult {
  const precipitation = input.precipitationMm * WATER.precipPointsPerMm
  const runoff = precipitation * runoffCoefficient(input)
  const irrigation = input.irrigationMm * WATER.irrigationPointsPerMm
  const evapotranspiration = evapotranspirationMm(input) * WATER.etPointsPerMm * etStressFactor(input.moisture)
  let moisture = input.moisture + precipitation - runoff + irrigation - evapotranspiration
  let drainage = 0
  if (moisture > WATER.drainageThreshold) {
    drainage = (moisture - WATER.drainageThreshold) * WATER.drainageRate
    moisture -= drainage
  }
  if (moisture > 100) {
    drainage += moisture - 100
  }
  return {
    moisture: clamp100(moisture),
    precipitation,
    runoff,
    irrigation,
    evapotranspiration,
    drainage,
  }
}

/** Volumen bruto (m³) necesario para un riego en una parcela. */
export function irrigationVolumeM3(areaHa: number, efficiency: number): number {
  // 1 mm sobre 1 ha = 10 m³
  return (WATER.irrigationEffectiveMm * 10 * areaHa) / efficiency
}

export interface StreamFlowInput {
  flow: number
  precipitationRatio: number
  forestFraction: number
  riparianLevel: number
  modifier: number
}

/** Índice de caudal de la quebrada; se ajusta gradualmente hacia su objetivo. */
export function computeStreamFlow(input: StreamFlowInput, rates: {
  rate: number
  base: number
  precip: number
  forest: number
  riparian: number
}): number {
  const target =
    (rates.base +
      rates.precip * Math.min(1.6, input.precipitationRatio) +
      rates.forest * input.forestFraction +
      rates.riparian * input.riparianLevel) *
    input.modifier
  return clamp100(input.flow + rates.rate * (clamp100(target) - input.flow))
}
