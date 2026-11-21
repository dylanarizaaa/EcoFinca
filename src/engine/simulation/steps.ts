/**
 * Pasos del ciclo de simulación mensual. Cada paso recibe el borrador del
 * estado (ya clonado por `advanceTurn`) y lo actualiza de forma determinista.
 * El orden de ejecución está documentado en turn.ts y en docs/SIMULATION-MODEL.md.
 */

import { PEST_IDS, REPRODUCTIVE_STAGES, stageDuration } from '../config/crops'
import { CERTIFICATION, INVESTMENTS, MARKET, STORAGE_LOSS } from '../config/economy'
import {
  BIODIVERSITY,
  CONTAMINATION,
  DIFFICULTY,
  ESTABLISHMENT_MONTHS,
  HEALTH,
  PESTS,
  WATER_RESOURCES,
} from '../config/model'
import { addTransaction } from '../domain/ledger'
import {
  agriculturalArea,
  droughtTolerance,
  forestFraction,
  growEstablishment,
  hasFruits,
  parcelYieldEstimate,
  rustSusceptibility,
} from '../domain/selectors'
import type { CropStage, GameState, Modifiers, Parcel, PestId, TurnMessage } from '../domain/types'
import { computeFarmBiodiversity, biodiversityTarget, computeBiodiversity } from '../formulas/biodiversity'
import { computeContamination, computeSoilContamination, computeWaterQuality } from '../formulas/contamination'
import { combinedFactor, moistureFactor } from '../formulas/factors'
import { computeHealth } from '../formulas/health'
import { computePestStep, pestFavorability } from '../formulas/pests'
import { computeErosion, computeFertility } from '../formulas/soil'
import { computeMoisture, computeStreamFlow } from '../formulas/water'
import { clamp, clamp01, clamp100, mean, round } from '../lib/math'
import { normal, rngFor } from '../lib/rng'
import { computeSustainability } from '../rules/scoring'
import { CLIMATE_PROFILE, SCENARIOS } from '../scenarios/scenarios'

export interface ParcelStepStats {
  erosionGain: number
  chemicalRunoff: number
  barrierLevel: number
}

const NEXT_STAGE: Partial<Record<CropStage, CropStage>> = {
  establecimiento: 'vegetativo',
  vegetativo: 'floracion',
  floracion: 'fructificacion',
  fructificacion: 'maduracion',
  maduracion: 'cosecha',
}

