/**
 * Creación de una partida nueva a partir de la configuración elegida.
 * La configuración modifica efectivamente el estado inicial: escenario,
 * dificultad, presupuesto, duración, número de parcelas y semilla.
 */

import { REPRODUCTIVE_STAGES } from '../config/crops'
import { DEFAULT_PARAMS, DIFFICULTY, SCHEMA_VERSION } from '../config/model'
import { GameConfigSchema } from '../domain/schemas'
import type { CropState, GameConfig, GameState, ModelParams, Parcel } from '../domain/types'
import { computeFarmBiodiversity } from '../formulas/biodiversity'
import { combinedFactor } from '../formulas/factors'
import { computeEquity } from '../formulas/economy'
import { calendarForTurn } from '../lib/calendar'
import { round } from '../lib/math'
import { hashString, mulberry32, type Rng } from '../lib/rng'
import { NEUTRAL_MODIFIERS } from '../events/engine'
import { generateClimate } from '../simulation/climate'
import { buildRecord } from '../simulation/turn'
import { generateLayout, FARM_TOTAL_HA, PRODUCTIVE_HA } from './layout'
import { SCENARIOS, type Range } from './scenarios'
import { parcelYieldEstimate } from '../domain/selectors'

const between = (rng: Rng, [min, max]: Range) => min + (max - min) * rng()

export interface CreateGameOptions {
  id?: string
  now?: string
}

function initialReproMonths(stage: CropState['stage'], monthsInStage: number, params: ModelParams): number {
  const d = params.stageDurations
  switch (stage) {
    case 'floracion':
      return monthsInStage
    case 'fructificacion':
      return d.floracion + monthsInStage
    case 'maduracion':
      return d.floracion + d.fructificacion + monthsInStage
    case 'cosecha':
      return d.floracion + d.fructificacion + d.maduracion
    default:
      return 0
  }
}

