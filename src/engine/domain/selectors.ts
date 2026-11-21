/** Consultas puras sobre el estado del juego (agregados e indicadores). */

import { VARIETIES, FRUIT_STAGES } from '../config/crops'
import { BIODIVERSITY, ESTABLISHMENT_MONTHS } from '../config/model'
import { combinedFactor } from '../formulas/factors'
import { estimateHarvest } from '../formulas/production'
import { clamp01, mean, weightedMean } from '../lib/math'
import type { Establishment, GameState, Indicators, Parcel } from './types'

export function isCoffee(parcel: Parcel): boolean {
  return parcel.landUse === 'cafe' && parcel.crop !== null
}

/** Parcelas con plantas de café sembradas (no en preparación). */
export function plantedParcels(state: Pick<GameState, 'parcels'>): Parcel[] {
  return state.parcels.filter((p) => p.crop !== null && p.crop.variety !== null)
}

export function agriculturalArea(state: Pick<GameState, 'parcels'>): number {
  return state.parcels.reduce((acc, p) => acc + p.areaHa, 0)
}

export function plantedArea(state: Pick<GameState, 'parcels'>): number {
  return plantedParcels(state).reduce((acc, p) => acc + p.areaHa, 0)
}

export function totalFarmArea(state: Pick<GameState, 'parcels' | 'environment'>): number {
  const env = state.environment
  return agriculturalArea(state) + env.forestHa + env.degradedHa + env.restorationHa + env.riparianHa + env.infrastructureHa
}

export function forestFraction(state: Pick<GameState, 'parcels' | 'environment'>): number {
  const reforested = state.parcels
    .filter((p) => p.landUse === 'reforestacion')
    .reduce((acc, p) => acc + p.areaHa * clamp01(p.reforestationAge / BIODIVERSITY.reforestMaturityMonths), 0)
  const restored = state.environment.restorationHa * clamp01(state.environment.restorationAge / BIODIVERSITY.reforestMaturityMonths)
  return clamp01((state.environment.forestHa + reforested + restored) / Math.max(1, totalFarmArea(state)) / 0.3)
}

export function hasFruits(parcel: Parcel): boolean {
  return parcel.crop !== null && FRUIT_STAGES.includes(parcel.crop.stage)
}

/** Indicadores agregados de la finca (promedios ponderados por área). */
export function farmIndicators(state: Pick<GameState, 'parcels' | 'environment'>): Indicators {
  const parcels = state.parcels
  const areas = parcels.map((p) => p.areaHa)
  const planted = plantedParcels(state)
  return {
    fertility: weightedMean(
      parcels.map((p) => p.soil.fertility),
      areas,
    ),
    moisture: weightedMean(
      parcels.map((p) => p.soil.moisture),
      areas,
    ),
    erosion: weightedMean(
      parcels.map((p) => p.soil.erosion),
      areas,
    ),
    waterQuality: state.environment.waterQuality,
    biodiversity: state.environment.biodiversity,
    contamination: state.environment.contamination,
    health: planted.length === 0 ? 0 : mean(planted.map((p) => p.crop?.health ?? 0)),
  }
}

/** Avanza una práctica progresiva un mes. */
export function growEstablishment(e: Establishment, months: number): Establishment {
  if (!e.active) return e
  return { active: true, level: clamp01(e.level + 1 / Math.max(1, months)) }
}

export function establishmentMonths(kind: keyof typeof ESTABLISHMENT_MONTHS): number {
  return ESTABLISHMENT_MONTHS[kind]
}

/** Estimación de cosecha (kg cps) de una parcela con el estado actual. */
export function parcelYieldEstimate(state: Pick<GameState, 'params' | 'climate'>, parcel: Parcel): number {
  const crop = parcel.crop
  if (!crop || !crop.variety || crop.stage === 'preparacion' || crop.stage === 'establecimiento') return 0
  const current = combinedFactor(parcel.soil.fertility, parcel.soil.moisture, crop.health, state.climate.condition)
  return estimateHarvest({
    crop,
    areaHa: parcel.areaHa,
    baseYieldKgHa: state.params.baseYieldKgHa,
    currentFactor: current,
    shadeLevel: parcel.practices.shade.level,
    brocaIncidence: parcel.pests.broca,
  })
}

export function droughtTolerance(parcel: Parcel): number {
  return parcel.crop?.variety ? VARIETIES[parcel.crop.variety].droughtTolerance : 0
}

export function rustSusceptibility(parcel: Parcel): number {
  return parcel.crop?.variety ? VARIETIES[parcel.crop.variety].rustSusceptibility : 0
}

export function maxPestIncidence(parcel: Parcel): number {
  return Math.max(parcel.pests.broca, parcel.pests.roya, parcel.pests['mancha-hierro'])
}

export function findParcel(state: Pick<GameState, 'parcels'>, id: string): Parcel | undefined {
  return state.parcels.find((p) => p.id === id)
}

/** Parcelas cuya cosecha está lista. */
export function harvestReadyParcels(state: Pick<GameState, 'parcels'>): Parcel[] {
  return state.parcels.filter((p) => p.crop?.stage === 'cosecha')
}
