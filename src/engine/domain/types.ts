/**
 * EcoFinca Engine — tipos del dominio.
 *
 * Este módulo no depende de React ni de ninguna librería de presentación.
 * Todos los indicadores ambientales usan una escala normalizada 0–100.
 */

export type ScenarioId = 'equilibrada' | 'suelo-degradado' | 'crisis-hidrica'
export type Difficulty = 'facil' | 'normal' | 'dificil'

export type CropStage =
  | 'preparacion'
  | 'establecimiento'
  | 'vegetativo'
  | 'floracion'
  | 'fructificacion'
  | 'maduracion'
  | 'cosecha'

export type CoffeeVarietyId = 'castillo' | 'cenicafe1' | 'caturra' | 'tabi'

/** Uso del suelo de una parcela agrícola. */
export type LandUse = 'cafe' | 'barbecho' | 'reforestacion'

export type WeatherCondition =
  | 'soleado'
  | 'nublado'
  | 'lluvia-moderada'
  | 'lluvia-intensa'
  | 'sequia'
  | 'calor'

export type PestId = 'broca' | 'roya' | 'mancha-hierro'

export type ControlMethod = 'quimico' | 'integrado'
export type FertilizerType = 'organico' | 'quimico'
export type DoseLevel = 'baja' | 'recomendada' | 'alta'

export type MapLayer =
  | 'general'
  | 'fertilidad'
  | 'humedad'
  | 'erosion'
  | 'cultivo'
  | 'biodiversidad'

/** Recursos almacenables que se compran en el mercado. */
export type ResourceId =
  | 'agua'
  | 'abonoOrganico'
  | 'fertilizanteQuimico'
  | 'controlQuimico'
  | 'controlBiologico'
  | 'colinos'

export type InvestmentId = 'riegoGoteo' | 'beneficioEcologico' | 'reservorio' | 'certificacion'

export type IrrigationSystem = 'gravedad' | 'goteo'

export type GameStatus = 'activo' | 'victoria' | 'derrota' | 'finalizado'

export type Classification = 'Excelente' | 'Buena' | 'Aceptable' | 'Deficiente'

export type Point = readonly [number, number]

/* ------------------------------------------------------------------ */
/* Configuración                                                        */
/* ------------------------------------------------------------------ */

export interface GameConfig {
  farmName: string
  managerName: string
  scenarioId: ScenarioId
  difficulty: Difficulty
  /** Presupuesto inicial en pesos colombianos (COP). */
  initialBudget: number
  /** Duración de la partida en años (ciclos productivos de 12 meses). */
  durationYears: number
  /** Número de parcelas agrícolas en que se divide el área productiva. */
  parcelCount: ParcelCount
  /** Semilla aleatoria: permite reproducir partidas. */
  seed: number
  startYear: number
}

export type ParcelCount = 4 | 6 | 8 | 9

/** Duraciones de etapas fenológicas en meses (configurables). */
export interface StageDurations {
  preparacion: number
  establecimiento: number
  /** Crecimiento vegetativo antes de la primera floración (planta joven). */
  vegetativoInicial: number
  /** Recuperación vegetativa después de cada cosecha. */
  vegetativoPostCosecha: number
  floracion: number
  fructificacion: number
  maduracion: number
  /** Ventana de cosecha antes de que el fruto se pierda. */
  cosecha: number
}

/** Parámetros calibrables que se copian en cada partida al crearla. */
export interface ModelParams {
  /** Rendimiento base en kg de café pergamino seco (cps) por hectárea y cosecha. */
  baseYieldKgHa: number
  /** Precio de referencia del juego, COP por kg cps (valor ficticio y configurable). */
  coffeeBasePrice: number
  /** Multiplicador general de precios de insumos. */
  inputPriceMultiplier: number
  /** Costo fijo mensual de operación (COP). */
  monthlyFixedCost: number
  /** Jornales base disponibles por mes (mano de obra familiar/permanente). */
  baseLabor: number
  /** Costo de un jornal adicional (COP). */
  laborCost: number
  stageDurations: StageDurations
}

/* ------------------------------------------------------------------ */
/* Entidades                                                            */
/* ------------------------------------------------------------------ */

export interface Soil {
  fertility: number
  moisture: number
  erosion: number
  /** Residuos de agroquímicos en el suelo (0–100). */
  contamination: number
  /** Nutrientes orgánicos pendientes de mineralizar (puntos de fertilidad). */
  organicPool: number
  /** Carga de fertilizante sintético no aprovechado (0–100). */
  chemicalLoad: number
}

/** Práctica que se establece de forma progresiva (nivel 0–1). */
export interface Establishment {
  active: boolean
  level: number
}

export interface Practices {
  cover: Establishment
  barrier: Establishment
  shade: Establishment
}

export interface PestProtection {
  monthsRemaining: number
  method: ControlMethod | null
}