export function createGame(config: GameConfig, params: ModelParams = DEFAULT_PARAMS, options: CreateGameOptions = {}): GameState {
  const parsed = GameConfigSchema.parse(config) as GameConfig
  const scenario = SCENARIOS[parsed.scenarioId]
  const diff = DIFFICULTY[parsed.difficulty]
  const rng = mulberry32(hashString(`${parsed.seed}|init|${parsed.scenarioId}`))
  const layout = generateLayout(parsed.parcelCount, parsed.seed)
  const barrierCount = Math.round(scenario.barrierParcels * layout.length)

  const parcels: Parcel[] = layout.map((geo, index) => {
    const seed = scenario.crop.pattern[index % scenario.crop.pattern.length] ?? 'barbecho'
    const soil = {
      fertility: round(between(rng, scenario.soil.fertility), 2),
      moisture: round(between(rng, scenario.soil.moisture), 2),
      erosion: round(between(rng, scenario.soil.erosion) * (0.85 + geo.slope * 0.4), 2),
      contamination: round(between(rng, scenario.soil.contamination), 2),
      organicPool: round(between(rng, scenario.soil.organicPool), 2),
      chemicalLoad: parsed.scenarioId === 'suelo-degradado' ? round(10 + rng() * 10, 2) : round(rng() * 6, 2),
    }
    let crop: CropState | null = null
    if (seed !== 'barbecho') {
      const age =
        seed.stage === 'establecimiento' ? seed.months + 1 : Math.round(between(rng, scenario.crop.age))
      const harvests = seed.stage === 'establecimiento' ? 0 : Math.max(1, Math.floor((age - 20) / 12))
      const health = round(between(rng, scenario.crop.health), 2)
      const reproMonths = initialReproMonths(seed.stage, seed.months, params)
      const m0 = combinedFactor(soil.fertility, soil.moisture, health, 'lluvia-moderada')
      crop = {
        variety: scenario.crop.variety,
        stage: seed.stage,
        monthsInStage: seed.months,
        ageMonths: age,
        health,
        harvests,
        reproFactorSum: REPRODUCTIVE_STAGES.includes(seed.stage) || seed.stage === 'cosecha' ? round(m0 * reproMonths, 4) : 0,
        reproMonths,
        estimatedYieldKg: 0,
        accumulatedKg: 0,
      }
    }
    const roya = parsed.scenarioId === 'suelo-degradado' ? 8 + rng() * 8 : rng() * 3
    const parcel: Parcel = {
      id: geo.id,
      name: geo.name,
      areaHa: geo.areaHa,
      slope: geo.slope,
      shape: geo.shape,
      centroid: geo.centroid,
      neighbors: geo.neighbors,
      landUse: crop ? 'cafe' : 'barbecho',
      soil,
      biodiversity: round(between(rng, scenario.biodiversity), 2),
      crop,
      practices: {
        cover: { active: false, level: 0 },
        barrier: index < barrierCount ? { active: true, level: 1 } : { active: false, level: 0 },
        shade: { active: false, level: 0 },
      },
      pests: {
        broca: crop ? round(rng() * 4, 2) : 0,
        roya: crop ? round(roya, 2) : 0,
        'mancha-hierro': crop ? round(parsed.scenarioId === 'suelo-degradado' ? 6 + rng() * 6 : rng() * 3, 2) : 0,
      },
      protection: { monthsRemaining: 0, method: null },
      reforestationAge: 0,
      actionsThisTurn: [],
      irrigationMm: 0,
      totalProductionKg: 0,
    }
    return parcel
  })

  const env = scenario.environment
  const riparianHa = 0.3
  const infrastructureHa = round(FARM_TOTAL_HA - PRODUCTIVE_HA - env.forestHa - env.degradedHa - riparianHa, 2)
  const calendar = calendarForTurn(parsed.startYear, 0)
  const climate = generateClimate({
    seed: parsed.seed,
    turn: 0,
    month: calendar.month,
    scenario: scenario.climate,
    difficulty: parsed.difficulty,
    modifiers: NEUTRAL_MODIFIERS,
  })
  const now = options.now ?? new Date(0).toISOString()

  const draft: Omit<GameState, 'baseline'> = {
    schemaVersion: SCHEMA_VERSION,
    id: options.id ?? `game-${parsed.seed}`,
    config: parsed,
    params: structuredClone(params),
    turn: 0,
    calendar,
    status: 'activo',
    parcels,
    environment: {
      waterQuality: env.waterQuality,
      contamination: env.contamination,
      biodiversity: 0,
      streamFlow: env.streamFlow,
      sediment: 0,
      forestHa: env.forestHa,
      degradedHa: env.degradedHa,
      restorationHa: 0,
      restorationAge: 0,
      riparianHa,
      infrastructureHa,
      // Protección parcial preexistente: solo crece si el jugador inicia un programa de conservación.
      riparian: { active: false, level: env.riparianLevel },
    },
    infrastructure: {
      irrigation: 'gravedad',
      ecoProcessing: false,
      certified: false,
      reservoirCapacity: scenario.infrastructure.reservoirCapacity,
      catchmentM2: scenario.infrastructure.catchmentM2,
      streamConcession: scenario.infrastructure.streamConcession,
      investedValue: 0,
      pendingCompost: [],
    },
    inventory: {
      money: parsed.initialBudget,
      agua: scenario.infrastructure.initialWater,
      ...scenario.inventory,
    },
    labor: { available: params.baseLabor + diff.labor, hired: 0 },
    market: { coffeeIndex: 1, inputIndex: 1 },
    climate,
    activeEvents: [],
    eventLog: [],
    eventCooldowns: {},
    transactions: [],
    history: [],
    cycles: [],
    tracker: {
      waterUsed: 0,
      harvestedKg: 0,
      income: 0,
      expenses: 0,
      processingLoad: 0,
      pesticideLoad: 0,
      chemicalFertilizerBultos: 0,
    },
    counters: {
      negativeMoneyMonths: 0,
      collapseMonths: 0,
      emptyWaterMonths: 0,
      totalProductionKg: 0,
      totalIncome: 0,
      totalExpenses: 0,
      totalWaterUsed: 0,
      initialEquity: 0,
      nextId: 0,
    },
    outcome: null,
    createdAt: now,
    updatedAt: now,
  }

  draft.environment.biodiversity = round(
    computeFarmBiodiversity({
      parcels: draft.parcels,
      forestHa: draft.environment.forestHa,
      degradedHa: draft.environment.degradedHa,
      restorationHa: 0,
      restorationMaturity: 0,
      riparianHa,
      riparianLevel: draft.environment.riparian.level,
      waterQuality: draft.environment.waterQuality,
    }),
    2,
  )
  for (const p of draft.parcels) {
    if (p.crop) p.crop.estimatedYieldKg = round(parcelYieldEstimate(draft, p), 1)
  }
  draft.counters.initialEquity = Math.round(computeEquity(draft))
  return { ...draft, baseline: buildRecord(draft) }
}
