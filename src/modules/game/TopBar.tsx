import { Link } from '@tanstack/react-router'
import {
  Calendar,
  CloudRain,
  Cloud,
  CloudLightning,
  Coins,
  Droplets,
  FastForward,
  Loader2,
  Pause,
  Play,
  Save,
  Sun,
  ThermometerSun,
  Users,
} from 'lucide-react'
import { CONDITION_INFO, cycleForTurn, pendingEvents, RESOURCES, totalMonths, type GameState, type WeatherCondition } from '@/engine'
import { Logo } from '@/components/common/layout'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/overlays'
import { dateLabel, formatCop, formatCopShort, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

export const WEATHER_ICONS: Record<WeatherCondition, React.ComponentType<{ className?: string }>> = {
  soleado: Sun,
  nublado: Cloud,
  'lluvia-moderada': CloudRain,
  'lluvia-intensa': CloudLightning,
  sequia: ThermometerSun,
  calor: ThermometerSun,
}

function Chip({
  icon: Icon,
  label,
  value,
  tone = 'default',
  tooltip,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  tone?: 'default' | 'danger' | 'warning'
  tooltip: React.ReactNode
}) {
  return (
    <Tooltip content={tooltip} side="bottom">
      <div
        className={cn(
          'flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-1.5 lg:min-w-0 lg:shrink',
          tone === 'danger' ? 'bg-clay-500/25 ring-1 ring-clay-400/60' : tone === 'warning' ? 'bg-sun-400/20' : 'bg-white/8',
        )}
        tabIndex={0}
      >
        <Icon className="size-4 shrink-0 text-leaf-300" />
        <div className="min-w-0 leading-tight">
          <div className="text-[10px] font-semibold tracking-wide text-forest-200 uppercase">{label}</div>
          <div className="truncate text-sm font-bold text-white tabular">{value}</div>
        </div>
      </div>
    </Tooltip>
  )
}

interface TopBarProps {
  game: GameState
  saving: boolean
  autoPlay: boolean
  onSave: () => void
  onPause: () => void
  onToggleAutoPlay: () => void
  onAdvance: () => void
}

export function TopBar({ game, saving, autoPlay, onSave, onPause, onToggleAutoPlay, onAdvance }: TopBarProps) {
  const months = totalMonths(game)
  const cycle = Math.min(cycleForTurn(game.turn), game.config.durationYears)
  const WeatherIcon = WEATHER_ICONS[game.climate.condition]
  const waterPct = Math.round((game.inventory.agua / game.infrastructure.reservoirCapacity) * 100)
  const active = game.status === 'activo'
  const pending = pendingEvents(game).length
  return (
    <header className="sticky top-0 z-30 border-b border-forest-950/20 bg-forest-800 text-white shadow-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-3 py-2 sm:px-4">
        <Link to="/" className="mr-1 shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-leaf-300" aria-label="Volver al inicio">
          <Logo light compact />
        </Link>
        <div className="mr-2 min-w-0">
          <div className="truncate font-display text-base leading-tight font-extrabold">{game.config.farmName}</div>
          <div className="truncate text-xs text-forest-200">Adm. {game.config.managerName}</div>
        </div>

        <div className="order-3 flex w-full gap-1.5 overflow-x-auto pb-0.5 lg:order-none lg:w-auto lg:flex-1 lg:pb-0">
          <Chip
            icon={Calendar}
            label={`Ciclo ${cycle}/${game.config.durationYears}`}
            value={dateLabel(game.calendar.month, game.calendar.year)}
            tooltip={`Mes ${Math.min(game.turn + 1, months)} de ${months}. Cada ciclo productivo dura 12 meses.`}
          />
          <Chip
            icon={Coins}
            label="Dinero"
            value={formatCopShort(game.inventory.money)}
            tone={game.inventory.money < 0 ? 'danger' : game.inventory.money < game.params.monthlyFixedCost * 2 ? 'warning' : 'default'}
            tooltip={`${formatCop(game.inventory.money)} disponibles. Costos fijos ≈ ${formatCopShort(game.params.monthlyFixedCost)} al mes.`}
          />
          <Chip
            icon={Droplets}
            label="Agua"
            value={`${formatNumber(game.inventory.agua)} m³ · ${waterPct}%`}
            tone={game.inventory.agua < RESOURCES.agua.criticalLevel ? 'danger' : waterPct < 35 ? 'warning' : 'default'}
            tooltip={`Reservorio: ${formatNumber(game.inventory.agua)} de ${formatNumber(game.infrastructure.reservoirCapacity)} m³.`}
          />
          <Chip
            icon={WeatherIcon}
            label="Clima"
            value={`${CONDITION_INFO[game.climate.condition].name} · ${game.climate.temperature.toFixed(1)}°C`}
            tone={game.climate.condition === 'sequia' || game.climate.condition === 'lluvia-intensa' ? 'warning' : 'default'}
            tooltip={`${CONDITION_INFO[game.climate.condition].description} Lluvia esperada: ${game.climate.precipitation} mm.`}
          />
          <Chip
            icon={Users}
            label="Jornales"
            value={formatNumber(game.labor.available, 1)}
            tone={game.labor.available < 4 ? 'warning' : 'default'}
            tooltip="Mano de obra disponible este mes. Se renueva al avanzar el mes; puedes contratar más en Recursos."
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Tooltip content={saving ? 'Guardando…' : 'Guardar partida'} side="bottom">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={onSave} aria-label="Guardar partida">
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
            </Button>
          </Tooltip>
          <Tooltip content="Pausar: menú de partida" side="bottom">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={onPause} aria-label="Pausar partida">
              <Pause />
            </Button>
          </Tooltip>
          <Tooltip
            content={
              pending > 0
                ? 'Hay decisiones pendientes: el avance automático se detiene hasta resolverlas.'
                : autoPlay
                  ? 'Detener el avance automático'
                  : 'Avance automático: los meses pasan solos'
            }
            side="bottom"
          >
            <Button
              variant="ghost"
              size="icon"
              className={cn('text-white hover:bg-white/10 hover:text-white', autoPlay && 'bg-white/15')}
              onClick={onToggleAutoPlay}
              disabled={!active}
              aria-label={autoPlay ? 'Detener avance automático' : 'Iniciar avance automático'}
              aria-pressed={autoPlay}
            >
              {autoPlay ? <Pause className="text-sun-300" /> : <Play />}
            </Button>
          </Tooltip>
          <Button variant="sun" onClick={onAdvance} disabled={!active} className="font-bold" data-testid="advance-month">
            <FastForward />
            <span className="hidden sm:inline">Avanzar mes</span>
          </Button>
        </div>
      </div>
      {!active && (
        <div className="bg-sun-400 px-4 py-1.5 text-center text-sm font-semibold text-earth-700">
          La partida terminó.{' '}
          <Link to="/juego/$gameId/evaluacion" params={{ gameId: game.id }} className="underline">
            Ver la evaluación final
          </Link>
        </div>
      )}
    </header>
  )
}
