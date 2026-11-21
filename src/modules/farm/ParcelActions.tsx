/**
 * Acciones disponibles para una parcela. Cada acción muestra su costo real,
 * sus condiciones y efectos; las que no se pueden ejecutar quedan
 * deshabilitadas con la razón exacta devuelta por el motor.
 */

import { useMemo, useState } from 'react'
import {
  Axe,
  Bug,
  Droplets,
  Fence,
  FlaskConical,
  Hammer,
  Info,
  Leaf,
  ShoppingBasket,
  Sprout,
  Trees,
  TreePine,
  Wrench,
} from 'lucide-react'
import {
  ACTION_INFO,
  getActionCost,
  validateAction,
  VARIETIES,
  type CoffeeVarietyId,
  type ControlMethod,
  type DoseLevel,
  type FertilizerType,
  type GameState,
  type Parcel,
  type ParcelAction,
  type ParcelActionType,
} from '@/engine'
import { CostList } from '@/components/common/cost'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip } from '@/components/ui/overlays'
import { useGameAction } from '@/hooks/use-game'
import { cn } from '@/lib/utils'

const ICONS: Record<ParcelActionType, React.ComponentType<{ className?: string }>> = {
  preparar: Hammer,
  sembrar: Sprout,
  fertilizar: FlaskConical,
  regar: Droplets,
  controlPlagas: Bug,
  cobertura: Leaf,
  barreras: Fence,
  sombrio: Trees,
  mantenimiento: Wrench,
  cosechar: ShoppingBasket,
  reforestar: TreePine,
}

const ORDER: ParcelActionType[] = [
  'cosechar',
  'preparar',
  'sembrar',
  'fertilizar',
  'regar',
  'controlPlagas',
  'mantenimiento',
  'cobertura',
  'barreras',
  'sombrio',
  'reforestar',
]

/** Acciones que requieren elegir opciones o confirmar antes de ejecutarse. */
const NEEDS_DIALOG: ParcelActionType[] = ['sembrar', 'fertilizar', 'controlPlagas', 'reforestar']

function defaultAction(type: ParcelActionType, parcelId: string): ParcelAction {
  switch (type) {
    case 'sembrar':
      return { type, parcelId, variety: 'castillo' }
    case 'fertilizar':
      return { type, parcelId, fertilizer: 'organico', dose: 'recomendada' }
    case 'controlPlagas':
      return { type, parcelId, method: 'integrado' }
    default:
      return { type, parcelId } as ParcelAction
  }
}

/** Acciones relevantes según el estado de la parcela (oculta las que no aplican nunca). */
function relevantActions(parcel: Parcel): ParcelActionType[] {
  if (parcel.landUse === 'reforestacion') return ['barreras']
  return ORDER.filter((t) => {
    const crop = parcel.crop
    if (t === 'cosechar') return crop?.stage === 'cosecha'
    if (t === 'sembrar') return crop?.stage === 'preparacion'
    if (['regar', 'controlPlagas', 'mantenimiento'].includes(t)) return !!crop?.variety
    if (t === 'sombrio') return parcel.landUse === 'cafe' && !!crop
    return true
  })
}

