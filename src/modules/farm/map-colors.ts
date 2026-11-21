/** Escalas de color de las capas del mapa (calculadas a partir de valores reales). */

import type { CropStage, MapLayer, Parcel } from '@/engine'

type Stop = readonly [number, string]

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
}

export function scaleColor(stops: readonly Stop[], value: number): string {
  const v = Math.max(0, Math.min(100, value))
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    if (!a || !b) continue
    if (v >= a[0] && v <= b[0]) {
      const t = (v - a[0]) / (b[0] - a[0] || 1)
      const ca = hexToRgb(a[1])
      const cb = hexToRgb(b[1])
      return rgbToHex([ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t])
    }
  }
  return stops[stops.length - 1]?.[1] ?? '#cccccc'
}

export const LAYER_SCALES: Record<Exclude<MapLayer, 'general'>, { stops: readonly Stop[]; low: string; high: string; title: string }> = {
  fertilidad: {
    title: 'Fertilidad del suelo',
    stops: [
      [0, '#a9744a'],
      [35, '#d3b06c'],
      [60, '#a8c58b'],
      [100, '#2f6b3c'],
    ],
    low: 'Pobre',
    high: 'Fértil',
  },
  humedad: {
    title: 'Humedad del suelo',
    stops: [
      [0, '#d7b27a'],
      [30, '#e8dcb5'],
      [55, '#8fc3dc'],
      [85, '#3f87ab'],
      [100, '#24506b'],
    ],
    low: 'Seco',
    high: 'Saturado',
  },
  erosion: {
    title: 'Erosión',
    stops: [
      [0, '#5d9463'],
      [35, '#c9cf7f'],
      [60, '#e3a84a'],
      [100, '#8f2f1d'],
    ],
    low: 'Baja',
    high: 'Severa',
  },
  cultivo: {
    title: 'Salud del cultivo',
    stops: [
      [0, '#8f2f1d'],
      [40, '#df8d4a'],
      [65, '#e6cd6a'],
      [100, '#2f6b3c'],
    ],
    low: 'Crítica',
    high: 'Vigorosa',
  },
  biodiversidad: {
    title: 'Biodiversidad',
    stops: [
      [0, '#efe6d1'],
      [35, '#c7d9a6'],
      [65, '#6c9e63'],
      [100, '#173a25'],
    ],
    low: 'Pobre',
    high: 'Alta',
  },
}

export const STAGE_COLORS: Record<CropStage, string> = {
  preparacion: '#b98d62',
  establecimiento: '#b6d39a',
  vegetativo: '#6d9f5f',
  floracion: '#8fb57a',
  fructificacion: '#4f8a4f',
  maduracion: '#5d7f41',
  cosecha: '#7a5a2f',
}

export const LAND_COLORS = {
  barbecho: '#dccaa0',
  reforestacion: '#2f6b3c',
}

export function parcelFill(parcel: Parcel, layer: MapLayer): string {
  switch (layer) {
    case 'general':
      if (parcel.landUse === 'reforestacion') return LAND_COLORS.reforestacion
      if (!parcel.crop) return LAND_COLORS.barbecho
      return STAGE_COLORS[parcel.crop.stage]
    case 'fertilidad':
      return scaleColor(LAYER_SCALES.fertilidad.stops, parcel.soil.fertility)
    case 'humedad':
      return scaleColor(LAYER_SCALES.humedad.stops, parcel.soil.moisture)
    case 'erosion':
      return scaleColor(LAYER_SCALES.erosion.stops, parcel.soil.erosion)
    case 'cultivo':
      return parcel.crop?.variety ? scaleColor(LAYER_SCALES.cultivo.stops, parcel.crop.health) : '#d9d6cc'
    case 'biodiversidad':
      return scaleColor(LAYER_SCALES.biodiversidad.stops, parcel.biodiversity)
  }
}

export function layerValue(parcel: Parcel, layer: MapLayer): number | null {
  switch (layer) {
    case 'fertilidad':
      return parcel.soil.fertility
    case 'humedad':
      return parcel.soil.moisture
    case 'erosion':
      return parcel.soil.erosion
    case 'cultivo':
      return parcel.crop?.variety ? parcel.crop.health : null
    case 'biodiversidad':
      return parcel.biodiversity
    case 'general':
      return null
  }
}

export function waterColor(quality: number): string {
  return scaleColor(
    [
      [0, '#6f6a3c'],
      [40, '#7d9a72'],
      [70, '#5fa0c0'],
      [100, '#3f8fbc'],
    ],
    quality,
  )
}
