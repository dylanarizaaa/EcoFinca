import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, BadgeCheck, Coins, Package, ShoppingCart, Store, TrendingUp } from 'lucide-react'
import {
  aggregateModifiers,
  checkAffordable,
  currentCoffeePrice,
  currentResourcePrice,
  PURCHASABLE,
  RESOURCES,
  totalsFromTransactions,
  validateAction,
  type ResourceId,
  type TransactionCategory,
} from '@/engine'
import { axisProps, ChartCard, DataTable, GRID_COLOR, makeTooltip, SERIES } from '@/components/charts/chart-kit'
import { StatTile } from '@/components/common/indicators'
import { EmptyState, PageHeader } from '@/components/common/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/misc'
import { Slider, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays'
import { useGame, useGameAction } from '@/hooks/use-game'
import { formatCop, formatCopShort, formatKg, formatNumber, shortDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const CATEGORY_LABEL: Record<TransactionCategory, string> = {
  venta: 'Ventas',
  insumos: 'Insumos',
  labores: 'Labores',
  jornales: 'Jornales',
  cosecha: 'Recolección y beneficio',
  'costos-fijos': 'Costos fijos',
  inversion: 'Inversiones',
  conservacion: 'Conservación',
  evento: 'Eventos',
  multa: 'Multas',
}

function SellCoffee() {
  const game = useGame()
  const run = useGameAction()
  const stock = Math.floor(game.inventory.cafe * 10) / 10
  const [qty, setQty] = useState(stock)
  const price = currentCoffeePrice(game)
  const amount = Math.min(qty, stock)
  const error = amount > 0 ? validateAction(game, { type: 'vender', quantityKg: amount }) : 'No hay café para vender.'
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="size-4 text-earth-500" /> Vender café
        </CardTitle>
        <CardDescription>Café pergamino seco almacenado: {formatKg(game.inventory.cafe)}.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {stock <= 0 ? (
          <EmptyState icon={Package} title="El almacén está vacío" description="Cosecha los lotes en etapa de cosecha para tener café que vender." />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Slider value={[amount]} min={0} max={stock} step={0.1} onValueChange={(v) => setQty(v[0] ?? 0)} aria-label="Kilogramos a vender" />
              <Input
                type="number"
                className="w-28"
                min={0}
                max={stock}
                value={amount}
                onChange={(e) => setQty(Math.max(0, Math.min(stock, Number(e.target.value) || 0)))}
                aria-label="Kilogramos"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sand-100 p-3">
              <div>
                <div className="text-xs text-muted-foreground">
                  {formatNumber(amount, 1)} kg × {formatCop(price)}
                </div>
                <div className="font-display text-xl font-bold">{formatCop(amount * price)}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setQty(stock)}>
                  Todo
                </Button>
                <Button
                  variant="earth"
                  disabled={!!error}
                  onClick={() => {
                    const r = run({ type: 'vender', quantityKg: Math.round(amount * 10) / 10 })
                    if (r.ok) setQty(0)
                  }}
                >
                  Vender
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function BuyRow({ item }: { item: ResourceId }) {
  const game = useGame()
  const run = useGameAction()
  const info = RESOURCES[item]
  const defaultQty = item === 'colinos' ? 1000 : item === 'agua' ? 50 : item === 'abonoOrganico' ? 10 : 2
  const [qty, setQty] = useState(String(defaultQty))
  const n = Math.floor(Number(qty) || 0)
  const price = currentResourcePrice(game, item)
  const action = { type: 'comprar', item, quantity: n } as const
  const error = n <= 0 ? 'Indica una cantidad' : validateAction(game, action)
  return (
    <div className="flex flex-col gap-2 border-t border-border/60 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{info.name}</span>
          <span className="text-xs text-muted-foreground">
            · tienes {formatNumber(game.inventory[item], 1)} {info.unitPlural}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {formatCop(price)} por {info.unit}
        </div>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!error) run(action)
        }}
      >
        <Label htmlFor={`buy-${item}`} className="sr-only">
          Cantidad de {info.name}
        </Label>
        <Input id={`buy-${item}`} type="number" min={1} className="w-24" value={qty} onChange={(e) => setQty(e.target.value)} />
        <Button type="submit" size="sm" disabled={!!error} title={error ?? undefined} className="min-w-28">
          <ShoppingCart /> {n > 0 ? formatCopShort(n * price) : 'Comprar'}
        </Button>
      </form>
      {error && n > 0 && <p className="text-xs text-destructive sm:hidden">{error}</p>}
    </div>
  )
}

export function MarketPage() {
  const game = useGame()
  const [filter, setFilter] = useState<'todos' | 'ingreso' | 'gasto'>('todos')
  const price = currentCoffeePrice(game)
  const mods = aggregateModifiers(game.activeEvents)
  const totals = totalsFromTransactions(game.transactions)
  const ref = game.params.coffeeBasePrice

  const priceData = [game.baseline, ...game.history].map((h, i) => ({
    label: i === 0 ? 'Inicio' : shortDate(h.month, h.year),
    price: h.coffeePrice,
  }))
  const cashflow = game.history.map((h) => ({ label: shortDate(h.month, h.year), income: h.income, expenses: h.expenses }))

  const byCategory = useMemo(() => {
    const map = new Map<string, { kind: 'ingreso' | 'gasto'; amount: number }>()
    for (const t of game.transactions) {
      const key = `${t.kind}:${t.category}`
      const prev = map.get(key)
      map.set(key, { kind: t.kind, amount: (prev?.amount ?? 0) + t.amount })
    }
    return [...map.entries()]
      .map(([key, v]) => ({ category: key.split(':')[1] as TransactionCategory, ...v }))
      .sort((a, b) => b.amount - a.amount)
  }, [game.transactions])

  const ledger = game.transactions
    .filter((t) => filter === 'todos' || t.kind === filter)
    .slice()
    .reverse()
    .slice(0, 150)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Store}
        title="Mercado"
        description="Vende tu cosecha, compra insumos y consulta el balance financiero. Precios de referencia ficticios del juego, no cotizaciones reales."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={TrendingUp}
          label="Precio del café"
          value={`${formatCop(price)}/kg`}
          hint={`${price >= ref ? '+' : ''}${Math.round((price / ref - 1) * 100)} % vs. referencia`}
        >
          <div className="mt-1 flex flex-wrap gap-1">
            {game.infrastructure.certified && (
              <Badge variant="success">
                <BadgeCheck /> Prima sostenible
              </Badge>
            )}
            {mods.coffeePriceMult > 1 && <Badge variant="info">Contrato especial</Badge>}
          </div>
        </StatTile>
        <StatTile icon={ArrowUpRight} label="Ingresos totales" value={formatCopShort(totals.income)} tone="good" />
        <StatTile icon={ArrowDownRight} label="Gastos totales" value={formatCopShort(totals.expenses)} />
        <StatTile icon={Coins} label="Ganancia acumulada" value={formatCopShort(totals.profit)} tone={totals.profit >= 0 ? 'good' : 'poor'} hint="Ganancia = Ingresos − Costos" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SellCoffee />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="size-4 text-forest-600" /> Comprar insumos
            </CardTitle>
            <CardDescription>
              {mods.inputPriceMult > 1 ? `Precios elevados ${Math.round((mods.inputPriceMult - 1) * 100)} % por un evento de mercado.` : 'Precios con inflación mensual moderada.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {PURCHASABLE.map((r) => (
              <BuyRow key={r} item={r} />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Precio del café"
          description="Evolución del precio de venta (COP/kg cps)."
          table={
            <DataTable
              caption="Precio del café"
              rows={priceData}
              columns={[
                { key: 'm', label: 'Mes', render: (r) => r.label },
                { key: 'p', label: 'Precio', render: (r) => formatCop(r.price), align: 'right' },
              ]}
            />
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} />
              <XAxis dataKey="label" {...axisProps} minTickGap={12} />
              <YAxis {...axisProps} width={56} domain={['auto', 'auto']} tickFormatter={(v: number) => `${formatNumber(v / 1000, 1)} mil`} />
              <ChartTooltip content={makeTooltip((v) => formatCop(v))} />
              <Line dataKey="price" name="Precio" stroke={SERIES.s1} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="Flujo de caja mensual"
          description="Ingresos y gastos registrados cada mes."
          legend={[
            { label: 'Ingresos', color: SERIES.s1, kind: 'bar' },
            { label: 'Gastos', color: SERIES.s2, kind: 'bar' },
          ]}
          table={
            <DataTable
              caption="Flujo de caja mensual"
              rows={cashflow}
              columns={[
                { key: 'm', label: 'Mes', render: (r) => r.label },
                { key: 'i', label: 'Ingresos', render: (r) => formatCop(r.income), align: 'right' },
                { key: 'g', label: 'Gastos', render: (r) => formatCop(r.expenses), align: 'right' },
              ]}
            />
          }
        >
          {cashflow.length === 0 ? (
            <EmptyState icon={Coins} title="Sin meses registrados" description="Avanza el mes para ver el flujo de caja." className="h-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflow} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                <XAxis dataKey="label" {...axisProps} minTickGap={12} />
                <YAxis {...axisProps} width={56} tickFormatter={(v: number) => formatCopShort(v)} />
                <ChartTooltip content={makeTooltip((v) => formatCop(v))} cursor={{ fill: '#eef0e8' }} />
                <Bar dataKey="income" name="Ingresos" fill={SERIES.s1} radius={[4, 4, 0, 0]} maxBarSize={16} />
                <Bar dataKey="expenses" name="Gastos" fill={SERIES.s2} radius={[4, 4, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>Balance por categoría</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            {byCategory.length === 0 && <p className="text-muted-foreground">Sin movimientos todavía.</p>}
            {byCategory.map((c) => (
              <div key={`${c.kind}-${c.category}`} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  {c.kind === 'ingreso' ? <ArrowUpRight className="size-4 text-forest-600" /> : <ArrowDownRight className="size-4 text-clay-500" />}
                  {CATEGORY_LABEL[c.category]}
                </span>
                <span className={cn('font-semibold tabular', c.kind === 'gasto' && 'text-clay-600')}>
                  {c.kind === 'gasto' ? '−' : '+'}
                  {formatCop(c.amount)}
                </span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold">
              <span>Balance</span>
              <span className={cn('tabular', totals.profit < 0 && 'text-clay-600')}>{formatCop(totals.profit)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Historial de movimientos</CardTitle>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList className="h-8">
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="ingreso">Ingresos</TabsTrigger>
                <TabsTrigger value="gasto">Gastos</TabsTrigger>
              </TabsList>
              <TabsContent value={filter} className="hidden" />
            </Tabs>
          </CardHeader>
          <CardContent>
            {ledger.length === 0 ? (
              <EmptyState icon={Coins} title="Sin movimientos" description="Las compras, labores, ventas y costos aparecerán aquí." />
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Mes</th>
                      <th className="px-3 py-2 font-semibold">Descripción</th>
                      <th className="px-3 py-2 text-right font-semibold">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((t) => {
                      const cal = { month: t.turn % 12, year: game.config.startYear + Math.floor(t.turn / 12) }
                      return (
                        <tr key={t.id} className="border-t border-border/60">
                          <td className="px-3 py-1.5 whitespace-nowrap text-xs text-muted-foreground">{shortDate(cal.month, cal.year)}</td>
                          <td className="px-3 py-1.5">
                            {t.description}
                            <span className="ml-1 text-xs text-muted-foreground">· {CATEGORY_LABEL[t.category]}</span>
                          </td>
                          <td className={cn('px-3 py-1.5 text-right font-semibold whitespace-nowrap tabular', t.kind === 'gasto' ? 'text-clay-600' : 'text-forest-700')}>
                            {t.kind === 'gasto' ? '−' : '+'}
                            {formatCop(t.amount)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">
        {checkAffordable(game, { money: 1, labor: 0, resources: {} }) ? 'Saldo insuficiente para nuevas compras.' : ''}
      </p>
    </div>
  )
}
