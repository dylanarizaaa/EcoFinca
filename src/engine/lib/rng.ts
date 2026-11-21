/**
 * Generador pseudoaleatorio determinista.
 *
 * Cada canal (clima, eventos, plagas, mercado) usa un flujo independiente
 * derivado de (semilla, turno, canal). Así, dos estrategias distintas que
 * parten de la misma semilla experimentan exactamente el mismo clima, lo que
 * permite comparaciones controladas.
 */

export type Rng = () => number

/** Hash de cadena FNV-1a de 32 bits. */
export function hashString(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Mulberry32: PRNG pequeño, rápido y con buena distribución para juegos. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Crea un flujo aleatorio determinista para un canal y turno concretos. */
export function rngFor(seed: number, turn: number, channel: string): Rng {
  return mulberry32(hashString(`${seed}|${turn}|${channel}`))
}

/** Normal estándar aproximada mediante Box–Muller. */
export function normal(rng: Rng): number {
  const u = Math.max(rng(), 1e-9)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function randomBetween(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng()
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)]
  if (item === undefined) throw new Error('pick() sobre una lista vacía')
  return item
}

/** Genera una semilla entera positiva a partir de Math.random (solo fuera del motor). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647) + 1
}
