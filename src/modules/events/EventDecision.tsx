import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import {
  checkAffordable,
  EVENT_BY_ID,
  type ActiveEvent,
  type EventSeverity,
  type GameState,
} from '@/engine'
import { CostList } from '@/components/common/cost'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip } from '@/components/ui/overlays'
import { useGameAction } from '@/hooks/use-game'
import { cn } from '@/lib/utils'

export const SEVERITY_META: Record<EventSeverity, { label: string; variant: 'info' | 'success' | 'warning' | 'danger'; icon: React.ComponentType<{ className?: string }> }> = {
  info: { label: 'Información', variant: 'info', icon: Info },
  positivo: { label: 'Oportunidad', variant: 'success', icon: CheckCircle2 },
  advertencia: { label: 'Advertencia', variant: 'warning', icon: AlertTriangle },
  peligro: { label: 'Riesgo alto', variant: 'danger', icon: XCircle },
}

/** Tarjeta de decisión: muestra el evento y sus posibles respuestas con costo real. */
export function EventDecisionCard({ game, event, onDecided }: { game: GameState; event: ActiveEvent; onDecided?: () => void }) {
  const run = useGameAction()
  const def = EVENT_BY_ID[event.eventId]
  if (!def) return null
  const meta = SEVERITY_META[def.severity]
  const target = event.targetParcelId ? game.parcels.find((p) => p.id === event.targetParcelId) : undefined
  return (
    <div className="flex flex-col gap-3" data-testid={`event-${def.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={meta.variant}>
          <meta.icon /> {meta.label}
        </Badge>
        <Badge variant="outline">Duración: {def.durationMonths} mes(es)</Badge>
        {target && <Badge variant="outline">Lote afectado: {target.name}</Badge>}
      </div>
      <p className="text-sm">{def.description}</p>
      <p className="rounded-lg bg-muted px-3 py-2 text-sm">
        <span className="font-semibold">Impacto: </span>
        {def.impactText}
      </p>
      <div className="grid gap-2">
        {def.responses.map((r) => {
          const cost = r.cost(game)
          const error = checkAffordable(game, cost)
          return (
            <div key={r.id} className={cn('flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center', !error && 'hover:border-forest-300')}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
                <div className="mt-1">
                  <CostList cost={cost} game={game} compact />
                </div>
              </div>
              <Tooltip content={error} disabled={!error}>
                <span tabIndex={error ? 0 : -1}>
                  <Button
                    size="sm"
                    variant={r.id === 'ignorar' || r.id === 'rechazar' || r.id === 'multa' ? 'outline' : 'default'}
                    disabled={!!error}
                    onClick={() => {
                      const result = run({ type: 'responderEvento', instanceId: event.instanceId, responseId: r.id })
                      if (result.ok) onDecided?.()
                    }}
                  >
                    Elegir
                  </Button>
                </span>
              </Tooltip>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function EventDecisionDialog({ game, event, open, onClose }: { game: GameState; event: ActiveEvent; open: boolean; onClose: () => void }) {
  const def = EVENT_BY_ID[event.eventId]
  if (!def) return null
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl" data-testid="event-dialog">
        <DialogHeader>
          <DialogTitle>{def.name}</DialogTitle>
          <DialogDescription>Decide cómo responder. Si no eliges, al avanzar el mes se aplicará la opción por defecto.</DialogDescription>
        </DialogHeader>
        <EventDecisionCard game={game} event={event} onDecided={onClose} />
      </DialogContent>
    </Dialog>
  )
}
