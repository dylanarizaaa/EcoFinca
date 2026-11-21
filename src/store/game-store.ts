/**
 * Estado global de la partida (Zustand). Conecta la interfaz con el motor
 * EcoFinca Engine y con la persistencia. Toda la lógica de simulación vive
 * en el motor; aquí solo se orquestan llamadas y se guarda el resultado.
 */

import { create } from 'zustand'
import {
  advanceTurn,
  applyAction,
  createGame,
  finishGame,
  GameActionSchema,
} from '@/engine'
import type { GameAction, GameConfig, GameState, MapLayer, ModelParams, TurnSummary } from '@/engine'
import { loadGame, saveGame } from '@/persistence/repository'

export type ActionFeedback = { ok: true; message: string; effects: string[] } | { ok: false; error: string }

interface GameStore {
  game: GameState | null
  loading: boolean
  error: string | null
  selectedParcelId: string | null
  mapLayer: MapLayer
  lastSummary: TurnSummary | null
  summaryOpen: boolean
  autoPlay: boolean
  saving: boolean
  lastSavedAt: string | null
  autosave: boolean

  startNewGame: (config: GameConfig, params: ModelParams) => Promise<GameState>
  loadGame: (id: string) => Promise<GameState | null>
  perform: (action: GameAction) => ActionFeedback
  advance: (options?: { quiet?: boolean }) => TurnSummary | null
  finish: () => void
  save: () => Promise<void>
  selectParcel: (id: string | null) => void
  setLayer: (layer: MapLayer) => void
  setAutoPlay: (on: boolean) => void
  setAutosave: (on: boolean) => void
  closeSummary: () => void
  unload: () => void
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `game-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export const useGameStore = create<GameStore>((set, get) => {
  const persist = async () => {
    const game = get().game
    if (!game) return
    set({ saving: true })
    try {
      const saved = await saveGame(game)
      // Solo actualizar si la partida en memoria sigue siendo la misma versión.
      if (get().game === game) set({ game: saved })
      set({ lastSavedAt: saved.updatedAt, error: null })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'No fue posible guardar la partida.' })
    } finally {
      set({ saving: false })
    }
  }

  const scheduleSave = (immediate = false) => {
    if (!get().autosave) return
    if (saveTimer) clearTimeout(saveTimer)
    if (immediate) {
      void persist()
      return
    }
    saveTimer = setTimeout(() => {
      saveTimer = null
      void persist()
    }, 400)
  }

  return {
    game: null,
    loading: false,
    error: null,
    selectedParcelId: null,
    mapLayer: 'general',
    lastSummary: null,
    summaryOpen: false,
    autoPlay: false,
    saving: false,
    lastSavedAt: null,
    autosave: true,

    startNewGame: async (config, params) => {
      const now = new Date().toISOString()
      const game = createGame(config, params, { id: newId(), now })
      set({ game, selectedParcelId: game.parcels[0]?.id ?? null, lastSummary: null, summaryOpen: false, autoPlay: false, error: null })
      const saved = await saveGame(game)
      set({ game: saved, lastSavedAt: saved.updatedAt })
      return saved
    },

    loadGame: async (id) => {
      const current = get().game
      if (current?.id === id) return current
      set({ loading: true, error: null })
      try {
        const game = await loadGame(id)
        set({
          game,
          loading: false,
          selectedParcelId: game?.parcels[0]?.id ?? null,
          lastSummary: null,
          summaryOpen: false,
          autoPlay: false,
          lastSavedAt: game?.updatedAt ?? null,
          error: game ? null : 'La partida no existe o fue eliminada.',
        })
        return game
      } catch (e) {
        set({ loading: false, game: null, error: e instanceof Error ? e.message : 'No fue posible cargar la partida.' })
        return null
      }
    },

    perform: (action) => {
      const game = get().game
      if (!game) return { ok: false, error: 'No hay una partida cargada.' }
      const parsed = GameActionSchema.safeParse(action)
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Acción inválida.' }
      const result = applyAction(game, parsed.data)
      if (!result.ok) return { ok: false, error: result.error }
      set({ game: result.state })
      scheduleSave()
      return { ok: true, message: result.message, effects: result.effects }
    },

    advance: (options = {}) => {
      const game = get().game
      if (!game || game.status !== 'activo') return null
      const { state, summary } = advanceTurn(game)
      set({ game: state, lastSummary: summary, summaryOpen: !options.quiet || summary.gameOver })
      if (summary.gameOver) set({ autoPlay: false })
      scheduleSave(true)
      return summary
    },

    finish: () => {
      const game = get().game
      if (!game) return
      set({ game: finishGame(game), autoPlay: false })
      scheduleSave(true)
    },

    save: async () => {
      if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
      }
      await persist()
    },

    selectParcel: (id) => set({ selectedParcelId: id }),
    setLayer: (layer) => set({ mapLayer: layer }),
    setAutoPlay: (on) => set({ autoPlay: on }),
    setAutosave: (on) => set({ autosave: on }),
    closeSummary: () => set({ summaryOpen: false }),
    unload: () => {
      if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
        void persist()
      }
      set({ game: null, lastSummary: null, summaryOpen: false, autoPlay: false, selectedParcelId: null })
    },
  }
})
