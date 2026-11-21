/**
 * Geometría de la finca: genera de forma determinista las parcelas del área
 * productiva a partir del número de parcelas configurado. La finca tiene
 * 5 ha en total; 3,6 ha corresponden al área productiva.
 */

import type { ParcelCount, Point } from '../domain/types'
import { mulberry32 } from '../lib/rng'
import { round } from '../lib/math'

export const MAP_WIDTH = 1000
export const MAP_HEIGHT = 640
export const FARM_TOTAL_HA = 5
export const PRODUCTIVE_HA = 3.6

/** Esquinas del área productiva en coordenadas del mapa SVG. */
const ZONE = {
  tl: [70, 180] as Point,
  tr: [700, 168] as Point,
  br: [712, 560] as Point,
  bl: [58, 572] as Point,
}

const GRID: Record<ParcelCount, { rows: number; cols: number }> = {
  4: { rows: 2, cols: 2 },
  6: { rows: 2, cols: 3 },
  8: { rows: 2, cols: 4 },
  9: { rows: 3, cols: 3 },
}

export interface ParcelGeometry {
  id: string
  name: string
  row: number
  col: number
  shape: Point[]
  centroid: Point
  areaHa: number
  slope: number
  neighbors: string[]
}

function bilinear(u: number, v: number): Point {
  const top: Point = [ZONE.tl[0] + (ZONE.tr[0] - ZONE.tl[0]) * u, ZONE.tl[1] + (ZONE.tr[1] - ZONE.tl[1]) * u]
  const bottom: Point = [ZONE.bl[0] + (ZONE.br[0] - ZONE.bl[0]) * u, ZONE.bl[1] + (ZONE.br[1] - ZONE.bl[1]) * u]
  return [top[0] + (bottom[0] - top[0]) * v, top[1] + (bottom[1] - top[1]) * v]
}

export function polygonArea(points: readonly Point[]): number {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    if (!a || !b) continue
    area += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(area) / 2
}

export function polygonCentroid(points: readonly Point[]): Point {
  let x = 0
  let y = 0
  for (const p of points) {
    x += p[0]
    y += p[1]
  }
  return [x / points.length, y / points.length]
}

const GAP = 7

/** Genera la cuadrícula de parcelas con bordes ligeramente irregulares. */
export function generateLayout(count: ParcelCount, seed: number): ParcelGeometry[] {
  const { rows, cols } = GRID[count]
  const rng = mulberry32(seed ^ 0x5eed)
  // Malla de vértices compartidos con ligera irregularidad interior.
  const vertices: Point[][] = []
  for (let r = 0; r <= rows; r++) {
    const row: Point[] = []
    for (let c = 0; c <= cols; c++) {
      const interiorU = c > 0 && c < cols
      const interiorV = r > 0 && r < rows
      const du = interiorU ? (rng() - 0.5) * 0.08 : 0
      const dv = interiorV ? (rng() - 0.5) * 0.1 : 0
      row.push(bilinear(c / cols + du, r / rows + dv))
    }
    vertices.push(row)
  }

  const raw: Omit<ParcelGeometry, 'areaHa' | 'neighbors'>[] = []
  let index = 1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const corners = [vertices[r]?.[c], vertices[r]?.[c + 1], vertices[r + 1]?.[c + 1], vertices[r + 1]?.[c]].filter(
        (p): p is Point => p !== undefined,
      )
      const center = polygonCentroid(corners)
      // Encoge el polígono hacia el centro para dejar caminos entre parcelas.
      const shape = corners.map((p): Point => {
        const dx = center[0] - p[0]
        const dy = center[1] - p[1]
        const len = Math.hypot(dx, dy) || 1
        return [round(p[0] + (dx / len) * GAP, 1), round(p[1] + (dy / len) * GAP, 1)]
      })
      const id = `P-${String(index).padStart(2, '0')}`
      // Las filas superiores están más arriba en la ladera: mayor pendiente.
      const slopeBase = rows === 1 ? 0.4 : 0.55 - (0.3 * r) / (rows - 1)
      raw.push({
        id,
        name: `Lote ${index}`,
        row: r,
        col: c,
        shape,
        centroid: polygonCentroid(shape),
        slope: round(Math.min(0.8, Math.max(0.15, slopeBase + (rng() - 0.5) * 0.12)), 2),
      })
      index++
    }
  }

  const totalPx = raw.reduce((acc, p) => acc + polygonArea(p.shape), 0)
  return raw.map((p) => ({
    ...p,
    areaHa: round((polygonArea(p.shape) / totalPx) * PRODUCTIVE_HA, 2),
    neighbors: raw
      .filter((o) => o.id !== p.id && Math.abs(o.row - p.row) + Math.abs(o.col - p.col) === 1)
      .map((o) => o.id),
  }))
}
