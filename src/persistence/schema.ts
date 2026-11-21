/**
 * Esquema Zod del estado guardado. Valida cualquier partida leída de
 * IndexedDB antes de entregarla al motor: un dato corrupto o de una versión
 * desconocida nunca llega a la simulación.
 */

import { z } from 'zod'
import {
  DifficultySchema,
  GameConfigSchema,
  ModelParamsSchema,
  VarietySchema,
} from '@/engine/domain/schemas'
import type { GameState } from '@/engine'

const pct = z.number().min(0).max(100)
const nonNeg = z.number().min(0)
const point = z.tuple([z.number(), z.number()])
const stage = z.enum(['preparacion', 'establecimiento', 'vegetativo', 'floracion', 'fructificacion', 'maduracion', 'cosecha'])
const condition = z.enum(['soleado', 'nublado', 'lluvia-moderada', 'lluvia-intensa', 'sequia', 'calor'])
const classification = z.enum(['Excelente', 'Buena', 'Aceptable', 'Deficiente'])
const severity = z.enum(['info', 'positivo', 'advertencia', 'peligro'])
const parcelAction = z.enum([
  'preparar',
  'sembrar',
  'fertilizar',
  'regar',
  'controlPlagas',
  'cobertura',
  'barreras',
  'sombrio',
  'mantenimiento',
  'cosechar',
  'reforestar',
])
const establishment = z.object({ active: z.boolean(), level: z.number().min(0).max(1) })

const scores = z.object({
  productivity: pct,
  profitability: pct,
  sustainability: pct,
  global: pct,
  classification,
})

const indicators = z.object({
  fertility: pct,
  moisture: pct,
  erosion: pct,
  waterQuality: pct,
  biodiversity: pct,
  contamination: pct,
  health: pct,
})

const monthlyRecord = indicators.extend({
  turn: z.number().int(),
  year: z.number().int(),
  month: z.number().int().min(0).max(11),
  cycle: z.number().int().min(1),
  precipitation: nonNeg,
  temperature: z.number(),
  condition,
  waterUsed: nonNeg,
  waterStock: nonNeg,
  production: nonNeg,
  income: nonNeg,
  expenses: nonNeg,
  money: z.number(),
  cumulativeProfit: z.number(),
  coffeePrice: nonNeg,
  scores,
})

const crop = z.object({
  variety: VarietySchema.nullable(),
  stage,
  monthsInStage: z.number().int().min(0),
  ageMonths: z.number().int().min(0),
  health: pct,
  harvests: z.number().int().min(0),
  reproFactorSum: nonNeg,
  reproMonths: z.number().int().min(0),
  estimatedYieldKg: nonNeg,
  accumulatedKg: nonNeg,
})

const parcel = z.object({
  id: z.string(),
  name: z.string(),
  areaHa: z.number().positive(),
  slope: z.number().min(0).max(1),
  shape: z.array(point).min(3),
  centroid: point,
  neighbors: z.array(z.string()),
  landUse: z.enum(['cafe', 'barbecho', 'reforestacion']),
  soil: z.object({
    fertility: pct,
    moisture: pct,
    erosion: pct,
    contamination: pct,
    organicPool: nonNeg,
    chemicalLoad: pct,
  }),
  biodiversity: pct,
  crop: crop.nullable(),
  practices: z.object({ cover: establishment, barrier: establishment, shade: establishment }),
  pests: z.object({ broca: pct, roya: pct, 'mancha-hierro': pct }),
  protection: z.object({
    monthsRemaining: z.number().int().min(0),
    method: z.enum(['quimico', 'integrado']).nullable(),
  }),
  reforestationAge: z.number().int().min(0),
  actionsThisTurn: z.array(parcelAction),
  irrigationMm: nonNeg,
  totalProductionKg: nonNeg,
})

