import { createGame, DEFAULT_PARAMS } from '@/engine'
import type { GameConfig, GameState, Parcel, ScenarioId } from '@/engine'

export function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    farmName: 'La Esperanza',
    managerName: 'Ana Rojas',
    scenarioId: 'equilibrada',
    difficulty: 'normal',
    initialBudget: 30_000_000,
    durationYears: 3,
    parcelCount: 6,
    seed: 12345,
    startYear: 2026,
    ...overrides,
  }
}

export function makeGame(overrides: Partial<GameConfig> = {}, scenario?: ScenarioId): GameState {
  return createGame(makeConfig({ ...overrides, ...(scenario ? { scenarioId: scenario } : {}) }), DEFAULT_PARAMS, {
    id: 'test-game',
    now: '2026-01-01T00:00:00.000Z',
  })
}

/** Devuelve una copia del estado con una parcela modificada. */
export function withParcel(state: GameState, id: string, fn: (p: Parcel) => void): GameState {
  const draft = structuredClone(state)
  const parcel = draft.parcels.find((p) => p.id === id)
  if (!parcel) throw new Error(`Parcela ${id} no encontrada`)
  fn(parcel)
  return draft
}

export function firstParcel(state: GameState): Parcel {
  const p = state.parcels[0]
  if (!p) throw new Error('Sin parcelas')
  return p
}

export function parcel(state: GameState, id: string): Parcel {
  const p = state.parcels.find((x) => x.id === id)
  if (!p) throw new Error(`Parcela ${id} no encontrada`)
  return p
}

export const INDICATOR_KEYS = ['fertility', 'moisture', 'erosion', 'contamination'] as const
