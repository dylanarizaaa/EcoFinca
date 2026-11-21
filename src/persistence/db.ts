/**
 * Base de datos local (IndexedDB) mediante Dexie.
 *
 * Tablas:
 *   - games:    partidas completas (estado serializado + metadatos para listar)
 *   - settings: preferencias de la aplicación y parámetros del modelo
 *
 * Versiones del esquema de Dexie (índices). El versionado del contenido de
 * las partidas se gestiona aparte con `schemaVersion` (ver migrations.ts).
 */

import Dexie, { type EntityTable } from 'dexie'
import type { Difficulty, GameState, GameStatus, ScenarioId } from '@/engine'
import type { AppSettings } from './schema'

export interface GameRecord {
  id: string
  farmName: string
  managerName: string
  scenarioId: ScenarioId
  difficulty: Difficulty
  turn: number
  totalMonths: number
  status: GameStatus
  money: number
  globalScore: number
  schemaVersion: number
  createdAt: string
  updatedAt: string
  state: GameState
}

export interface SettingsRecord {
  key: 'app'
  value: AppSettings
  updatedAt: string
}

export class EcoFincaDB extends Dexie {
  games!: EntityTable<GameRecord, 'id'>
  settings!: EntityTable<SettingsRecord, 'key'>

  constructor(name = 'ecofinca') {
    super(name)
    this.version(1).stores({
      games: 'id, updatedAt, status, scenarioId',
      settings: 'key',
    })
  }
}

let instance: EcoFincaDB | null = null

export function getDb(): EcoFincaDB {
  instance ??= new EcoFincaDB()
  return instance
}

/** Permite inyectar una base de datos distinta (pruebas). */
export function setDb(db: EcoFincaDB | null): void {
  instance = db
}
