/** Utilidades matemáticas puras usadas por el motor. */

export function clamp(value: number, min = 0, max = 100): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

/** Limita un indicador a la escala 0–100. */
export const clamp100 = (value: number): number => clamp(value, 0, 100)

/** Limita a 0–1. */
export const clamp01 = (value: number): number => clamp(value, 0, 1)

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Redondeo a n decimales (evita ruido de coma flotante en el estado). */
export function round(value: number, decimals = 2): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

/**
 * Curva de respuesta lineal con meseta: devuelve `min` cuando x ≤ x0,
 * crece linealmente hasta 1 cuando x ≥ x1.
 */
export function rampResponse(x: number, x0: number, x1: number, min: number): number {
  if (x <= x0) return min
  if (x >= x1) return 1
  return min + (1 - min) * ((x - x0) / (x1 - x0))
}

/**
 * Curva trapezoidal: 1 en el rango óptimo [lowOpt, highOpt], desciende
 * linealmente hacia `minLow` en x=0 y hacia `minHigh` en x=100.
 */
export function trapezoidResponse(
  x: number,
  lowOpt: number,
  highOpt: number,
  minLow: number,
  minHigh: number,
): number {
  if (x < lowOpt) return lerp(minLow, 1, clamp01(x / lowOpt))
  if (x > highOpt) return lerp(1, minHigh, clamp01((x - highOpt) / (100 - highOpt)))
  return 1
}

export function sum(values: readonly number[]): number {
  let total = 0
  for (const v of values) total += v
  return total
}

export function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length
}

/** Media ponderada; devuelve 0 si los pesos suman 0. */
export function weightedMean(values: readonly number[], weights: readonly number[]): number {
  let total = 0
  let w = 0
  values.forEach((v, i) => {
    const wi = weights[i] ?? 0
    total += v * wi
    w += wi
  })
  return w === 0 ? 0 : total / w
}
