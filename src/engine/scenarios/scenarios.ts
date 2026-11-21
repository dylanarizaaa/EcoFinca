/**
 * Definición de los tres escenarios jugables. Cada escenario tiene sus propias
 * condiciones iniciales, parámetros climáticos y objetivos.
 */

import type { CoffeeVarietyId, CropStage, Difficulty, ScenarioId } from '../domain/types'

export type Range = readonly [number, number]

/** Estado inicial de una parcela: etapa del café y meses en la etapa, o barbecho. */
export type ParcelSeed = { stage: CropStage; months: number } | 'barbecho'

export interface ScenarioClimate {
  precipitationMult: number
  temperatureAdd: number
  intensityAdd: number
  /** Multiplicador de probabilidad de eventos de sequía. */
  droughtEventMult: number
  /** Multiplicador de probabilidad de eventos de lluvias intensas. */
  rainEventMult: number
}

export interface ScenarioDefinition {
  id: ScenarioId
  name: string
  tagline: string
  description: string
  objective: string
  challenges: string[]
  defaultBudget: number
  /** Multiplicador de costos fijos (fincas en crisis operan con menos personal). */
  fixedCostMult: number
  recommendedDifficulty: Difficulty
  climate: ScenarioClimate
  soil: {
    fertility: Range
    moisture: Range
    erosion: Range
    contamination: Range
    organicPool: Range
  }
  biodiversity: Range
  crop: {
    variety: CoffeeVarietyId
    age: Range
    health: Range
    pattern: readonly ParcelSeed[]
  }
  /** Fracción de parcelas que inician con barreras vivas establecidas. */
  barrierParcels: number
  environment: {
    waterQuality: number
    contamination: number
    forestHa: number
    degradedHa: number
    riparianLevel: number
    streamFlow: number
  }
  infrastructure: {
    reservoirCapacity: number
    initialWater: number
    streamConcession: number
    catchmentM2: number
  }
  inventory: {
    abonoOrganico: number
    fertilizanteQuimico: number
    controlQuimico: number
    controlBiologico: number
    colinos: number
    cafe: number
  }
}

/**
 * Perfil climático mensual de referencia (régimen bimodal andino de la zona
 * cafetera). Valores HIPOTÉTICOS inspirados en el patrón general de dos
 * temporadas de lluvia (mar–may y sep–nov); no corresponden a una estación
 * meteorológica específica.
 */
