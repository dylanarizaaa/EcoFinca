/**
 * Contaminación y calidad del agua:
 *
 *   C(t+1) = C(t) + Aportes contaminantes − Mitigación
 *   CA(t+1) = CA(t) + k × (Objetivo(C, sedimentos, ronda hídrica) − CA(t))
 */

import { CONTAMINATION } from '../config/model'
import { clamp100 } from '../lib/math'

export interface ContaminationInput {
  contamination: number
  /** Aporte por escorrentía de fertilizantes químicos. */
  chemicalRunoff: number
  /** Aporte por plaguicidas aplicados. */
  pesticides: number
  /** Aporte por sedimentos (erosión). */
  sediments: number
  /** Aporte por aguas residuales del beneficio y domésticas. */
  wastewater: number
  riparianLevel: number
  forestFraction: number
}

export interface ContaminationResult {
  contamination: number
  inputs: number
  mitigation: number
}

export function computeContamination(input: ContaminationInput): ContaminationResult {
  const inputs = input.chemicalRunoff + input.pesticides + input.sediments + input.wastewater
  const mitigationRate =
    CONTAMINATION.selfPurification +
    CONTAMINATION.riparianMitigation * input.riparianLevel +
    CONTAMINATION.forestMitigation * input.forestFraction
  const mitigation = (input.contamination + inputs) * mitigationRate
  return {
    contamination: clamp100(input.contamination + inputs - mitigation),
    inputs,
    mitigation,
  }
}

export interface WaterQualityInput {
  waterQuality: number
  contamination: number
  sediment: number
  riparianLevel: number
}

export function waterQualityTarget(input: Omit<WaterQualityInput, 'waterQuality'>): number {
  return clamp100(
    100 -
      CONTAMINATION.waterQualityContamination * input.contamination -
      CONTAMINATION.waterQualitySediment * input.sediment +
      CONTAMINATION.waterQualityRiparian * input.riparianLevel -
      5,
  )
}

export function computeWaterQuality(input: WaterQualityInput): number {
  const target = waterQualityTarget(input)
  return clamp100(input.waterQuality + CONTAMINATION.waterQualityRate * (target - input.waterQuality))
}

export interface SoilContaminationInput {
  contamination: number
  chemicalLoad: number
  biodiversity: number
  coverLevel: number
}

/** Residuos de agroquímicos en el suelo de una parcela. */
export function computeSoilContamination(input: SoilContaminationInput): number {
  const inputs = input.chemicalLoad * CONTAMINATION.chemicalLoadDecay * CONTAMINATION.soilFromChemicalLoad
  const mitigation =
    input.contamination * CONTAMINATION.soilDecay +
    input.contamination * CONTAMINATION.soilBioremediation * (input.biodiversity / 100) +
    input.coverLevel * 0.5
  return clamp100(input.contamination + inputs - mitigation)
}
