import { Link, useNavigate } from '@tanstack/react-router'
import { BookOpen, Flag, HelpCircle, Home, Play, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { GameState } from '@/engine'
import { formatDateTime } from '@/lib/format'

interface PauseMenuProps {
  game: GameState
  open: boolean
  lastSavedAt: string | null
  onClose: () => void
  onSave: () => void
  onFinish: () => void
  onTutorial: () => void
}

export function PauseMenu({ game, open, lastSavedAt, onClose, onSave, onFinish, onTutorial }: PauseMenuProps) {
  const navigate = useNavigate()
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm" data-testid="pause-menu">
        <DialogHeader>
          <DialogTitle>Partida en pausa</DialogTitle>
          <DialogDescription>
            {game.config.farmName} · {lastSavedAt ? `guardada ${formatDateTime(lastSavedAt)}` : 'sin guardar'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button onClick={onClose} size="lg">
            <Play /> Reanudar
          </Button>
          <Button variant="outline" onClick={onSave}>
            <Save /> Guardar ahora
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onClose()
              onTutorial()
            }}
          >
            <HelpCircle /> Ver tutorial
          </Button>
          <Button variant="outline" asChild onClick={onClose}>
            <Link to="/juego/$gameId/enciclopedia" params={{ gameId: game.id }}>
              <BookOpen /> Enciclopedia
            </Link>
          </Button>
          {game.status === 'activo' && (
            <ConfirmDialog
              trigger={
                <Button variant="outline">
                  <Flag /> Finalizar partida ahora
                </Button>
              }
              title="¿Finalizar la partida?"
              description="Se calculará la evaluación final con el estado actual de la finca. No podrás seguir avanzando meses."
              confirmLabel="Finalizar y evaluar"
              onConfirm={() => {
                onFinish()
                onClose()
                void navigate({ to: '/juego/$gameId/evaluacion', params: { gameId: game.id } })
              }}
            />
          )}
          <Button
            variant="ghost"
            onClick={() => {
              onSave()
              onClose()
              void navigate({ to: '/' })
            }}
          >
            <Home /> Guardar y salir al menú
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
