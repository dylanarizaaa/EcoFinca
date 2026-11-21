/**
 * Biodiversidad: cada parcela converge gradualmente hacia un valor objetivo
 * determinado por su uso del suelo y sus prácticas.
 *
 *   B(t+1) = B(t) + k × (Objetivo − B(t))
 */

import { BIODIVERSITY } from '../config/model'
import type { LandUse } from '../domain/types'
import { clamp01, clamp100 } from '../lib/math'

export interface BiodiversityTargetInput {
  landUse: LandUse
  shadeLevel: number
  coverLevel: number
  barrierLevel: number
  reforestationAge: number
  chemicalProtection: boolean
  soilContamination: number
  erosion: number
}

export function biodiversityTarget(input: BiodiversityTargetInput): number {
  const maturity = clamp01(input.reforestationAge / BIODIVERSITY.reforestMaturityMonths)
  let target: number = BIODIVERSITY.base[input.landUse]
  if (input.landUse === 'reforestacion') target += BIODIVERSITY.reforestMaturityBonus * maturity
  target += BIODIVERSITY.shadeBonus * input.shadeLevel
  target += BIODIVERSITY.coverBonus * input.coverLevel
  target += BIODIVERSITY.barrierBonus * input.barrierLevel
  if (input.chemicalProtection) target -= BIODIVERSITY.chemicalPenalty
  target -= BIODIVERSITY.contaminationPenalty * input.soilContamination
  target -= BIODIVERSITY.erosionPenalty * input.erosion
  return clamp100(target)
}

export function computeBiodiversity(current: number, target: number): number {
  return clamp100(current + BIODIVERSITY.rate * (target - current))
}

export interface FarmBiodiversityInput {
  parcels: { areaHa: number; biodiversity: number }[]
  forestHa: number
  degradedHa: number
  restorationHa: number
  restorationMaturity: number
  riparianHa: number
  riparianLevel: number
  waterQuality: number
}

/** Biodiversidad de la finca: media ponderada por área de todos los ecosistemas. */
export function computeFarmBiodiversity(input: FarmBiodiversityInput): number {
  const forestValue = BIODIVERSITY.forestBase + BIODIVERSITY.forestRiparianBonus * input.riparianLevel
  const riparianValue =
    (BIODIVERSITY.riparianBase + BIODIVERSITY.riparianBonus * input.riparianLevel) * (0.5 + 0.5 * (input.waterQuality / 100))
  const restorationValue =
    BIODIVERSITY.degradedArea + (BIODIVERSITY.forestBase - BIODIVERSITY.degradedArea) * clamp01(input.restorationMaturity)

  let total = 0
  let area = 0
  for (const p of input.parcels) {
    total += p.areaHa * p.biodiversity
    area += p.areaHa
  }
  total += input.forestHa * forestValue
  total += input.degradedHa * BIODIVERSITY.degradedArea
  total += input.restorationHa * restorationValue
  total += input.riparianHa * riparianValue
  area += input.forestHa + input.degradedHa + input.restorationHa + input.riparianHa
  return area === 0 ? 0 : clamp100(total / area)
}