/** Paso 3–4: agua del suelo, erosión, fertilidad y cultivos de cada parcela. */
export function stepParcels(draft: GameState, mods: Modifiers, messages: TurnMessage[]): ParcelStepStats {
  const climate = draft.climate
  const stats: ParcelStepStats = { erosionGain: 0, chemicalRunoff: 0, barrierLevel: 0 }
  const agriArea = Math.max(0.01, agriculturalArea(draft))

  for (const p of draft.parcels) {
    const crop = p.crop
    const stage = crop?.stage ?? null
    const reforestMaturity = p.landUse === 'reforestacion' ? clamp01(p.reforestationAge / BIODIVERSITY.reforestMaturityMonths) : 0
    const canopy = Math.max(p.practices.shade.level, reforestMaturity * 0.8)
    const bareSoil = p.landUse === 'barbecho' || stage === 'preparacion'

    // Humedad: H + P − Escorrentía + Riego − ET − Drenaje
    const water = computeMoisture({
      moisture: p.soil.moisture,
      precipitationMm: climate.precipitation,
      irrigationMm: p.irrigationMm,
      slope: p.slope,
      rainIntensity: climate.rainIntensity,
      erosion: p.soil.erosion,
      coverLevel: p.practices.cover.level,
      barrierLevel: p.practices.barrier.level,
      shadeLevel: canopy,
      temperature: climate.temperature,
      condition: climate.condition,
      bareSoil,
    })

    // Erosión
    const erosion = computeErosion({
      erosion: p.soil.erosion,
      precipitationMm: climate.precipitation,
      rainIntensity: climate.rainIntensity,
      slope: p.slope,
      coverLevel: p.practices.cover.level,
      barrierLevel: p.practices.barrier.level,
      shadeLevel: p.practices.shade.level,
      landUse: p.landUse,
      stage,
      reforestationMaturity: reforestMaturity,
      multiplier: mods.erosionMult,
    })

    // Fertilidad: F + Recuperación − Degradación
    const fertility = computeFertility({
      fertility: p.soil.fertility,
      organicPool: p.soil.organicPool,
      chemicalLoad: p.soil.chemicalLoad,
      erosion: p.soil.erosion,
      erosionGain: erosion.gain,
      drainage: water.drainage,
      soilContamination: p.soil.contamination,
      biodiversity: p.biodiversity,
      landUse: p.landUse,
      stage,
      coverLevel: p.practices.cover.level,
      shadeLevel: p.practices.shade.level,
    })

    // Carga química transportada por escorrentía hacia la quebrada.
    const runoffFraction = water.precipitation > 0 ? water.runoff / water.precipitation : 0
    const runoffLoad = p.soil.chemicalLoad * CONTAMINATION.chemicalRunoffFactor * (0.3 + runoffFraction)
    stats.chemicalRunoff += runoffLoad * (p.areaHa / agriArea)
    stats.erosionGain += erosion.gain * (p.areaHa / agriArea)
    stats.barrierLevel += p.practices.barrier.level * (p.areaHa / agriArea)

    p.soil.contamination = round(
      computeSoilContamination({
        contamination: p.soil.contamination,
        chemicalLoad: p.soil.chemicalLoad,
        biodiversity: p.biodiversity,
        coverLevel: p.practices.cover.level,
      }),
      2,
    )
    p.soil.chemicalLoad = round(clamp100(p.soil.chemicalLoad * (1 - CONTAMINATION.chemicalLoadDecay)), 2)
    p.soil.moisture = round(water.moisture, 2)
    p.soil.erosion = round(erosion.erosion, 2)
    p.soil.fertility = round(fertility.fertility, 2)
    p.soil.organicPool = round(fertility.organicPool, 2)

    if (crop && crop.variety) stepCrop(draft, p, messages)
    else if (crop && crop.stage === 'preparacion') crop.monthsInStage += 1

    if (p.landUse === 'reforestacion') p.reforestationAge += 1

    // Prácticas progresivas
    p.practices.cover = growEstablishment(p.practices.cover, ESTABLISHMENT_MONTHS.cover)
    p.practices.barrier = growEstablishment(p.practices.barrier, ESTABLISHMENT_MONTHS.barrier)
    p.practices.shade = growEstablishment(p.practices.shade, ESTABLISHMENT_MONTHS.shade)

    // Biodiversidad de la parcela
    const target = biodiversityTarget({
      landUse: p.landUse,
      shadeLevel: p.practices.shade.level,
      coverLevel: p.practices.cover.level,
      barrierLevel: p.practices.barrier.level,
      reforestationAge: p.reforestationAge,
      chemicalProtection: p.protection.method === 'quimico' && p.protection.monthsRemaining > 0,
      soilContamination: p.soil.contamination,
      erosion: p.soil.erosion,
    })
    p.biodiversity = round(computeBiodiversity(p.biodiversity, target), 2)
  }
  return stats
}

