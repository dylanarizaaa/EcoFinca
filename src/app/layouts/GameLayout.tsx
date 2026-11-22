import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate, useParams } from '@tanstack/react-router'
import { AlertTriangle, Home } from 'lucide-react'
import { toast } from 'sonner'
import { pendingEvents } from '@/engine'
import { EmptyState, LoadingScreen } from '@/components/common/layout'
import { Button } from '@/components/ui/button'
import { EventDecisionDialog } from '@/modules/events/EventDecision'
import { GameNav } from '@/modules/game/GameNav'
import { PauseMenu } from '@/modules/game/PauseMenu'
import { TopBar } from '@/modules/game/TopBar'
import { TurnSummaryDialog } from '@/modules/game/TurnSummaryDialog'
import { Tutorial } from '@/modules/game/Tutorial'
import { useGameStore } from '@/store/game-store'
import { useSettingsStore } from '@/store/settings-store'

function tutorialKey(id: string) {
  return `ecofinca:tutorial:${id}`
}

function readTutorialSeen(id: string): boolean {
  try {
    return localStorage.getItem(tutorialKey(id)) === '1'
  } catch {
    return false
  }
}

function writeTutorialSeen(id: string) {
  try {
    localStorage.setItem(tutorialKey(id), '1')
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}

export function GameLayout() {
  const { gameId } = useParams({ from: '/juego/$gameId' })
  const navigate = useNavigate()
  const game = useGameStore((s) => s.game)
  const loading = useGameStore((s) => s.loading)
  const error = useGameStore((s) => s.error)
  const loadGame = useGameStore((s) => s.loadGame)
  const advance = useGameStore((s) => s.advance)
  const save = useGameStore((s) => s.save)
  const finish = useGameStore((s) => s.finish)
  const saving = useGameStore((s) => s.saving)
  const lastSavedAt = useGameStore((s) => s.lastSavedAt)
  const summary = useGameStore((s) => s.lastSummary)
  const summaryOpen = useGameStore((s) => s.summaryOpen)
  const closeSummary = useGameStore((s) => s.closeSummary)
  const autoPlay = useGameStore((s) => s.autoPlay)
  const setAutoPlay = useGameStore((s) => s.setAutoPlay)
  const setAutosave = useGameStore((s) => s.setAutosave)
  const settings = useSettingsStore((s) => s.settings)

  const [pauseOpen, setPauseOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [dismissedEvent, setDismissedEvent] = useState<string | null>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void loadGame(gameId)
  }, [gameId, loadGame])

  useEffect(() => {
    setAutosave(settings.autosave)
  }, [settings.autosave, setAutosave])

  useEffect(() => {
    if (game && game.id === gameId && game.turn === 0 && settings.showTutorial && !readTutorialSeen(game.id)) {
      setTutorialOpen(true)
    }
  }, [game, gameId, settings.showTutorial])

  const pending = game ? pendingEvents(game) : []
  const firstPending = pending[0]
  const blocked = pending.length > 0 || summaryOpen || pauseOpen

  // Avance automático: los meses pasan solos mientras no haya decisiones pendientes.
  useEffect(() => {
    if (!autoPlay || !game || game.status !== 'activo') return
    if (pending.length > 0 || pauseOpen) {
      setAutoPlay(false)
      if (pending.length > 0) toast.info('Avance automático detenido: hay una decisión pendiente.')
      return
    }
    const timer = setTimeout(() => {
      const result = advance({ quiet: true })
      if (result) {
        const important = result.messages.filter((m) => m.severity === 'peligro' || m.severity === 'positivo')
        toast(`Mes procesado`, { description: important.map((m) => m.text).slice(0, 2).join(' ') || 'Sin novedades destacadas.' })
      }
    }, settings.autoAdvanceSeconds * 1000)
    return () => clearTimeout(timer)
  }, [autoPlay, game, pending.length, pauseOpen, advance, setAutoPlay, settings.autoAdvanceSeconds])

  // Altura de la barra superior para posicionar la navegación fija.
  useEffect(() => {
    const el = headerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [game?.id])

  if (loading || (!game && !error)) return <LoadingScreen label="Cargando la finca…" />
  if (!game || game.id !== gameId) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <EmptyState
          icon={AlertTriangle}
          title="No fue posible abrir la partida"
          description={error ?? 'La partida no existe.'}
          action={
            <Button asChild>
              <Link to="/">
                <Home /> Volver al inicio
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  const handleSave = async () => {
    await save()
    const err = useGameStore.getState().error
    if (err) toast.error('No se pudo guardar', { description: err })
    else toast.success('Partida guardada')
  }

  const handleAdvance = () => {
    if (pending.length > 0 && firstPending) {
      setDismissedEvent(null)
      toast.warning('Tienes decisiones pendientes', {
        description: 'Si avanzas sin decidir, se aplicará la opción por defecto.',
        action: { label: 'Avanzar igual', onClick: () => advance() },
      })
      return
    }
    advance()
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div ref={headerRef} className="sticky top-[var(--safe-top)] z-30">
        <TopBar
          game={game}
          saving={saving}
          autoPlay={autoPlay}
          onSave={() => void handleSave()}
          onPause={() => {
            setAutoPlay(false)
            setPauseOpen(true)
          }}
          onToggleAutoPlay={() => setAutoPlay(!autoPlay)}
          onAdvance={handleAdvance}
        />
      </div>
      <GameNav game={game} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 sm:px-4 sm:py-5">
        <Outlet />
      </main>

      {summary && (
        <TurnSummaryDialog
          summary={summary}
          open={summaryOpen}
          onClose={closeSummary}
          onEvaluate={() => {
            closeSummary()
            void navigate({ to: '/juego/$gameId/evaluacion', params: { gameId: game.id } })
          }}
        />
      )}
      {firstPending && !summaryOpen && !pauseOpen && game.status === 'activo' && (
        <EventDecisionDialog
          game={game}
          event={firstPending}
          open={dismissedEvent !== firstPending.instanceId}
          onClose={() => setDismissedEvent(firstPending.instanceId)}
        />
      )}
      <PauseMenu
        game={game}
        open={pauseOpen}
        lastSavedAt={lastSavedAt}
        onClose={() => setPauseOpen(false)}
        onSave={() => void handleSave()}
        onFinish={finish}
        onTutorial={() => setTutorialOpen(true)}
      />
      <Tutorial
        open={tutorialOpen && !blocked}
        onClose={() => {
          setTutorialOpen(false)
          writeTutorialSeen(game.id)
        }}
      />
    </div>
  )
}