export const CLIMATE_PROFILE = {
  precipitation: [110, 125, 190, 260, 250, 150, 105, 115, 175, 280, 260, 160] as const,
  temperature: [21.2, 21.4, 21.2, 20.9, 20.8, 21.0, 21.6, 21.8, 21.3, 20.7, 20.6, 20.9] as const,
}

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  equilibrada: {
    id: 'equilibrada',
    name: 'Finca equilibrada',
    tagline: 'Buen punto de partida',
    description:
      'Una finca con suelos en buen estado, cafetales establecidos y disponibilidad moderada de agua. El reto es no caer en la tentación de sobreexplotarla.',
    objective: 'Mantener la productividad y la sostenibilidad durante toda la partida.',
    challenges: ['Evitar la sobrefertilización', 'Controlar la erosión en temporada de lluvias', 'Planificar la cosecha'],
    defaultBudget: 30_000_000,
    fixedCostMult: 1,
    recommendedDifficulty: 'facil',
    climate: { precipitationMult: 1, temperatureAdd: 0, intensityAdd: 0, droughtEventMult: 1, rainEventMult: 1 },
    soil: {
      fertility: [62, 74],
      moisture: [58, 70],
      erosion: [12, 22],
      contamination: [4, 10],
      organicPool: [4, 8],
    },
    biodiversity: [38, 48],
    crop: {
      variety: 'castillo',
      age: [30, 60],
      health: [80, 90],
      pattern: [
        { stage: 'fructificacion', months: 2 },
        { stage: 'vegetativo', months: 1 },
        { stage: 'maduracion', months: 0 },
        { stage: 'floracion', months: 0 },
        { stage: 'fructificacion', months: 0 },
        { stage: 'vegetativo', months: 3 },
        { stage: 'fructificacion', months: 3 },
        { stage: 'vegetativo', months: 2 },
        { stage: 'maduracion', months: 1 },
      ],
    },
    barrierParcels: 0.25,
    environment: {
      waterQuality: 78,
      contamination: 14,
      forestHa: 0.9,
      degradedHa: 0,
      riparianLevel: 0.3,
      streamFlow: 68,
    },
    infrastructure: { reservoirCapacity: 800, initialWater: 600, streamConcession: 450, catchmentM2: 200 },
    inventory: { abonoOrganico: 40, fertilizanteQuimico: 6, controlQuimico: 2, controlBiologico: 2, colinos: 0, cafe: 0 },
  },
  'suelo-degradado': {
    id: 'suelo-degradado',
    name: 'Suelo degradado',
    tagline: 'Recuperar lo perdido',
    description:
      'Años de monocultivo a plena exposición y fertilización intensiva dejaron suelos pobres y erosionados. Parte del bosque fue talado y hay lotes abandonados.',
    objective: 'Recuperar la fertilidad, reducir la erosión y volver a ser rentable.',
    challenges: ['Fertilidad baja', 'Erosión elevada', 'Cafetales viejos de variedad susceptible', 'Presupuesto limitado'],
    defaultBudget: 24_000_000,
    fixedCostMult: 0.4,
    recommendedDifficulty: 'normal',
    climate: { precipitationMult: 1.05, temperatureAdd: 0.3, intensityAdd: 10, droughtEventMult: 1, rainEventMult: 1.3 },
    soil: {
      fertility: [26, 38],
      moisture: [40, 55],
      erosion: [50, 66],
      contamination: [18, 28],
      organicPool: [0, 2],
    },
    biodiversity: [16, 26],
    crop: {
      variety: 'caturra',
      age: [90, 110],
      health: [60, 72],
      pattern: [
        'barbecho',
        { stage: 'vegetativo', months: 2 },
        { stage: 'fructificacion', months: 1 },
        'barbecho',
        { stage: 'maduracion', months: 0 },
        { stage: 'vegetativo', months: 1 },
        { stage: 'fructificacion', months: 2 },
        'barbecho',
        { stage: 'floracion', months: 0 },
      ],
    },
    barrierParcels: 0,
    environment: {
      waterQuality: 55,
      contamination: 34,
      forestHa: 0.5,
      degradedHa: 0.4,
      riparianLevel: 0,
      streamFlow: 52,
    },
    infrastructure: { reservoirCapacity: 600, initialWater: 380, streamConcession: 380, catchmentM2: 150 },
    inventory: { abonoOrganico: 10, fertilizanteQuimico: 8, controlQuimico: 3, controlBiologico: 0, colinos: 0, cafe: 0 },
  },
  'crisis-hidrica': {
    id: 'crisis-hidrica',
    name: 'Crisis hídrica',
    tagline: 'Cada gota cuenta',
    description:
      'Un periodo de lluvias escasas redujo el caudal de la quebrada. Los cafetales sufren estrés hídrico y el reservorio está a la mitad.',
    objective: 'Mantener los cultivos sanos usando el agua de forma eficiente y proteger la fuente hídrica.',
    challenges: ['Lluvias reducidas', 'Alto riesgo de sequía', 'Reservorio pequeño', 'Temperaturas elevadas'],
    defaultBudget: 24_000_000,
    fixedCostMult: 0.85,
    recommendedDifficulty: 'normal',
    climate: { precipitationMult: 0.68, temperatureAdd: 1.1, intensityAdd: -5, droughtEventMult: 2, rainEventMult: 0.5 },
    soil: {
      fertility: [55, 66],
      moisture: [24, 34],
      erosion: [24, 34],
      contamination: [6, 12],
      organicPool: [2, 5],
    },
    biodiversity: [30, 40],
    crop: {
      variety: 'castillo',
      age: [30, 54],
      health: [60, 72],
      pattern: [
        { stage: 'fructificacion', months: 1 },
        { stage: 'vegetativo', months: 2 },
        { stage: 'maduracion', months: 0 },
        { stage: 'floracion', months: 0 },
        { stage: 'vegetativo', months: 0 },
        { stage: 'fructificacion', months: 3 },
        { stage: 'establecimiento', months: 1 },
        { stage: 'vegetativo', months: 3 },
        { stage: 'maduracion', months: 1 },
      ],
    },
    barrierParcels: 0.15,
    environment: {
      waterQuality: 64,
      contamination: 20,
      forestHa: 0.8,
      degradedHa: 0.1,
      riparianLevel: 0.1,
      streamFlow: 34,
    },
    infrastructure: { reservoirCapacity: 500, initialWater: 260, streamConcession: 300, catchmentM2: 150 },
    inventory: { abonoOrganico: 25, fertilizanteQuimico: 4, controlQuimico: 2, controlBiologico: 2, colinos: 0, cafe: 0 },
  },
}

export const SCENARIO_IDS: readonly ScenarioId[] = ['equilibrada', 'suelo-degradado', 'crisis-hidrica']

export const DIFFICULTY_INFO: Record<Difficulty, { name: string; description: string }> = {
  facil: { name: 'Fácil', description: 'Más presupuesto, clima estable y menos plagas.' },
  normal: { name: 'Normal', description: 'Condiciones equilibradas.' },
  dificil: { name: 'Difícil', description: 'Menos presupuesto, clima variable, más eventos y plagas.' },
}