/** Avance fenológico, salud y producción de un cafetal. */
function stepCrop(draft: GameState, p: Parcel, messages: TurnMessage[]): void {
  const crop = p.crop
  if (!crop || !crop.variety) return
  const climate = draft.climate
  crop.ageMonths += 1

  const health = computeHealth({
    health: crop.health,
    moisture: p.soil.moisture,
    fertility: p.soil.fertility,
    temperature: climate.temperature,
    shadeLevel: p.practices.shade.level,
    droughtTolerance: droughtTolerance(p),
    pests: p.pests,
  })
  crop.health = round(health.health, 2)

  if (crop.stage === 'establecimiento' && crop.health < HEALTH.establishmentDeath) {
    messages.push({
      severity: 'peligro',
      text: `Los colinos de ${p.name} (${p.id}) murieron por estrés. El lote quedó en barbecho.`,
    })
    p.crop = null
    p.landUse = 'barbecho'
    return
  }

  if (REPRODUCTIVE_STAGES.includes(crop.stage)) {
    crop.reproFactorSum = round(
      crop.reproFactorSum + combinedFactor(p.soil.fertility, p.soil.moisture, crop.health, climate.condition),
      4,
    )
    crop.reproMonths += 1
  }

  const stalled =
    (crop.stage === 'establecimiento' || crop.stage === 'vegetativo') && moistureFactor(p.soil.moisture) < 0.4
  if (!stalled) crop.monthsInStage += 1

  const duration = stageDuration(crop.stage, draft.params.stageDurations, crop.harvests)

  if (crop.stage === 'cosecha') {
    if (crop.monthsInStage >= duration) {
      const lost = round(parcelYieldEstimate(draft, p), 0)
      messages.push({
        severity: 'peligro',
        text: `Se perdió la cosecha de ${p.name} (${p.id}): ~${lost.toLocaleString('es-CO')} kg cayeron al suelo y alimentan la broca.`,
      })
      p.pests.broca = clamp100(p.pests.broca + 20)
      crop.harvests += 1
      crop.stage = 'vegetativo'
      crop.monthsInStage = 0
      crop.reproFactorSum = 0
      crop.reproMonths = 0
    } else if (crop.monthsInStage === 1) {
      messages.push({
        severity: 'advertencia',
        text: `Último mes para cosechar ${p.name} (${p.id}): el fruto sobremaduro pierde 30 % del volumen.`,
      })
    }
  } else if (crop.monthsInStage >= duration) {
    const next = NEXT_STAGE[crop.stage]
    if (next) {
      crop.stage = next
      crop.monthsInStage = 0
      if (next === 'floracion') {
        crop.reproFactorSum = 0
        crop.reproMonths = 0
      }
      if (next === 'cosecha') {
        messages.push({ severity: 'positivo', text: `¡El café de ${p.name} (${p.id}) está listo para cosechar!` })
      }
    }
  }
  crop.estimatedYieldKg = round(parcelYieldEstimate(draft, p), 1)
}

/** Paso 5: plagas y enfermedades (crecimiento, propagación y brotes). */
export function stepPests(draft: GameState, mods: Modifiers, messages: TurnMessage[]): void {
  const climate = draft.climate
  const rng = rngFor(draft.config.seed, draft.turn, 'pests')
  const pressure = DIFFICULTY[draft.config.difficulty].pests * mods.pestPressureMult
  const snapshot = new Map(draft.parcels.map((p) => [p.id, { ...p.pests }]))

  for (const p of draft.parcels) {
    const protection =
      p.protection.monthsRemaining > 0
        ? p.protection.method === 'quimico'
          ? PESTS.chemical.protection
          : PESTS.integrated.protection
        : 0
    const isCoffee = p.landUse === 'cafe' && p.crop !== null && p.crop.variety !== null
    for (const pest of PEST_IDS) {
      const roll = rng()
      const size = PESTS.outbreakMin + rng() * (PESTS.outbreakMax - PESTS.outbreakMin)
      const neighbors = p.neighbors.map((n) => snapshot.get(n)?.[pest] ?? 0)
      const favor = pestFavorability(pest, {
        temperature: climate.temperature,
        precipitation: climate.precipitation,
        humidity: climate.humidity,
        condition: climate.condition,
        hasFruits: hasFruits(p),
        isCoffee,
        rustSusceptibility: rustSusceptibility(p),
        fertility: p.soil.fertility,
        moisture: p.soil.moisture,
        shadeLevel: p.practices.shade.level,
      })
      const result = computePestStep({
        pest,
        incidence: p.pests[pest],
        favorability: favor,
        protection,
        biodiversity: p.biodiversity,
        neighborMean: neighbors.length ? mean(neighbors) : 0,
        pressureMult: pressure,
        outbreakRoll: roll,
        outbreakSize: size,
      })
      p.pests[pest] = round(result.incidence, 2)
      if (result.outbreak) {
        messages.push({ severity: 'advertencia', text: `Nuevo foco de ${pestName(pest)} en ${p.name} (${p.id}).` })
      }
    }
    if (p.protection.monthsRemaining > 0) {
      p.protection.monthsRemaining -= 1
      if (p.protection.monthsRemaining === 0) p.protection.method = null
    }
  }
}

