import type { CoffeeVarietyId, CropStage, PestId, StageDurations } from '../domain/types'

export interface VarietyInfo {
  id: CoffeeVarietyId
  name: string
  description: string
  /** Susceptibilidad relativa a la roya (0–1). */
  rustSusceptibility: number
  /** Modificador de rendimiento potencial. */
  yieldFactor: number
  /** Tolerancia al estrés hídrico (reduce el daño por sequía). */
  droughtTolerance: number
}

/**
 * Variedades disponibles. Las diferencias cualitativas (resistencia a roya de
 * Castillo, Cenicafé 1 y Tabi; susceptibilidad de Caturra) corresponden a lo
 * reportado en literatura técnica colombiana. Los valores numéricos son
 * parámetros hipotéticos de calibración.
 */
export const VARIETIES: Record<CoffeeVarietyId, VarietyInfo> = {
  castillo: {
    id: 'castillo',
    name: 'Castillo',
    description: 'Variedad de porte bajo con resistencia a la roya. Alta productividad en zona cafetera central.',
    rustSusceptibility: 0.15,
    yieldFactor: 1,
    droughtTolerance: 0.1,
  },
  cenicafe1: {
    id: 'cenicafe1',
    name: 'Cenicafé 1',
    description: 'Variedad resistente a la roya con buena calidad en taza. Recomendada para renovación.',
    rustSusceptibility: 0.1,
    yieldFactor: 1.02,
    droughtTolerance: 0.1,
  },
  caturra: {
    id: 'caturra',
    name: 'Caturra',
    description: 'Variedad tradicional de buena calidad, pero susceptible a la roya.',
    rustSusceptibility: 1,
    yieldFactor: 0.95,
    droughtTolerance: 0.05,
  },
  tabi: {
    id: 'tabi',
    name: 'Tabi',
    description: 'Variedad de porte alto, resistente a la roya y apropiada para sistemas con sombrío.',
    rustSusceptibility: 0.2,
    yieldFactor: 0.9,
    droughtTolerance: 0.25,
  },
}

export const STAGE_ORDER: readonly CropStage[] = [
  'preparacion',
  'establecimiento',
  'vegetativo',
  'floracion',
  'fructificacion',
  'maduracion',
  'cosecha',
]

export interface StageInfo {
  id: CropStage
  name: string
  description: string
}

export const STAGE_INFO: Record<CropStage, StageInfo> = {
  preparacion: {
    id: 'preparacion',
    name: 'Preparación',
    description: 'Trazado, ahoyado y adecuación del terreno. El suelo queda expuesto a la erosión.',
  },
  establecimiento: {
    id: 'establecimiento',
    name: 'Establecimiento',
    description: 'Los colinos se adaptan al campo y desarrollan raíces. Son muy sensibles a la sequía.',
  },
  vegetativo: {
    id: 'vegetativo',
    name: 'Crecimiento vegetativo',
    description: 'La planta forma ramas y hojas. Después de cada cosecha la planta se recupera en esta etapa.',
  },
  floracion: {
    id: 'floracion',
    name: 'Floración',
    description: 'Aparecen las flores. El estrés hídrico o el calor reducen el cuajado de frutos.',
  },
  fructificacion: {
    id: 'fructificacion',
    name: 'Fructificación',
    description: 'Llenado del grano. Es la etapa de mayor demanda de nutrientes y agua.',
  },
  maduracion: {
    id: 'maduracion',
    name: 'Maduración',
    description: 'Los frutos cambian de verde a rojo. Aumenta el riesgo de broca.',
  },
  cosecha: {
    id: 'cosecha',
    name: 'Cosecha',
    description: 'Ventana de recolección. Si no se cosecha a tiempo el fruto se cae y alimenta la broca.',
  },
}

export function stageDuration(stage: CropStage, durations: StageDurations, harvests: number): number {
  switch (stage) {
    case 'preparacion':
      return durations.preparacion
    case 'establecimiento':
      return durations.establecimiento
    case 'vegetativo':
      return harvests === 0 ? durations.vegetativoInicial : durations.vegetativoPostCosecha
    case 'floracion':
      return durations.floracion
    case 'fructificacion':
      return durations.fructificacion
    case 'maduracion':
      return durations.maduracion
    case 'cosecha':
      return durations.cosecha
  }
}

export const REPRODUCTIVE_STAGES: readonly CropStage[] = ['floracion', 'fructificacion', 'maduracion']
export const FRUIT_STAGES: readonly CropStage[] = ['fructificacion', 'maduracion', 'cosecha']

export interface PestInfo {
  id: PestId
  name: string
  scientific: string
  kind: 'plaga' | 'enfermedad'
  description: string
  favoredBy: string
}

export const PEST_INFO: Record<PestId, PestInfo> = {
  broca: {
    id: 'broca',
    name: 'Broca del café',
    scientific: 'Hypothenemus hampei',
    kind: 'plaga',
    description: 'Insecto que perfora el fruto y daña el grano, reduciendo cantidad y calidad de la cosecha.',
    favoredBy: 'Clima cálido y seco, frutos maduros o caídos sin recoger.',
  },
  roya: {
    id: 'roya',
    name: 'Roya del cafeto',
    scientific: 'Hemileia vastatrix',
    kind: 'enfermedad',
    description: 'Hongo que causa manchas anaranjadas y caída de hojas, debilitando la planta.',
    favoredBy: 'Lluvias frecuentes, alta humedad y variedades susceptibles.',
  },
  'mancha-hierro': {
    id: 'mancha-hierro',
    name: 'Mancha de hierro',
    scientific: 'Cercospora coffeicola',
    kind: 'enfermedad',
    description: 'Hongo asociado a deficiencias nutricionales y exposición plena al sol.',
    favoredBy: 'Baja fertilidad, estrés hídrico y ausencia de sombrío.',
  },
}

export const PEST_IDS: readonly PestId[] = ['broca', 'roya', 'mancha-hierro']
