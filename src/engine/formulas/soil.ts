/**
 * Dinámica del suelo: erosión y fertilidad.
 *
 *   E(t+1) = E(t) + Ganancia de erosión − Estabilización
 *   F(t+1) = F(t) + Recuperación − Degradación
 */

import { EROSION, FERTILITY } from '../config/model'
import type { CropStage, LandUse } from '../domain/types'
import { clamp01, clamp100 } from '../lib/math'

export interface ErosionInput {
  erosion: number
  precipitationMm: number
  rainIntensity: number
  slope: number
  coverLevel: number
  barrierLevel: number
  shadeLevel: number
  landUse: LandUse
  stage: CropStage | null
  reforestationMaturity: number
  multiplier: number
}

export interface ErosionResult {
  erosion: number
  gain: number
  recovery: number
  protection: number
}

/** Erosividad de la lluvia mensual (adimensional). */
export function rainErosivity(precipitationMm: number, rainIntensity: number): number {
  return (
    EROSION.erosivity *
    Math.pow(Math.max(0, precipitationMm) / 100, EROSION.rainExponent) *
    (1 + rainIntensity / 100)
  )
}

/** Protección combinada del suelo (0–1) por prácticas de conservación. */
export function soilProtection(input: Pick<ErosionInput, 'coverLevel' | 'barrierLevel' | 'shadeLevel' | 'landUse' | 'reforestationMaturity'>): number {
  const unprotected =
    (1 - EROSION.coverProtection * input.coverLevel) *
    (1 - EROSION.barrierProtection * input.barrierLevel) *
    (1 - EROSION.shadeProtection * input.shadeLevel) *
    (input.landUse === 'reforestacion' ? 1 - EROSION.reforestProtection * input.reforestationMaturity : 1)
  return clamp01(1 - unprotected)
}

function bareFactor(landUse: LandUse, stage: CropStage | null): number {
  if (landUse === 'barbecho') return stage === 'preparacion' ? EROSION.bareSoilFactor.preparacion : EROSION.bareSoilFactor.barbecho
  if (stage === 'preparacion') return EROSION.bareSoilFactor.preparacion
  if (stage === 'establecimiento') return EROSION.bareSoilFactor.establecimiento
  return 1
}

export function computeErosion(input: ErosionInput): ErosionResult {
  const protection = soilProtection(input)
  const slopeFactor = 0.5 + input.slope
  const gain =
    rainErosivity(input.precipitationMm, input.rainIntensity) *
    slopeFactor *
    (1 - protection) *
    bareFactor(input.landUse, input.stage) *
    input.multiplier
  const recovery = EROSION.naturalRecovery + EROSION.recoveryRate * protection
  return {
    erosion: clamp100(input.erosion + gain - recovery),
    gain,
    recovery,
    protection,
  }
}

export interface FertilityInput {
  fertility: number
  organicPool: number
  chemicalLoad: number
  erosion: number
  erosionGain: number
  drainage: number
  soilContamination: number
  biodiversity: number
  landUse: LandUse
  stage: CropStage | null
  coverLevel: number
  shadeLevel: number
}

export interface FertilityResult {
  fertility: number
  organicPool: number
  recovery: number
  degradation: number
}

export function computeFertility(input: FertilityInput): FertilityResult {
  const organicRelease = input.organicPool * FERTILITY.organicRelease
  const landUseGain =
    input.landUse === 'barbecho' ? FERTILITY.fallowGain : input.landUse === 'reforestacion' ? FERTILITY.reforestGain : 0
  const recovery =
    organicRelease +
    FERTILITY.coverGain * input.coverLevel +
    FERTILITY.shadeGain * input.shadeLevel +
    landUseGain +
    FERTILITY.biotaGain * Math.max(0, input.biodiversity - 50)

  const extraction = input.landUse === 'cafe' && input.stage ? FERTILITY.extraction[input.stage] : 0
  const degradation =
    extraction +
    FERTILITY.erosionLevelLoss * input.erosion +
    FERTILITY.erosionGainLoss * input.erosionGain +
    FERTILITY.leachingLoss * input.drainage * (input.chemicalLoad / 50) +
    FERTILITY.acidification * input.chemicalLoad +
    FERTILITY.contaminationLoss * input.soilContamination

  return {
    fertility: clamp100(input.fertility + recovery - degradation),
    organicPool: Math.max(0, input.organicPool - organicRelease),
    recovery,
    degradation,
  }
}

/** Efecto inmediato de una fertilización química. */
export function applyChemicalFertilizer(
  fertility: number,
  chemicalLoad: number,
  doseMultiplier: number,
): { fertility: number; chemicalLoad: number; excess: number } {
  const points = FERTILITY.chemicalPoints * doseMultiplier
  const room = Math.max(0, FERTILITY.excessThreshold - fertility)
  const used = Math.min(points, room)
  const excess = points - used
  // Solo una fracción del exceso eleva la fertilidad; el resto queda como carga contaminante.
  const newFertility = clamp100(fertility + used + excess * 0.25)
  const newLoad = clamp100(chemicalLoad + FERTILITY.chemicalLoadPerDose * doseMultiplier + excess * 1.5)
  return { fertility: newFertility, chemicalLoad: newLoad, excess }
}

/** Efecto inmediato de una fertilización orgánica (liberación gradual). */
export function applyOrganicFertilizer(
  fertility: number,
  organicPool: number,
  doseMultiplier: number,
): { fertility: number; organicPool: number } {
  return {
    fertility: clamp100(fertility + FERTILITY.organicImmediate * doseMultiplier),
    organicPool: organicPool + FERTILITY.organicPoolPoints * doseMultiplier,
  }
}