function pestName(pest: PestId): string {
  return pest === 'broca' ? 'broca' : pest === 'roya' ? 'roya' : 'mancha de hierro'
}

/** Paso 2: caudal de la quebrada y balance del reservorio. */
export function stepWaterResources(draft: GameState, mods: Modifiers, messages: TurnMessage[]): void {
  const env = draft.environment
  const climate = draft.climate
  const baseNormal = CLIMATE_PROFILE.precipitation[climate.month] ?? 150
  env.streamFlow = round(
    computeStreamFlow(
      {
        flow: env.streamFlow,
        precipitationRatio: climate.precipitation / baseNormal,
        forestFraction: forestFraction(draft),
        riparianLevel: env.riparian.level,
        modifier: mods.streamFlowMult,
      },
      {
        rate: WATER_RESOURCES.streamFlowRate,
        base: WATER_RESOURCES.streamBase,
        precip: WATER_RESOURCES.streamPrecip,
        forest: WATER_RESOURCES.streamForest,
        riparian: WATER_RESOURCES.streamRiparian,
      },
    ),
    2,
  )
  const infra = draft.infrastructure
  const inflow = (infra.streamConcession * env.streamFlow) / 100 + (climate.precipitation * infra.catchmentM2) / 1000
  const domestic = WATER_RESOURCES.domesticUse
  const available = draft.inventory.agua + inflow
  const used = Math.min(domestic, available)
  draft.inventory.agua = round(clamp(available - used, 0, infra.reservoirCapacity), 1)
  draft.tracker.waterUsed += used
  draft.counters.totalWaterUsed += used
  if (draft.inventory.agua < 1) {
    draft.counters.emptyWaterMonths += 1
    messages.push({ severity: 'peligro', text: 'El reservorio quedó vacío: no habrá agua para riego ni beneficio.' })
  }
}

/** Paso 6: contaminación, calidad del agua, ronda hídrica y biodiversidad. */
export function stepEnvironment(draft: GameState, stats: ParcelStepStats): void {
  const env = draft.environment
  const forest = forestFraction(draft)
  const sediments = stats.erosionGain * CONTAMINATION.sedimentFactor * (1 - CONTAMINATION.barrierTrapping * stats.barrierLevel)
  const wastewater =
    draft.tracker.processingLoad +
    (draft.infrastructure.ecoProcessing ? CONTAMINATION.domesticLoadEco : CONTAMINATION.domesticLoad)

  const contamination = computeContamination({
    contamination: env.contamination,
    chemicalRunoff: stats.chemicalRunoff,
    pesticides: draft.tracker.pesticideLoad,
    sediments,
    wastewater,
    riparianLevel: env.riparian.level,
    forestFraction: forest,
  })
  env.contamination = round(contamination.contamination, 2)
  env.sediment = round(clamp100(stats.erosionGain * 8 * (1 - CONTAMINATION.barrierTrapping * stats.barrierLevel)), 2)
  env.waterQuality = round(
    computeWaterQuality({
      waterQuality: env.waterQuality,
      contamination: env.contamination,
      sediment: env.sediment,
      riparianLevel: env.riparian.level,
    }),
    2,
  )
  env.riparian = growEstablishment(env.riparian, ESTABLISHMENT_MONTHS.riparian)

  if (env.restorationHa > 0) {
    env.restorationAge += 1
    if (env.restorationAge >= BIODIVERSITY.reforestMaturityMonths) {
      env.forestHa = round(env.forestHa + env.restorationHa, 2)
      env.restorationHa = 0
      env.restorationAge = 0
    }
  }

  env.biodiversity = round(
    computeFarmBiodiversity({
      parcels: draft.parcels,
      forestHa: env.forestHa,
      degradedHa: env.degradedHa,
      restorationHa: env.restorationHa,
      restorationMaturity: env.restorationAge / BIODIVERSITY.reforestMaturityMonths,
      riparianHa: env.riparianHa,
      riparianLevel: env.riparian.level,
      waterQuality: env.waterQuality,
    }),
    2,
  )
}