export interface CropState {
  variety: CoffeeVarietyId | null
  stage: CropStage
  monthsInStage: number
  /** Edad de la planta en meses desde la siembra. */
  ageMonths: number
  health: number
  harvests: number
  /** Suma de factores productivos acumulados durante etapas reproductivas. */
  reproFactorSum: number
  reproMonths: number
  /** Producción estimada para la próxima cosecha (kg cps). */
  estimatedYieldKg: number
  /** Producción acumulada de esta siembra (kg cps). */
  accumulatedKg: number
}

export interface Parcel {
  id: string
  name: string
  areaHa: number
  /** Pendiente normalizada 0–1 (0 plano, 1 muy empinado). */
  slope: number
  shape: Point[]
  centroid: Point
  neighbors: string[]
  landUse: LandUse
  soil: Soil
  biodiversity: number
  crop: CropState | null
  practices: Practices
  pests: Record<PestId, number>
  protection: PestProtection
  /** Meses desde que la parcela fue reforestada. */
  reforestationAge: number
  /** Acciones ya realizadas en el mes actual (una por tipo). */
  actionsThisTurn: ParcelActionType[]
  /** Riego efectivo programado para el mes actual (mm); se aplica al cerrar el mes. */
  irrigationMm: number
  /** Producción histórica total de la parcela (kg cps). */
  totalProductionKg: number
}

export interface FarmEnvironment {
  waterQuality: number
  contamination: number
  biodiversity: number
  /** Índice de caudal de la quebrada (0–100). */
  streamFlow: number
  /** Sedimentos aportados el último mes (0–100). */
  sediment: number
  forestHa: number
  degradedHa: number
  /** Hectáreas de área degradada en proceso de restauración. */
  restorationHa: number
  restorationAge: number
  riparianHa: number
  infrastructureHa: number
  riparian: Establishment
}

export interface Infrastructure {
  irrigation: IrrigationSystem
  ecoProcessing: boolean
  certified: boolean
  reservoirCapacity: number
  catchmentM2: number
  /** Caudal concesionado máximo de la quebrada (m³/mes). */
  streamConcession: number
  investedValue: number
  pendingCompost: { readyTurn: number; bultos: number }[]
}

export interface Inventory {
  money: number
  agua: number
  abonoOrganico: number
  fertilizanteQuimico: number
  controlQuimico: number
  controlBiologico: number
  colinos: number
  /** Café pergamino seco almacenado (kg). */
  cafe: number
}

export interface Labor {
  available: number
  hired: number
}

export interface Market {
  /** Índice del precio del café respecto al precio de referencia. */
  coffeeIndex: number
  /** Índice de precios de insumos (inflación + eventos). */
  inputIndex: number
}

export type TransactionKind = 'ingreso' | 'gasto'
export type TransactionCategory =
  | 'venta'
  | 'insumos'
  | 'labores'
  | 'jornales'
  | 'cosecha'
  | 'costos-fijos'
  | 'inversion'
  | 'conservacion'
  | 'evento'
  | 'multa'

export interface Transaction {
  id: string
  turn: number
  kind: TransactionKind
  category: TransactionCategory
  description: string
  amount: number
}

export interface ClimateState {
  turn: number
  month: number
  temperature: number
  precipitation: number
  /** Precipitación normal del mes según el perfil del escenario (mm). */
  normalPrecipitation: number
  humidity: number
  droughtRisk: number
  rainIntensity: number
  condition: WeatherCondition
}

/* ------------------------------------------------------------------ */
/* Eventos                                                              */
/* ------------------------------------------------------------------ */

export type EventCategory = 'clima' | 'plagas' | 'mercado' | 'ambiente' | 'recursos' | 'social'
export type EventSeverity = 'info' | 'positivo' | 'advertencia' | 'peligro'

export interface ActiveEvent {
  instanceId: string
  eventId: string
  startedTurn: number
  remaining: number
  /** Respuesta elegida; null si está pendiente. */
  responseId: string | null
  /** Parcela afectada (si aplica). */
  targetParcelId: string | null
}

export interface EventLogEntry {
  id: string
  turn: number
  eventId: string
  title: string
  message: string
  severity: EventSeverity
}

/** Modificadores agregados que los eventos activos aplican a la simulación. */
export interface Modifiers {
  precipitationMult: number
  temperatureAdd: number
  rainIntensityAdd: number
  streamFlowMult: number
  inputPriceMult: number
  coffeePriceMult: number
  pestPressureMult: number
  erosionMult: number
  laborAdd: number
}

/* ------------------------------------------------------------------ */
/* Historial y evaluación                                               */
/* ------------------------------------------------------------------ */

export interface Scores {
  productivity: number
  profitability: number
  sustainability: number
  global: number
  classification: Classification
}

