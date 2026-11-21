import { useCallback, useEffect, useState } from 'react'
import { deleteGame, listGames, type GameSummary } from '@/persistence/repository'

/** Lista de partidas guardadas en IndexedDB. */
export function useSavedGames() {
  const [games, setGames] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setGames(await listGames())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron leer las partidas guardadas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const remove = useCallback(
    async (id: string) => {
      await deleteGame(id)
      await refresh()
    },
    [refresh],
  )

  return { games, loading, error, refresh, remove }
}
