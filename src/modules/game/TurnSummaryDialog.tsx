import { AlertTriangle, CheckCircle2, Info, PartyPopper, Trophy, XCircle } from 'lucide-react'
import { CONDITION_INFO, type EventSeverity, type TurnSummary } from '@/engine'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { dateLabel, formatCopShort, formatDelta, formatKg, formatNumber } from '@/lib/format'
import { INDICATORS, type IndicatorKey } from '@/lib/indicators'
import { cn } from '@/lib/utils'
import { WEATHER_ICONS } from './TopBar'

const SEVERITY_ICON: Record<EventSeverity, React.ComponentType<{ className?: string }>> = {
  info: Info,
  positivo: CheckCircle2,
  advertencia: AlertTriangle,
  peligro: XCircle,
}

const SEVERITY_CLASS: Record<EventSeverity, string> = {
  info: 'text-water-600',
  positivo: 'text-forest-600',
  advertencia: 'text-sun-500',
  peligro: 'text-clay-500',
}

const KEYS: IndicatorKey[] = ['fertility', 'moisture', 'erosion', 'health', 'waterQuality', 'biodiversity', 'contamination']

export function TurnSummaryDialog({
  summary,
  open,
  onClose,
  onEvaluate,
}: {
  summary: TurnSummary
  open: boolean
  onClose: () => void
  onEvaluate: () => void
}) {
  const WeatherIcon = WEATHER_ICONS[summary.climate.condition]
  const moneyDelta = summary.after.money - summary.before.money
  const waterDelta = summary.after.water - summary.before.water
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl" data-testid="turn-summary">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Resumen de {dateLabel(summary.month, summary.year)}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <WeatherIcon className="size-4" /> {CONDITION_INFO[summary.climate.condition].name} · {summary.climate.precipitation} mm de lluvia ·{' '}
            {summary.climate.temperature.toFixed(1)} °C
          </DialogDescription>
        </DialogHeader>

        {summary.gameOver && (
          <div className="flex items-center gap-3 rounded-xl bg-sun-300/30 p-4">
            <Trophy className="size-8 text-sun-500" />
            <div>
              <p className="font-display font-bold">La partida ha terminado</p>
              <p className="text-sm text-muted-foreground">Consulta la evaluación final con tus resultados y recomendaciones.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {KEYS.map((k) => {
            const meta = INDICATORS[k]
            const delta = summary.after[k] - summary.before[k]
            const good = meta.higherIsBetter ? delta > 0 : delta < 0
            const Icon = meta.icon
            return (
              <div key={k} className="rounded-xl bg-muted/60 p-2.5">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <Icon className="size-3.5" />
                  {meta.label}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-lg font-bold tabular">{Math.round(summary.after[k])}</span>
                  {Math.abs(delta) >= 0.1 && (
                    <span className={cn('text-xs font-semibold', good ? 'text-forest-600' : 'text-clay-500')}>{formatDelta(delta)}</span>
                  )}
                </div>
              </div>
            )
          })}
          <div className="rounded-xl bg-muted/60 p-2.5">
            <div className="text-[11px] font-semibold text-muted-foreground">Dinero</div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-lg font-bold tabular">{formatCopShort(summary.after.money)}</span>
              <span className={cn('text-xs font-semibold', moneyDelta >= 0 ? 'text-forest-600' : 'text-clay-500')}>
                {moneyDelta >= 0 ? '+' : ''}
                {formatCopShort(moneyDelta)}
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Agua en reservorio: {formatNumber(summary.after.water)} m³ ({waterDelta >= 0 ? '+' : ''}
          {formatNumber(waterDelta)} m³ respecto al inicio del mes). Puntuación global: <b>{summary.scores.global}</b> ({summary.scores.classification}).
        </p>

        {summary.cycleCompleted && (
          <div className="rounded-xl border border-forest-200 bg-forest-50 p-4">
            <p className="flex items-center gap-2 font-display font-bold text-forest-800">
              <PartyPopper className="size-5" /> Ciclo productivo {summary.cycleCompleted.cycle} completado
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                Producción
                <div className="font-bold">{formatKg(summary.cycleCompleted.production)}</div>
              </div>
              <div>
                Ingresos
                <div className="font-bold">{formatCopShort(summary.cycleCompleted.income)}</div>
              </div>
              <div>
                Ganancia
                <div className={cn('font-bold', summary.cycleCompleted.profit < 0 && 'text-clay-600')}>
                  {formatCopShort(summary.cycleCompleted.profit)}
                </div>
              </div>
              <div>
                Clasificación
                <div>
                  <Badge variant="success">{summary.cycleCompleted.scores.classification}</Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {summary.messages.length > 0 ? (
          <ul className="max-h-56 space-y-1.5 overflow-y-auto" aria-label="Novedades del mes">
            {summary.messages.map((m, i) => {
              const Icon = SEVERITY_ICON[m.severity]
              return (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Icon className={cn('mt-0.5 size-4 shrink-0', SEVERITY_CLASS[m.severity])} />
                  <span>{m.text}</span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Un mes tranquilo en la finca: sin novedades destacadas.</p>
        )}

        <DialogFooter>
          {summary.gameOver ? (
            <Button onClick={onEvaluate}>
              <Trophy /> Ver evaluación final
            </Button>
          ) : (
            <Button onClick={onClose} autoFocus>
              Continuar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
