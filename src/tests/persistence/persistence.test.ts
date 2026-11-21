import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { advanceTurn, applyAction, DEFAULT_PARAMS, SCHEMA_VERSION } from '@/engine'
import { EcoFincaDB, setDb } from '@/persistence/db'
import { CorruptSaveError, migrateSave, SaveVersionError } from '@/persistence/migrations'
import {
  DEFAULT_SETTINGS,
  deleteGame,
  latestActiveGame,
  listGames,
  loadGame,
  loadSettings,
  saveGame,
  saveSettings,
} from '@/persistence/repository'
import { useGameStore } from '@/store/game-store'
import { makeConfig, makeGame } from '../helpers'

let db: EcoFincaDB

beforeEach(() => {
  db = new EcoFincaDB(`ecofinca-test-${Math.random()}`)
  setDb(db)
})

afterEach(async () => {
  await db.delete()
  setDb(null)
})

describe('Guardado y recuperación', () => {
  it('guarda y recupera una partida idéntica (semilla incluida)', async () => {
    let game = makeGame({ seed: 777 })
    const r = applyAction(game, { type: 'cobertura', parcelId: 'P-01' })
    if (!r.ok) throw new Error(r.error)
    game = advanceTurn(advanceTurn(r.state).state).state
    const saved = await saveGame(game)
    const loaded = await loadGame(game.id)
    expect(loaded).toEqual(saved)
    expect(loaded?.config.seed).toBe(777)
    expect(loaded?.history).toHaveLength(2)
    expect(loaded?.transactions.length).toBe(game.transactions.length)
  })

  it('la partida recuperada continúa exactamente igual que la original', async () => {
    const game = advanceTurn(makeGame()).state
    await saveGame(game)
    const loaded = await loadGame(game.id)
    if (!loaded) throw new Error('no cargó')
    const a = advanceTurn(game).state
    const b = advanceTurn(loaded).state
    expect(b.parcels).toEqual(a.parcels)
    expect(b.environment).toEqual(a.environment)
    expect(b.inventory).toEqual(a.inventory)
  })

  it('lista, ordena y elimina partidas', async () => {
    await saveGame({ ...makeGame(), id: 'a' })
    await new Promise((r) => setTimeout(r, 5))
    await saveGame({ ...makeGame({ farmName: 'El Porvenir' }), id: 'b' })
    const list = await listGames()
    expect(list.map((g) => g.id)).toEqual(['b', 'a'])
    expect(list[0]?.farmName).toBe('El Porvenir')
    expect(list[0]).not.toHaveProperty('state')
    expect((await latestActiveGame())?.id).toBe('b')
    await deleteGame('b')
    expect((await listGames()).map((g) => g.id)).toEqual(['a'])
  })

  it('devuelve null para una partida inexistente', async () => {
    expect(await loadGame('no-existe')).toBeNull()
  })

  it('rechaza guardados dañados', async () => {
    const game = makeGame()
    const broken = { ...game, parcels: 'no-es-una-lista' }
    expect(() => migrateSave(broken)).toThrow(CorruptSaveError)
    expect(() => migrateSave(null)).toThrow(CorruptSaveError)
  })

  it('rechaza guardados de una versión futura', () => {
    const game = makeGame()
    expect(() => migrateSave({ ...game, schemaVersion: SCHEMA_VERSION + 1 })).toThrow(SaveVersionError)
  })

  it('aplica migraciones registradas', () => {
    const game = makeGame()
    const migrated = migrateSave({ ...game, schemaVersion: 1 }, 1)
    expect(migrated.schemaVersion).toBe(1)
  })
})

describe('Configuración', () => {
  it('usa valores por defecto y guarda cambios validados', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS)
    await saveSettings({ ...DEFAULT_SETTINGS, autosave: false, params: { ...DEFAULT_PARAMS, baseYieldKgHa: 1500 } })
    const loaded = await loadSettings()
    expect(loaded.autosave).toBe(false)
    expect(loaded.params.baseYieldKgHa).toBe(1500)
  })

  it('rechaza parámetros fuera de rango', async () => {
    await expect(saveSettings({ ...DEFAULT_SETTINGS, params: { ...DEFAULT_PARAMS, baseYieldKgHa: -5 } })).rejects.toThrow()
  })
})

describe('Store de la partida', () => {
  it('crea, actúa, avanza, guarda y recupera desde IndexedDB', async () => {
    const store = useGameStore.getState()
    const game = await store.startNewGame(makeConfig(), DEFAULT_PARAMS)
    expect(useGameStore.getState().game?.id).toBe(game.id)

    const feedback = useGameStore.getState().perform({ type: 'cobertura', parcelId: 'P-01' })
    expect(feedback.ok).toBe(true)
    const summary = useGameStore.getState().advance()
    expect(summary?.turn).toBe(0)
    await useGameStore.getState().save()

    useGameStore.getState().unload()
    expect(useGameStore.getState().game).toBeNull()

    const loaded = await useGameStore.getState().loadGame(game.id)
    expect(loaded?.turn).toBe(1)
    expect(loaded?.parcels.find((p) => p.id === 'P-01')?.practices.cover.active).toBe(true)
    useGameStore.getState().unload()
  })

  it('valida las acciones con Zod antes de enviarlas al motor', async () => {
    await useGameStore.getState().startNewGame(makeConfig(), DEFAULT_PARAMS)
    const bad = useGameStore.getState().perform({ type: 'comprar', item: 'abonoOrganico', quantity: -3 })
    expect(bad.ok).toBe(false)
    useGameStore.getState().unload()
  })
})
