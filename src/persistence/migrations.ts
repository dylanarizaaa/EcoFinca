/**
 * Migraciones de datos guardados. Cada partida se guarda con `schemaVersion`.
 * Para cambiar el formato en el futuro:
 *   1. Incrementar SCHEMA_VERSION en engine/config/model.ts.
 *   2. Agregar aquí una función que transforme la versión anterior.
 */

import { SCHEMA_VERSION } from '@/engine'
import type { GameState } from '@/engine'
import { GameStateSchema } from './schema'

type RawSave = Record<string, unknown> & { schemaVersion?: unknown }
type Migration = (save: RawSave) => RawSave

/** Migraciones indexadas por la versión de ORIGEN. */
export const MIGRATIONS: Record<number, Migration> = {
  // Ejemplo para una futura versión 2:
  // 1: (save) => ({ ...save, schemaVersion: 2, nuevoCampo: valorPorDefecto }),
}

export class SaveVersionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SaveVersionError'
  }
}

export class CorruptSaveError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CorruptSaveError'
  }
}

export function migrateSave(raw: unknown, targetVersion = SCHEMA_VERSION): GameState {
  if (typeof raw !== 'object' || raw === null) throw new CorruptSaveError('El guardado no es un objeto válido.')
  let save = raw as RawSave
  let version = typeof save.schemaVersion === 'number' ? save.schemaVersion : 1
  if (version > targetVersion) {
    throw new SaveVersionError(
      `La partida fue guardada con una versión más reciente (${version}) que la soportada (${targetVersion}).`,
    )
  }
  while (version < targetVersion) {
    const migrate = MIGRATIONS[version]
    if (!migrate) throw new SaveVersionError(`No existe migración desde la versión ${version}.`)
    save = migrate(save)
    version += 1
  }
  const parsed = GameStateSchema.safeParse({ ...save, schemaVersion: version })
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new CorruptSaveError(
      `La partida guardada está dañada${issue ? ` (${issue.path.join('.')}: ${issue.message})` : ''}.`,
    )
  }
  return parsed.data
}
