/** Metadatos de presentación de los indicadores ambientales. */

import { Bug, Droplets, Gauge, HeartPulse, Leaf, Mountain, Sprout, Waves, type LucideIcon } from 'lucide-react'
import type { Indicators } from '@/engine'

export type IndicatorKey = keyof Indicators
export type Tone = 'good' | 'fair' | 'poor'

export interface IndicatorMeta {
  key: IndicatorKey
  label: string
  description: string
  higherIsBetter: boolean
  icon: LucideIcon
}

export const INDICATORS: Record<IndicatorKey, IndicatorMeta> = {
  fertility: {
    key: 'fertility',
    label: 'Fertilidad del suelo',
    description: 'Disponibilidad de nutrientes. Sobre 70 el cultivo no está limitado por nutrición.',
    higherIsBetter: true,
    icon: Sprout,
  },
  moisture: {
    key: 'moisture',
    label: 'Humedad del suelo',
    description: 'Agua disponible en la zona de raíces. Óptimo entre 40 y 82: por debajo hay estrés hídrico y por encima encharcamiento.',
    higherIsBetter: true,
    icon: Droplets,
  },
  erosion: {
    key: 'erosion',
    label: 'Erosión',
    description: 'Grado de pérdida de suelo. Valores altos reducen la fertilidad y ensucian el agua con sedimentos.',
    higherIsBetter: false,
    icon: Mountain,
  },
  waterQuality: {
    key: 'waterQuality',
    label: 'Calidad del agua',
    description: 'Estado de la quebrada. Se deteriora con contaminación y sedimentos; mejora con ronda protegida.',
    higherIsBetter: true,
    icon: Waves,
  },
  biodiversity: {
    key: 'biodiversity',
    label: 'Biodiversidad',
    description: 'Riqueza de especies en la finca. Aporta control natural de plagas y salud del suelo.',
    higherIsBetter: true,
    icon: Leaf,
  },
  contamination: {
    key: 'contamination',
    label: 'Contaminación',
    description: 'Carga contaminante que llega al agua: agroquímicos, aguas mieles y sedimentos.',
    higherIsBetter: false,
    icon: Bug,
  },
  health: {
    key: 'health',
    label: 'Salud del cultivo',
    description: 'Vigor promedio de los cafetales. Afectada por sequía, calor, nutrición y plagas.',
    higherIsBetter: true,
    icon: HeartPulse,
  },
}

export const INDICATOR_ORDER: IndicatorKey[] = [
  'fertility',
  'moisture',
  'erosion',
  'health',
  'waterQuality',
  'biodiversity',
  'contamination',
]

export function indicatorTone(key: IndicatorKey, value: number): Tone {
  if (key === 'moisture') {
    if (value >= 40 && value <= 82) return 'good'
    if (value >= 28 && value <= 92) return 'fair'
    return 'poor'
  }
  const v = INDICATORS[key].higherIsBetter ? value : 100 - value
  if (v >= 62) return 'good'
  if (v >= 40) return 'fair'
  return 'poor'
}

export const TONE_CLASSES: Record<Tone, { text: string; bg: string; bar: string; label: string }> = {
  good: { text: 'text-forest-700', bg: 'bg-forest-50', bar: 'bg-forest-500', label: 'Bueno' },
  fair: { text: 'text-earth-600', bg: 'bg-sun-300/20', bar: 'bg-sun-400', label: 'Regular' },
  poor: { text: 'text-clay-600', bg: 'bg-clay-400/10', bar: 'bg-clay-500', label: 'Crítico' },
}

export const SCORE_ICON = Gauge

export function scoreTone(value: number): Tone {
  if (value >= 65) return 'good'
  if (value >= 45) return 'fair'
  return 'poor'
}