export function ParcelActions({ game, parcel }: { game: GameState; parcel: Parcel }) {
  const run = useGameAction()
  const [dialog, setDialog] = useState<ParcelActionType | null>(null)
  const actions = relevantActions(parcel)

  return (
    <div className="flex flex-col gap-1.5" data-testid="parcel-actions">
      {actions.map((type) => {
        const action = defaultAction(type, parcel.id)
        const error = validateAction(game, action)
        const cost = getActionCost(game, action)
        const Icon = ICONS[type]
        const info = ACTION_INFO[type]
        const renewing = type === 'preparar' && !!parcel.crop?.variety
        const done = parcel.actionsThisTurn.includes(type)
        const execute = () => {
          if (NEEDS_DIALOG.includes(type) || renewing) setDialog(type)
          else run(action)
        }
        return (
          <div
            key={type}
            className={cn(
              'group flex items-center gap-2 rounded-xl border border-border/70 bg-card p-2 transition-colors',
              !error && 'hover:border-forest-300 hover:bg-forest-50/60',
              type === 'cosechar' && !error && 'border-earth-300 bg-sand-100',
            )}
          >
            <div
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                info.sustainable ? 'bg-forest-100 text-forest-700' : 'bg-sand-200 text-earth-600',
                type === 'cosechar' && 'bg-earth-500 text-white',
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold">{renewing ? 'Renovar cafetal' : info.name}</span>
                {info.sustainable && <Badge variant="success" className="hidden px-1.5 py-0 text-[10px] sm:inline-flex">Sostenible</Badge>}
                {done && <Badge variant="muted" className="px-1.5 py-0 text-[10px]">Hecho</Badge>}
              </div>
              <CostList cost={cost} game={game} compact />
            </div>
            <Tooltip
              content={
                <div className="space-y-1">
                  <p className="font-semibold">{info.summary}</p>
                  <p>
                    <b>Efecto inmediato:</b> {info.immediate}
                  </p>
                  <p>
                    <b>Ambiente:</b> {info.environmental}
                  </p>
                  <p>
                    <b>Largo plazo:</b> {info.longTerm}
                  </p>
                </div>
              }
            >
              <button
                type="button"
                className="hidden size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground sm:flex"
                aria-label={`Información sobre ${info.name}`}
                onClick={() => setDialog(type)}
              >
                <Info className="size-4" />
              </button>
            </Tooltip>
            <Tooltip content={error} disabled={!error}>
              <span tabIndex={error ? 0 : -1}>
                <Button
                  size="sm"
                  variant={type === 'cosechar' ? 'earth' : info.sustainable ? 'default' : 'outline'}
                  disabled={!!error}
                  onClick={execute}
                  aria-label={`${info.name} en ${parcel.id}`}
                >
                  {type === 'cosechar' ? 'Cosechar' : 'Hacer'}
                </Button>
              </span>
            </Tooltip>
          </div>
        )
      })}
      {dialog && <ActionDialog game={game} parcel={parcel} type={dialog} onClose={() => setDialog(null)} />}
    </div>
  )
}

const DOSES: { id: DoseLevel; label: string; hint: string }[] = [
  { id: 'baja', label: 'Baja', hint: '½ dosis' },
  { id: 'recomendada', label: 'Recomendada', hint: '1 dosis' },
  { id: 'alta', label: 'Alta', hint: '1¾ dosis' },
]

function OptionButton({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left text-sm transition-all',
        selected ? 'border-forest-500 bg-forest-50 ring-2 ring-forest-500/20' : 'border-border hover:border-forest-300 hover:bg-muted/50',
        className,
      )}
    >
      {children}
    </button>
  )
}

