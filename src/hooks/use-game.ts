import { useCallback } from 'react'
import { toast } from 'sonner'
import type { GameAction, GameState } from '@/engine'
import { useGameStore, type ActionFeedback } from '@/store/game-store'

/** Partida activa. Solo debe usarse dentro de las rutas del juego (el layout garantiza que exista). */
export function useGame(): GameState {
  const game = useGameStore((s) => s.game)
  if (!game) throw new Error('useGame() requiere una partida cargada.')
  return game
}

/** Ejecuta una acción del motor y muestra el resultado como notificación. */
export function useGameAction() {
  const perform = useGameStore((s) => s.perform)
  return useCallback(
    (action: GameAction, options: { silent?: boolean } = {}): ActionFeedback => {
      const result = perform(action)
      if (!options.silent) {
        if (result.ok) {
          toast.success(result.message, {
            description: result.effects.length ? result.effects.slice(0, 3).join(' ') : undefined,
          })
        } else {
          toast.error('No es posible realizar la acción', { description: result.error })
        }
      }
      return result
    },
    [perform],
  )
}
