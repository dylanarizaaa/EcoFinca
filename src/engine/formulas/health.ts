/**
 * Salud del cultivo:
 *
 *   S(t+1) = S(t) + Recuperación − Daño
 *
 * El daño proviene del estrés hídrico, el calor, la baja fertilidad, el
 * encharcamiento y la incidencia de plagas y enfermedades.
 */

import { HEALTH, PESTS } from '../config/model'
import type { PestId } from '../domain/types'
import { clamp100 } from '../lib/math'
import { fertilityFactor, moistureFactor } from './factors'

export interface HealthInput {
  health: number
  moisture: number
  fertility: number
  temperature: number
  shadeLevel: number
  droughtTolerance: number
  pests: Record<PestId, number>
}

export interface HealthResult {
  health: number
  damage: number
  recovery: number
  breakdown: { water: number; heat: number; nutrition: number; waterlogging: number; pests: number }
}

export function computeHealth(input: HealthInput): HealthResult {
  const water = HEALTH.waterStressDamage * (1 - moistureFactor(input.moisture)) * (1 - input.droughtTolerance)
  const heat =
    input.temperature > HEALTH.heatThreshold
      ? (input.temperature - HEALTH.heatThreshold) * HEALTH.heatDamagePerDegree * (1 - 0.5 * input.shadeLevel)
      : 0
  const nutrition = HEALTH.lowFertilityDamage * (1 - fertilityFactor(input.fertility))
  const waterlogging = input.moisture > HEALTH.waterloggingThreshold ? HEALTH.waterloggingDamage : 0
  const pests =
    input.pests.broca * PESTS.healthDamage.broca +
    input.pests.roya * PESTS.healthDamage.roya +
    input.pests['mancha-hierro'] * PESTS.healthDamage['mancha-hierro']
  const damage = water + heat + nutrition + waterlogging + pests
  // La recuperación es mayor cuando el daño es bajo.
  const stressFactor = Math.max(HEALTH.stressFloor, 1 - damage / HEALTH.stressDivisor)
  const recovery = (100 - input.health) * HEALTH.recoveryRate * stressFactor
  return {
    health: clamp100(input.health + recovery - damage),
    damage,
    recovery,
    breakdown: { water, heat, nutrition, waterlogging, pests },
  }
}