function ActionDialog({
  game,
  parcel,
  type,
  onClose,
}: {
  game: GameState
  parcel: Parcel
  type: ParcelActionType
  onClose: () => void
}) {
  const run = useGameAction()
  const info = ACTION_INFO[type]
  const [variety, setVariety] = useState<CoffeeVarietyId>('castillo')
  const [fertilizer, setFertilizer] = useState<FertilizerType>('organico')
  const [dose, setDose] = useState<DoseLevel>('recomendada')
  const [method, setMethod] = useState<ControlMethod>('integrado')

  const action = useMemo<ParcelAction>(() => {
    switch (type) {
      case 'sembrar':
        return { type, parcelId: parcel.id, variety }
      case 'fertilizar':
        return { type, parcelId: parcel.id, fertilizer, dose }
      case 'controlPlagas':
        return { type, parcelId: parcel.id, method }
      default:
        return defaultAction(type, parcel.id)
    }
  }, [type, parcel.id, variety, fertilizer, dose, method])

  const cost = getActionCost(game, action)
  const error = validateAction(game, action)
  const destructive = type === 'reforestar' || (type === 'preparar' && !!parcel.crop?.variety)
  const Icon = ICONS[type]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="size-5 text-forest-600" />
            {info.name} · {parcel.name} ({parcel.areaHa.toFixed(2)} ha)
          </DialogTitle>
          <DialogDescription>{info.summary}</DialogDescription>
        </DialogHeader>

        {type === 'sembrar' && (
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Variedad">
            {Object.values(VARIETIES).map((v) => (
              <OptionButton key={v.id} selected={variety === v.id} onClick={() => setVariety(v.id)}>
                <span className="font-semibold">{v.name}</span>
                <span className="text-xs text-muted-foreground">{v.description}</span>
                <span className="mt-1 flex gap-1">
                  <Badge variant={v.rustSusceptibility < 0.5 ? 'success' : 'danger'} className="text-[10px]">
                    {v.rustSusceptibility < 0.5 ? 'Resistente a roya' : 'Susceptible a roya'}
                  </Badge>
                </span>
              </OptionButton>
            ))}
          </div>
        )}

        {type === 'fertilizar' && (
          <div className="flex flex-col gap-3">
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de fertilizante">
              <OptionButton selected={fertilizer === 'organico'} onClick={() => setFertilizer('organico')}>
                <span className="font-semibold text-forest-700">Abono orgánico</span>
                <span className="text-xs text-muted-foreground">Liberación gradual, mejora la vida del suelo, sin riesgo de contaminación.</span>
              </OptionButton>
              <OptionButton selected={fertilizer === 'quimico'} onClick={() => setFertilizer('quimico')}>
                <span className="font-semibold text-earth-600">Fertilizante químico</span>
                <span className="text-xs text-muted-foreground">Efecto inmediato; el exceso se lava hacia la quebrada.</span>
              </OptionButton>
            </div>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Dosis">
              {DOSES.map((d) => (
                <OptionButton key={d.id} selected={dose === d.id} onClick={() => setDose(d.id)} className="items-center text-center">
                  <span className="font-semibold">{d.label}</span>
                  <span className="text-xs text-muted-foreground">{d.hint}</span>
                </OptionButton>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Fertilidad actual del lote: <b>{Math.round(parcel.soil.fertility)}</b>. Sobre 82 el fertilizante químico ya no se aprovecha.
            </p>
          </div>
        )}

        {type === 'controlPlagas' && (
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Método de control">
            <OptionButton selected={method === 'integrado'} onClick={() => setMethod('integrado')}>
              <span className="font-semibold text-forest-700">Manejo integrado (MIP)</span>
              <span className="text-xs text-muted-foreground">Control biológico, trampas y prácticas culturales. −50 % y 3 meses de protección.</span>
            </OptionButton>
            <OptionButton selected={method === 'quimico'} onClick={() => setMethod('quimico')}>
              <span className="font-semibold text-earth-600">Control químico</span>
              <span className="text-xs text-muted-foreground">−75 % inmediato y 2 meses de protección. Contamina y reduce la fauna benéfica.</span>
            </OptionButton>
          </div>
        )}

        <div className="grid gap-3 rounded-xl bg-muted/60 p-4 text-sm sm:grid-cols-2">
          <div className="space-y-2">
            <p>
              <span className="font-semibold">Condiciones: </span>
              {info.conditions}
            </p>
            <p>
              <span className="font-semibold">Efecto inmediato: </span>
              {info.immediate}
            </p>
          </div>
          <div className="space-y-2">
            <p>
              <span className="font-semibold">Efecto ambiental: </span>
              {info.environmental}
            </p>
            <p>
              <span className="font-semibold">Largo plazo: </span>
              {info.longTerm}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Costo</p>
          <CostList cost={cost} game={game} />
        </div>

        {destructive && (
          <p className="rounded-lg bg-clay-400/10 px-3 py-2 text-sm text-clay-600">
            {type === 'reforestar'
              ? 'Esta acción es permanente: el lote dejará de producir café.'
              : 'Se eliminarán las plantas actuales del lote para renovarlo.'}
          </p>
        )}
        {error && <p className="rounded-lg bg-sun-300/25 px-3 py-2 text-sm text-earth-700">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={!!error}
            onClick={() => {
              const result = run(action)
              if (result.ok) onClose()
            }}
          >
            {destructive ? <Axe /> : <Icon />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