export const GameStateSchema: z.ZodType<GameState> = z.object({
  schemaVersion: z.number().int().min(1),
  id: z.string().min(1),
  config: GameConfigSchema,
  params: ModelParamsSchema,
  turn: z.number().int().min(0),
  calendar: z.object({ month: z.number().int().min(0).max(11), year: z.number().int() }),
  status: z.enum(['activo', 'victoria', 'derrota', 'finalizado']),
  parcels: z.array(parcel).min(1),
  environment: z.object({
    waterQuality: pct,
    contamination: pct,
    biodiversity: pct,
    streamFlow: pct,
    sediment: pct,
    forestHa: nonNeg,
    degradedHa: nonNeg,
    restorationHa: nonNeg,
    restorationAge: z.number().int().min(0),
    riparianHa: nonNeg,
    infrastructureHa: nonNeg,
    riparian: establishment,
  }),
  infrastructure: z.object({
    irrigation: z.enum(['gravedad', 'goteo']),
    ecoProcessing: z.boolean(),
    certified: z.boolean(),
    reservoirCapacity: z.number().positive(),
    catchmentM2: nonNeg,
    streamConcession: nonNeg,
    investedValue: nonNeg,
    pendingCompost: z.array(z.object({ readyTurn: z.number().int(), bultos: nonNeg })),
  }),
  inventory: z.object({
    money: z.number(),
    agua: nonNeg,
    abonoOrganico: nonNeg,
    fertilizanteQuimico: nonNeg,
    controlQuimico: nonNeg,
    controlBiologico: nonNeg,
    colinos: nonNeg,
    cafe: nonNeg,
  }),
  labor: z.object({ available: nonNeg, hired: nonNeg }),
  market: z.object({ coffeeIndex: z.number().positive(), inputIndex: z.number().positive() }),
  climate: z.object({
    turn: z.number().int(),
    month: z.number().int().min(0).max(11),
    temperature: z.number(),
    precipitation: nonNeg,
    normalPrecipitation: nonNeg,
    humidity: pct,
    droughtRisk: pct,
    rainIntensity: pct,
    condition,
  }),
  activeEvents: z.array(
    z.object({
      instanceId: z.string(),
      eventId: z.string(),
      startedTurn: z.number().int(),
      remaining: z.number().int(),
      responseId: z.string().nullable(),
      targetParcelId: z.string().nullable(),
    }),
  ),
  eventLog: z.array(
    z.object({
      id: z.string(),
      turn: z.number().int(),
      eventId: z.string(),
      title: z.string(),
      message: z.string(),
      severity,
    }),
  ),
  eventCooldowns: z.record(z.string(), z.number()),
  transactions: z.array(
    z.object({
      id: z.string(),
      turn: z.number().int(),
      kind: z.enum(['ingreso', 'gasto']),
      category: z.enum([
        'venta',
        'insumos',
        'labores',
        'jornales',
        'cosecha',
        'costos-fijos',
        'inversion',
        'conservacion',
        'evento',
        'multa',
      ]),
      description: z.string(),
      amount: nonNeg,
    }),
  ),
  baseline: monthlyRecord,
  history: z.array(monthlyRecord),
  cycles: z.array(
    z.object({
      cycle: z.number().int().min(1),
      startTurn: z.number().int(),
      endTurn: z.number().int(),
      production: nonNeg,
      income: nonNeg,
      expenses: nonNeg,
      profit: z.number(),
      waterUsed: nonNeg,
      indicators,
      scores,
    }),
  ),
  tracker: z.object({
    waterUsed: nonNeg,
    harvestedKg: nonNeg,
    income: nonNeg,
    expenses: nonNeg,
    processingLoad: nonNeg,
    pesticideLoad: nonNeg,
    chemicalFertilizerBultos: nonNeg,
  }),
  counters: z.object({
    negativeMoneyMonths: z.number().int().min(0),
    collapseMonths: z.number().int().min(0),
    emptyWaterMonths: z.number().int().min(0),
    totalProductionKg: nonNeg,
    totalIncome: nonNeg,
    totalExpenses: nonNeg,
    totalWaterUsed: nonNeg,
    initialEquity: z.number(),
    nextId: z.number().int().min(0),
  }),
  outcome: z
    .object({
      victory: z.boolean(),
      reason: z.string(),
      finishedTurn: z.number().int(),
      scores,
      objectives: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          description: z.string(),
          achieved: z.boolean(),
          progress: z.number().min(0).max(1),
          current: z.string(),
          target: z.string(),
        }),
      ),
      recommendations: z.array(
        z.object({
          id: z.string(),
          priority: z.enum(['alta', 'media', 'baja']),
          title: z.string(),
          detail: z.string(),
        }),
      ),
    })
    .nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const AppSettingsSchema = z.object({
  autosave: z.boolean(),
  reduceMotion: z.boolean(),
  showTutorial: z.boolean(),
  showTooltips: z.boolean(),
  autoAdvanceSeconds: z.number().int().min(2).max(30),
  params: ModelParamsSchema,
})

export type AppSettings = z.infer<typeof AppSettingsSchema>

export { DifficultySchema }
