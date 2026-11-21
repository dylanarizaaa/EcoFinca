/** Repositorio de partidas y configuración sobre IndexedDB. */

import { computeScores, DEFAULT_PARAMS, totalMonths } from '@/engine'
import type { GameState } from '@/engine'
import { getDb, type GameRecord } from './db'
import { migrateSave } from './migrations'
import { AppSettingsSchema, type AppSettings } from './schema'

export type GameSummary = Omit<GameRecord, 'state'>

export const DEFAULT_SETTINGS: AppSettings = {
  autosave: true,
  reduceMotion: false,
  showTutorial: true,
  showTooltips: true,
  autoAdvanceSeconds: 6,
  params: DEFAULT_PARAMS,
}

function toRecord(state: GameState): GameRecord {
  return {
    id: state.id,
    farmName: state.config.farmName,
    managerName: state.config.managerName,
    scenarioId: state.config.scenarioId,
    difficulty: state.config.difficulty,
    turn: state.turn,
    totalMonths: totalMonths(state),
    status: state.status,
    money: Math.round(state.inventory.money),
    globalScore: computeScores(state).global,
    schemaVersion: state.schemaVersion,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    state,
  }
}

export async function saveGame(state: GameState): Promise<GameState> {
  const saved: GameState = { ...state, updatedAt: new Date().toISOString() }
  await getDb().games.put(toRecord(saved))
  return saved
}

/** Carga y valida una partida. Lanza un error descriptivo si está dañada. */
export async function loadGame(id: string): Promise<GameState | null> {
  const record = await getDb().games.get(id)
  if (!record) return null
  return migrateSave(record.state)
}

export async function listGames(): Promise<GameSummary[]> {
  const records = await getDb().games.orderBy('updatedAt').reverse().toArray()
  return records.map(({ state: _state, ...summary }) => summary)
}

export async function latestActiveGame(): Promise<GameSummary | null> {
  const games = await listGames()
  return games.find((g) => g.status === 'activo') ?? games[0] ?? null
}

export async function deleteGame(id: string): Promise<void> {
  await getDb().games.delete(id)
}

export async function countGames(): Promise<number> {
  return getDb().games.count()
}

export async function loadSettings(): Promise<AppSettings> {
  const record = await getDb().settings.get('app')
  if (!record) return DEFAULT_SETTINGS
  const parsed = AppSettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...record.value })
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const parsed = AppSettingsSchema.parse(settings)
  await getDb().settings.put({ key: 'app', value: parsed, updatedAt: new Date().toISOString() })
  return parsed
}