export interface Indicators {
  fertility: number
  moisture: number
  erosion: number
  waterQuality: number
  biodiversity: number
  contamination: number
  health: number
}

export interface MonthlyRecord extends Indicators {
  turn: number
  year: number
  month: number
  cycle: number
  precipitation: number
  temperature: number
  condition: WeatherCondition
  waterUsed: number
  waterStock: number
  production: number
  income: number
  expenses: number
  money: number
  cumulativeProfit: number
  coffeePrice: number
  scores: Scores
}

export interface CycleRecord {
  cycle: number
  startTurn: number
  endTurn: number
  production: number
  income: number
  expenses: number
  profit: number
  waterUsed: number
  indicators: Indicators
  scores: Scores
}

export interface ObjectiveStatus {
  id: string
  label: string
  description: string
  achieved: boolean
  progress: number
  current: string
  target: string
}

export interface FinalEvaluation {
  victory: boolean
  reason: string
  finishedTurn: number
  scores: Scores
  objectives: ObjectiveStatus[]
  recommendations: Recommendation[]
}

export interface Recommendation {
  id: string
  priority: 'alta' | 'media' | 'baja'
  title: string
  detail: string
}

export interface MonthTracker {
  waterUsed: number
  harvestedKg: number
  income: number
  expenses: number
  /** Carga contaminante por aguas residuales del beneficio (puntos). */
  processingLoad: number
  /** Carga contaminante por plaguicidas aplicados (puntos). */
  pesticideLoad: number
  chemicalFertilizerBultos: number
}

export interface Counters {
  negativeMoneyMonths: number
  collapseMonths: number
  emptyWaterMonths: number
  totalProductionKg: number
  totalIncome: number
  totalExpenses: number
  totalWaterUsed: number
  initialEquity: number
  nextId: number
}

export interface GameState {
  schemaVersion: number
  id: string
  config: GameConfig
  params: ModelParams
  turn: number
  calendar: { month: number; year: number }
  status: GameStatus
  parcels: Parcel[]
  environment: FarmEnvironment
  infrastructure: Infrastructure
  inventory: Inventory
  labor: Labor
  market: Market
  climate: ClimateState
  activeEvents: ActiveEvent[]
  eventLog: EventLogEntry[]
  eventCooldowns: Record<string, number>
  transactions: Transaction[]
  /** Registro del estado inicial (antes del primer turno). */
  baseline: MonthlyRecord
  history: MonthlyRecord[]
  cycles: CycleRecord[]
  tracker: MonthTracker
  counters: Counters
  outcome: FinalEvaluation | null
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/* Acciones                                                             */
/* ------------------------------------------------------------------ */

export type ParcelActionType =
  | 'preparar'
  | 'sembrar'
  | 'fertilizar'
  | 'regar'
  | 'controlPlagas'
  | 'cobertura'
  | 'barreras'
  | 'sombrio'
  | 'mantenimiento'
  | 'cosechar'
  | 'reforestar'

export type ParcelAction =
  | { type: 'preparar'; parcelId: string }
  | { type: 'sembrar'; parcelId: string; variety: CoffeeVarietyId }
  | { type: 'fertilizar'; parcelId: string; fertilizer: FertilizerType; dose: DoseLevel }
  | { type: 'regar'; parcelId: string }
  | { type: 'controlPlagas'; parcelId: string; method: ControlMethod }
  | { type: 'cobertura'; parcelId: string }
  | { type: 'barreras'; parcelId: string }
  | { type: 'sombrio'; parcelId: string }
  | { type: 'mantenimiento'; parcelId: string }
  | { type: 'cosechar'; parcelId: string }
  | { type: 'reforestar'; parcelId: string }

export type FarmAction =
  | { type: 'comprar'; item: ResourceId; quantity: number }
  | { type: 'vender'; quantityKg: number }
  | { type: 'invertir'; investment: InvestmentId }
  | { type: 'contratarJornales'; quantity: number }
  | { type: 'conservarFuentes' }
  | { type: 'restaurarArea' }
  | { type: 'responderEvento'; instanceId: string; responseId: string }

export type GameAction = ParcelAction | FarmAction

export interface Cost {
  money: number
  labor: number
  resources: Partial<Record<ResourceId, number>>
}

export type ActionResult =
  | { ok: true; state: GameState; message: string; effects: string[] }
  | { ok: false; error: string }

/* ------------------------------------------------------------------ */
/* Resumen de turno                                                     */
/* ------------------------------------------------------------------ */

export interface TurnSummary {
  turn: number
  month: number
  year: number
  climate: ClimateState
  before: Indicators & { money: number; water: number }
  after: Indicators & { money: number; water: number }
  messages: TurnMessage[]
  newEvents: string[]
  harvestReady: string[]
  cycleCompleted: CycleRecord | null
  scores: Scores
  gameOver: boolean
}

export interface TurnMessage {
  severity: EventSeverity
  text: string
}
