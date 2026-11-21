/**
 * Parámetros económicos del juego.
 *
 * Todos los precios son VALORES DE REFERENCIA FICTICIOS expresados en pesos
 * colombianos (COP). No son cotizaciones reales ni deben usarse para tomar
 * decisiones comerciales. Se pueden calibrar con fuentes actualizadas.
 */

import type { InvestmentId, ParcelActionType, ResourceId } from '../domain/types'

export interface ResourceInfo {
  id: ResourceId
  name: string
  unit: string
  unitPlural: string
  basePrice: number
  /** Nivel a partir del cual se muestra alerta crítica. */
  criticalLevel: number
  description: string
}

export const RESOURCES: Record<ResourceId, ResourceInfo> = {
  agua: {
    id: 'agua',
    name: 'Agua (carrotanque)',
    unit: 'm³',
    unitPlural: 'm³',
    basePrice: 12_000,
    criticalLevel: 120,
    description: 'Agua almacenada en el reservorio. Se usa para riego y beneficio del café.',
  },
  abonoOrganico: {
    id: 'abonoOrganico',
    name: 'Abono orgánico',
    unit: 'bulto',
    unitPlural: 'bultos',
    basePrice: 45_000,
    criticalLevel: 10,
    description: 'Compost o lombricompuesto (bulto de 50 kg). Libera nutrientes de forma gradual.',
  },
  fertilizanteQuimico: {
    id: 'fertilizanteQuimico',
    name: 'Fertilizante químico',
    unit: 'bulto',
    unitPlural: 'bultos',
    basePrice: 185_000,
    criticalLevel: 2,
    description: 'Fertilizante de síntesis (bulto de 50 kg). Efecto rápido; el exceso contamina.',
  },
  controlQuimico: {
    id: 'controlQuimico',
    name: 'Plaguicida químico',
    unit: 'dosis',
    unitPlural: 'dosis',
    basePrice: 160_000,
    criticalLevel: 1,
    description: 'Dosis por hectárea de insecticida/fungicida de síntesis.',
  },
  controlBiologico: {
    id: 'controlBiologico',
    name: 'Control biológico (MIP)',
    unit: 'dosis',
    unitPlural: 'dosis',
    basePrice: 120_000,
    criticalLevel: 1,
    description: 'Dosis por hectárea de hongos entomopatógenos, trampas y monitoreo.',
  },
  colinos: {
    id: 'colinos',
    name: 'Colinos de café',
    unit: 'colino',
    unitPlural: 'colinos',
    basePrice: 600,
    criticalLevel: 0,
    description: 'Plántulas de café listas para trasplante.',
  },
}

export const PURCHASABLE: readonly ResourceId[] = [
  'abonoOrganico',
  'fertilizanteQuimico',
  'controlQuimico',
  'controlBiologico',
  'colinos',
  'agua',
]

/** Costos por hectárea de las labores de parcela. */
export const ACTION_COSTS = {
  preparar: { moneyPerHa: 900_000, laborPerHa: 6 },
  sembrar: { moneyPerHa: 600_000, laborPerHa: 10 },
  fertilizarOrganico: { bultosPerHa: 20, laborPerHa: 3 },
  fertilizarQuimico: { bultosPerHa: 4, laborPerHa: 2 },
  regar: { moneyPerHa: 20_000, laborPerHa: { gravedad: 1.5, goteo: 0.4 } },
  controlQuimico: { dosisPerHa: 1, laborPerHa: 2 },
  controlIntegrado: { dosisPerHa: 1, laborPerHa: 3.5 },
  cobertura: { moneyPerHa: 650_000, laborPerHa: 4 },
  barreras: { moneyPerHa: 1_200_000, laborPerHa: 6 },
  sombrio: { moneyPerHa: 1_500_000, laborPerHa: 6 },
  mantenimiento: { moneyPerHa: 150_000, laborPerHa: 4 },
  cosechar: { moneyPerKg: 4_500, laborPerHa: 2 },
  reforestar: { moneyPerHa: 2_800_000, laborPerHa: 8 },
} as const

