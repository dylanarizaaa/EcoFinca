/**
 * Factores productivos normalizados (0–1) usados en la ecuación de producción:
 *
 *   Producción = Área × Rendimiento base × fFertilidad × fHídrico × fSalud × fClimático
 */

import { PRODUCTION } from '../config/model'
import type { WeatherCondition } from '../domain/types'
import { clamp01, rampResponse, trapezoidResponse } from '../lib/math'

/** Factor de fertilidad: rampa lineal hasta el óptimo agronómico (70). */
export function fertilityFactor(fertility: number): number {
  return rampResponse(fertility, 0, PRODUCTION.fertilityOptimum, PRODUCTION.fertilityMinFactor)
}

/**
 * Factor hídrico trapezoidal: óptimo entre 45 y 78 de humedad; el déficit
 * (sequía) y el exceso (encharcamiento) reducen la productividad.
 */
export function moistureFactor(moisture: number): number {
  return trapezoidResponse(
    moisture,
    PRODUCTION.moistureLowOpt,
    PRODUCTION.moistureHighOpt,
    PRODUCTION.moistureMinLow,
    PRODUCTION.moistureMinHigh,
  )
}

export function healthFactor(health: number): number {
  return clamp01(health / 100)
}

export function climateFactor(condition: WeatherCondition): number {
  return PRODUCTION.climateFactor[condition]
}

/** Producto de los cuatro factores normalizados. */
export function combinedFactor(
  fertility: number,
  moisture: number,
  health: number,
  condition: WeatherCondition,
): number {
  return fertilityFactor(fertility) * moistureFactor(moisture) * healthFactor(health) * climateFactor(condition)
}
