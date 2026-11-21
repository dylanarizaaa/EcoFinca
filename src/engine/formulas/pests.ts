/**
 * Dinámica de plagas y enfermedades (incidencia 0–100 por parcela):
 *
 *   I(t+1) = I(t) + Crecimiento − Mortalidad + Propagación desde vecinas + Brote
 *
 * El crecimiento depende de la favorabilidad ambiental (clima, nutrición,
 * variedad), se reduce con la protección (tratamientos) y con los enemigos
 * naturales (biodiversidad).
 */

import { PESTS } from '../config/model'
import type { PestId, WeatherCondition } from '../domain/types'
import { clamp, clamp01, clamp100 } from '../lib/math'
import { fertilityFactor, moistureFactor } from './factors'

const GROWTH_RATE: Record<PestId, number> = { broca: 0.45, roya: 0.5, 'mancha-hierro': 0.35 }

export interface PestEnvironment {
  temperature: number
  precipitation: number
  humidity: number
  condition: WeatherCondition
  hasFruits: boolean
  isCoffee: boolean
  rustSusceptibility: number
  fertility: number
  moisture: number
  shadeLevel: number
}

/** Favorabilidad ambiental para cada organismo (0 = sin riesgo, ~2 = muy favorable). */
export function pestFavorability(pest: PestId, env: PestEnvironment): number {
  if (!env.isCoffee) return 0
  switch (pest) {
    case 'broca': {
      if (!env.hasFruits) return 0
      const warm = Math.max(0, env.temperature - 20) * 0.25
      const dry = env.condition === 'sequia' || env.condition === 'calor' ? 0.4 : 0
      const wet = env.precipitation > 220 ? -0.2 : 0
      return clamp(0.6 + warm + dry + wet, 0, 2)
    }
    case 'roya': {
      const humid = clamp((env.humidity - 70) / 20, 0, 1.2)
      const rain = Math.min(1, env.precipitation / 250)
      const tempOk = env.temperature >= 17 && env.temperature <= 27 ? 1 : 0.5
      return clamp(env.rustSusceptibility * (0.3 + humid + rain) * tempOk, 0, 2)
    }
    case 'mancha-hierro': {
      return clamp(
        0.3 +
          (1 - fertilityFactor(env.fertility)) * 1.4 +
          (1 - env.shadeLevel) * 0.3 +
          (1 - moistureFactor(env.moisture)) * 0.5,
        0,
        2,
      )
    }
  }
}

export interface PestStepInput {
  pest: PestId
  incidence: number
  favorability: number
  protection: number
  biodiversity: number
  neighborMean: number
  pressureMult: number
  outbreakRoll: number
  outbreakSize: number
}

export interface PestStepResult {
  incidence: number
  outbreak: boolean
}

export function computePestStep(input: PestStepInput): PestStepResult {
  const { incidence, favorability } = input
  if (favorability <= 0) {
    // Sin hospedero adecuado: la población declina.
    return { incidence: clamp100(incidence * 0.55), outbreak: false }
  }
  const biocontrol = clamp01(input.biodiversity * PESTS.biocontrolPerPoint)
  const protection = clamp01(input.protection)
  const growth = incidence * GROWTH_RATE[input.pest] * favorability * (1 - protection) * (1 - biocontrol)
  const mortality = incidence * PESTS.naturalMortality
  const spread = PESTS.spreadRate * input.neighborMean * Math.min(1, favorability) * (1 - protection)
  const outbreakChance = PESTS.baseOutbreakChance * favorability * input.pressureMult * (1 - protection) * (1 - biocontrol * 0.5)
  const outbreak = input.outbreakRoll < outbreakChance
  const next = incidence + growth - mortality + spread + (outbreak ? input.outbreakSize : 0)
  return { incidence: clamp100(next), outbreak }
}