export const FARM_ACTION_COSTS = {
  conservarFuentes: { money: 3_500_000, labor: 12 },
  restaurarArea: { moneyPerHa: 3_000_000, laborPerHa: 10 },
} as const

export interface InvestmentInfo {
  id: InvestmentId
  name: string
  cost: number
  labor: number
  monthlyMaintenance: number
  description: string
  benefits: string[]
}

export const INVESTMENTS: Record<InvestmentId, InvestmentInfo> = {
  riegoGoteo: {
    id: 'riegoGoteo',
    name: 'Riego por goteo',
    cost: 6_500_000,
    labor: 8,
    monthlyMaintenance: 40_000,
    description: 'Sistema de riego localizado que entrega el agua directamente a la raíz.',
    benefits: [
      'Eficiencia de aplicación del 55 % al 90 %.',
      'Reduce cerca de un 40 % el agua necesaria por riego.',
      'Disminuye la escorrentía y los jornales de riego.',
    ],
  },
  beneficioEcologico: {
    id: 'beneficioEcologico',
    name: 'Beneficio ecológico y tratamiento de residuos',
    cost: 8_000_000,
    labor: 10,
    monthlyMaintenance: 60_000,
    description: 'Despulpado con poca agua, tratamiento de aguas mieles y compostaje de pulpa.',
    benefits: [
      'Reduce el agua de beneficio de ~40 L a ~1,5 L por kg de café.',
      'Disminuye en 85 % la contaminación por aguas mieles.',
      'Convierte la pulpa en abono orgánico (economía circular).',
    ],
  },
  reservorio: {
    id: 'reservorio',
    name: 'Reservorio y cosecha de lluvia',
    cost: 5_000_000,
    labor: 10,
    monthlyMaintenance: 25_000,
    description: 'Amplía la capacidad de almacenamiento y capta agua lluvia de los techos.',
    benefits: ['+500 m³ de capacidad de almacenamiento.', '+300 m² de área de captación de lluvia.'],
  },
  certificacion: {
    id: 'certificacion',
    name: 'Certificación de café sostenible',
    cost: 2_500_000,
    labor: 4,
    monthlyMaintenance: 50_000,
    description: 'Auditoría y sello de producción sostenible que permite acceder a primas de precio.',
    benefits: [
      'Prima de +12 % en el precio de venta mientras la sostenibilidad sea ≥ 60.',
      'Requiere beneficio ecológico y sostenibilidad ≥ 65 para obtenerla.',
    ],
  },
}

export const CERTIFICATION = {
  premium: 0.12,
  minSustainabilityToObtain: 65,
  minSustainabilityToKeep: 60,
} as const

/** Compost producido por kg de café beneficiado con beneficio ecológico (bultos/kg). */
export const COMPOST_BULTOS_PER_KG = 0.012
export const COMPOST_DELAY_MONTHS = 2

/** Pérdida mensual de peso/calidad del café almacenado. */
export const STORAGE_LOSS = 0.01

export const MARKET = {
  /** Reversión a la media del índice de precio del café. */
  meanReversion: 0.25,
  minIndex: 0.7,
  maxIndex: 1.35,
  /** Inflación mensual de insumos (hipotética). */
  monthlyInflation: 0.003,
} as const

export const PARCEL_ACTION_LABELS: Record<ParcelActionType, string> = {
  preparar: 'Preparar terreno',
  sembrar: 'Sembrar',
  fertilizar: 'Fertilizar',
  regar: 'Regar',
  controlPlagas: 'Control de plagas',
  cobertura: 'Cobertura vegetal',
  barreras: 'Barreras vivas',
  sombrio: 'Sombrío (agroforestería)',
  mantenimiento: 'Mantenimiento',
  cosechar: 'Cosechar',
  reforestar: 'Reforestar parcela',
}
