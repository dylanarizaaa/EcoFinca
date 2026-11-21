import { CheckCircle2, Hammer } from 'lucide-react'
import { getActionCost, INVESTMENTS, validateAction, type GameState, type InvestmentId } from '@/engine'
import { CostList } from '@/components/common/cost'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Tooltip } from '@/components/ui/overlays'
import { useGameAction } from '@/hooks/use-game'
import { formatCop } from '@/lib/format'

function isInstalled(game: GameState, id: InvestmentId): boolean {
  const infra = game.infrastructure
  if (id === 'riegoGoteo') return infra.irrigation === 'goteo'
  if (id === 'beneficioEcologico') return infra.ecoProcessing
  if (id === 'certificacion') return infra.certified
  return infra.reservoirCapacity >= 1800
}

export function InvestmentCard({ game, id }: { game: GameState; id: InvestmentId }) {
  const run = useGameAction()
  const info = INVESTMENTS[id]
  const action = { type: 'invertir', investment: id } as const
  const cost = getActionCost(game, action)
  const error = validateAction(game, action)
  const installed = isInstalled(game, id)
  return (
    <div className="surface flex flex-col gap-3 p-4" data-testid={`investment-${id}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display font-bold">{info.name}</h3>
          <p className="text-sm text-muted-foreground">{info.description}</p>
        </div>
        {installed && (
          <Badge variant="success">
            <CheckCircle2 /> Instalado
          </Badge>
        )}
      </div>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {info.benefits.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          <CostList cost={cost} game={game} compact />
          Mantenimiento: {formatCop(info.monthlyMaintenance)}/mes
        </div>
        {!installed || id === 'reservorio' ? (
          <ConfirmDialog
            trigger={
              <Tooltip content={error} disabled={!error}>
                <span tabIndex={error ? 0 : -1}>
                  <Button size="sm" disabled={!!error}>
                    <Hammer /> Invertir
                  </Button>
                </span>
              </Tooltip>
            }
            title={`¿Invertir en ${info.name.toLowerCase()}?`}
            description={
              <div className="space-y-2">
                <p>{info.description}</p>
                <CostList cost={cost} game={game} />
              </div>
            }
            confirmLabel="Invertir"
            onConfirm={() => run(action)}
          />
        ) : null}
      </div>
    </div>
  )
}
