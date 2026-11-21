import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Coins, Droplets, Package, ShoppingCart, Users, Waves } from 'lucide-react'
import {
  checkAffordable,
  currentResourcePrice,
  RESOURCES,
  WATER_RESOURCES,
  type InvestmentId,
  type ResourceId,
} from '@/engine'
import { StatTile } from '@/components/common/indicators'
import { PageHeader } from '@/components/common/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label, Progress } from '@/components/ui/misc'
import { useGame, useGameAction } from '@/hooks/use-game'
import { formatCop, formatCopShort, formatKg, formatNumber } from '@/lib/format'
import { InvestmentCard } from './InvestmentCard'

const INVENTORY: ResourceId[] = ['abonoOrganico', 'fertilizanteQuimico', 'controlBiologico', 'controlQuimico', 'colinos']
const INFRA: InvestmentId[] = ['riegoGoteo', 'reservorio', 'beneficioEcologico', 'certificacion']

export function ResourcesPage() {
  const game = useGame()
  const run = useGameAction()
  const [hire, setHire] = useState('5')
  const hireQty = Math.max(0, Math.floor(Number(hire) || 0))
  const hireCost = hireQty * game.params.laborCost
  const hireError = hireQty <= 0 ? 'Indica cuántos jornales contratar.' : checkAffordable(game, { money: hireCost, labor: 0, resources: {} })

  const infra = game.infrastructure
  const level = (game.inventory.agua / infra.reservoirCapacity) * 100
  const lastRecord = game.history.at(-1)
  const expectedInflow = (infra.streamConcession * game.environment.streamFlow) / 100 + (game.climate.precipitation * infra.catchmentM2) / 1000
  const criticalItems = INVENTORY.filter((r) => RESOURCES[r].criticalLevel > 0 && game.inventory[r] <= RESOURCES[r].criticalLevel)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Package}
        title="Recursos"
        description="Inventario, agua, mano de obra e infraestructura. Cada acción descuenta automáticamente lo que consume."
        actions={
          <Button asChild>
            <Link to="/juego/$gameId/mercado" params={{ gameId: game.id }}>
              <ShoppingCart /> Comprar insumos
            </Link>
          </Button>
        }
      />

      {(criticalItems.length > 0 || game.inventory.agua < RESOURCES.agua.criticalLevel || game.inventory.money < 0) && (
        <div className="flex flex-col gap-1 rounded-xl border border-clay-400/40 bg-clay-400/10 p-3 text-sm text-clay-600" role="alert">
          <span className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4" /> Recursos en nivel crítico
          </span>
          {game.inventory.money < 0 && <span>Saldo negativo: vende café o reduce gastos para evitar la quiebra.</span>}
          {game.inventory.agua < RESOURCES.agua.criticalLevel && <span>El reservorio tiene menos de {RESOURCES.agua.criticalLevel} m³.</span>}
          {criticalItems.map((r) => (
            <span key={r}>
              {RESOURCES[r].name}: quedan {formatNumber(game.inventory[r], 1)} {RESOURCES[r].unitPlural}.
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Coins} label="Dinero" value={formatCopShort(game.inventory.money)} tone={game.inventory.money < 0 ? 'poor' : undefined} hint={formatCop(game.inventory.money)} />
        <StatTile icon={Droplets} label="Agua" value={`${formatNumber(game.inventory.agua)} m³`} tone={level < 25 ? 'poor' : level < 45 ? 'fair' : 'good'} hint={`${Math.round(level)} % del reservorio`} />
        <StatTile icon={Users} label="Jornales" value={formatNumber(game.labor.available, 1)} hint={`${game.params.baseLabor} base al mes · ${game.labor.hired} contratados`} />
        <StatTile icon={Package} label="Café almacenado" value={formatKg(game.inventory.cafe)} hint="Pierde 1 % de peso por mes" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Inventario de insumos</CardTitle>
            <CardDescription>Precios vigentes del juego (valores de referencia ficticios).</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-semibold">Insumo</th>
                  <th className="pb-2 text-right font-semibold">Disponible</th>
                  <th className="hidden pb-2 text-right font-semibold sm:table-cell">Precio</th>
                  <th className="pb-2 text-right font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {INVENTORY.map((r) => {
                  const info = RESOURCES[r]
                  const qty = game.inventory[r]
                  const critical = info.criticalLevel > 0 && qty <= info.criticalLevel
                  return (
                    <tr key={r} className="border-t border-border/60">
                      <td className="py-2">
                        <div className="font-medium">{info.name}</div>
                        <div className="text-xs text-muted-foreground">{info.description}</div>
                      </td>
                      <td className="py-2 text-right font-semibold tabular">
                        {formatNumber(qty, 1)} <span className="text-xs font-normal text-muted-foreground">{info.unitPlural}</span>
                      </td>
                      <td className="hidden py-2 text-right tabular sm:table-cell">{formatCop(currentResourcePrice(game, r))}</td>
                      <td className="py-2 text-right">
                        {critical ? <Badge variant="danger">Crítico</Badge> : qty > 0 ? <Badge variant="success">OK</Badge> : <Badge variant="muted">Vacío</Badge>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Waves className="size-4 text-water-500" /> Reservorio y quebrada
              </CardTitle>
              <CardDescription>
                Concesión de {formatNumber(infra.streamConcession)} m³/mes según el caudal; captación de lluvia en {formatNumber(infra.catchmentM2)} m².
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="mb-1 flex justify-between">
                  <span>Nivel del reservorio</span>
                  <span className="font-semibold tabular">
                    {formatNumber(game.inventory.agua)} / {formatNumber(infra.reservoirCapacity)} m³
                  </span>
                </div>
                <Progress value={level} indicatorClassName="bg-water-400" />
              </div>
              <div>
                <div className="mb-1 flex justify-between">
                  <span>Caudal de la quebrada</span>
                  <span className="font-semibold tabular">{Math.round(game.environment.streamFlow)} / 100</span>
                </div>
                <Progress value={game.environment.streamFlow} indicatorClassName="bg-water-300" />
              </div>
              <dl className="grid grid-cols-2 gap-2 rounded-lg bg-muted/60 p-3 text-xs">
                <dt className="text-muted-foreground">Ingreso esperado este mes</dt>
                <dd className="text-right font-semibold tabular">≈ {formatNumber(expectedInflow)} m³</dd>
                <dt className="text-muted-foreground">Consumo doméstico</dt>
                <dd className="text-right font-semibold tabular">{WATER_RESOURCES.domesticUse} m³/mes</dd>
                <dt className="text-muted-foreground">Agua usada este mes</dt>
                <dd className="text-right font-semibold tabular">{formatNumber(game.tracker.waterUsed)} m³</dd>
                <dt className="text-muted-foreground">Agua usada el mes pasado</dt>
                <dd className="text-right font-semibold tabular">{lastRecord ? `${formatNumber(lastRecord.waterUsed)} m³` : '—'}</dd>
                <dt className="text-muted-foreground">Sistema de riego</dt>
                <dd className="text-right font-semibold">{infra.irrigation === 'goteo' ? 'Goteo (90 %)' : 'Gravedad (55 %)'}</dd>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-forest-600" /> Mano de obra
              </CardTitle>
              <CardDescription>
                Jornales adicionales para este mes a {formatCop(game.params.laborCost)} cada uno. Se pierden al avanzar el mes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!hireError) run({ type: 'contratarJornales', quantity: hireQty })
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="hire">Jornales</Label>
                  <Input id="hire" type="number" min={1} max={60} value={hire} onChange={(e) => setHire(e.target.value)} className="w-24" />
                </div>
                <Button type="submit" disabled={!!hireError}>
                  Contratar · {formatCopShort(hireCost)}
                </Button>
                {hireError && hireQty > 0 && <p className="w-full text-xs text-destructive">{hireError}</p>}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Infraestructura e inversiones</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {INFRA.map((id) => (
            <InvestmentCard key={id} game={game} id={id} />
          ))}
        </div>
      </section>
    </div>
  )
}
