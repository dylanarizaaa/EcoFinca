import type { ReactNode } from 'react'
import { Coins, Users } from 'lucide-react'
import { RESOURCES, type Cost, type GameState, type ResourceId } from '@/engine'
import { formatCop, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

const SHORT_NAMES: Partial<Record<ResourceId, string>> = {
  abonoOrganico: 'de abono',
  fertilizanteQuimico: 'de fertilizante',
  controlQuimico: 'de plaguicida',
  controlBiologico: 'de biocontrol',
}

/** Muestra el costo de una acción comparado con la disponibilidad actual. */
export function CostList({ cost, game, compact = false }: { cost: Cost; game: GameState; compact?: boolean }) {
  const items: { key: string; label: string; value: string; short?: string; ok: boolean; icon?: ReactNode }[] = []
  if (cost.money > 0)
    items.push({ key: 'money', label: 'Dinero', value: formatCop(cost.money), ok: game.inventory.money >= cost.money, icon: <Coins className="size-3.5" /> })
  if (cost.labor > 0)
    items.push({
      key: 'labor',
      label: 'Jornales',
      value: formatNumber(cost.labor, 1),
      ok: game.labor.available >= cost.labor,
      icon: <Users className="size-3.5" />,
    })
  for (const [key, amount] of Object.entries(cost.resources) as [ResourceId, number][]) {
    if (!amount) continue
    const info = RESOURCES[key]
    items.push({
      key,
      label: info.name,
      value: `${formatNumber(amount, 1)} ${amount === 1 ? info.unit : info.unitPlural}`,
      short: SHORT_NAMES[key],
      ok: game.inventory[key] >= amount,
    })
  }
  if (items.length === 0) return <span className="text-xs text-muted-foreground">Sin costo</span>
  if (compact) {
    return (
      <span className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
        {items.map((i) => (
          <span key={i.key} className={cn('inline-flex items-center gap-1 tabular', i.ok ? 'text-muted-foreground' : 'font-semibold text-clay-600')}>
            {i.icon}
            {i.short ? `${i.value} ${i.short}` : i.value}
          </span>
        ))}
      </span>
    )
  }
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
      {items.map((i) => (
        <div key={i.key} className="contents">
          <dt className="flex items-center gap-1.5 text-muted-foreground">
            {i.icon}
            {i.label}
          </dt>
          <dd className={cn('text-right font-semibold tabular', !i.ok && 'text-clay-600')}>{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}