/** Paso 7: costos fijos, mantenimiento, almacenamiento, compost y mercado. */
export function stepEconomy(draft: GameState, messages: TurnMessage[]): void {
  const diff = DIFFICULTY[draft.config.difficulty]
  const fixed =
    draft.params.monthlyFixedCost *
    diff.fixedCost *
    SCENARIOS[draft.config.scenarioId].fixedCostMult *
    draft.market.inputIndex
  addTransaction(draft, 'gasto', 'costos-fijos', 'Costos fijos de operación (administración, servicios, personal)', fixed)

  const infra = draft.infrastructure
  let maintenance = 0
  if (infra.irrigation === 'goteo') maintenance += INVESTMENTS.riegoGoteo.monthlyMaintenance
  if (infra.ecoProcessing) maintenance += INVESTMENTS.beneficioEcologico.monthlyMaintenance
  if (infra.reservoirCapacity > 1000) maintenance += INVESTMENTS.reservorio.monthlyMaintenance
  if (infra.certified) maintenance += INVESTMENTS.certificacion.monthlyMaintenance
  if (maintenance > 0) addTransaction(draft, 'gasto', 'costos-fijos', 'Mantenimiento de infraestructura', maintenance)

  if (draft.inventory.cafe > 0) {
    draft.inventory.cafe = round(draft.inventory.cafe * (1 - STORAGE_LOSS), 1)
  }

  const ready = infra.pendingCompost.filter((c) => c.readyTurn <= draft.turn)
  if (ready.length > 0) {
    const bultos = round(ready.reduce((a, c) => a + c.bultos, 0), 1)
    draft.inventory.abonoOrganico = round(draft.inventory.abonoOrganico + bultos, 1)
    infra.pendingCompost = infra.pendingCompost.filter((c) => c.readyTurn > draft.turn)
    messages.push({ severity: 'positivo', text: `El compost de pulpa está listo: +${bultos} bultos de abono orgánico.` })
  }

  if (infra.certified && computeSustainability(draft) < CERTIFICATION.minSustainabilityToKeep) {
    infra.certified = false
    messages.push({
      severity: 'peligro',
      text: 'Se perdió la certificación sostenible: la sostenibilidad cayó por debajo del mínimo exigido.',
    })
  }

  // Mercado: índice del café con reversión a la media; insumos con inflación.
  const rng = rngFor(draft.config.seed, draft.turn, 'market')
  const shock = normal(rng) * diff.priceVolatility
  draft.market.coffeeIndex = round(
    clamp(
      draft.market.coffeeIndex + MARKET.meanReversion * (1 - draft.market.coffeeIndex) + shock,
      MARKET.minIndex,
      MARKET.maxIndex,
    ),
    4,
  )
  draft.market.inputIndex = round(draft.market.inputIndex * (1 + MARKET.monthlyInflation), 4)

  if (draft.inventory.money < 0) {
    draft.counters.negativeMoneyMonths += 1
    messages.push({
      severity: 'peligro',
      text: `Saldo negativo (${draft.counters.negativeMoneyMonths} mes(es)). Vende café o reduce gastos para evitar la quiebra.`,
    })
  } else {
    draft.counters.negativeMoneyMonths = 0
  }
}
