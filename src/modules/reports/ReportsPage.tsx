import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, CheckCircle2, Circle, FlaskConical, Lightbulb, Target } from 'lucide-react'
import {
  computeScores,
  cycleForTurn,
  evaluateObjectives,
  farmIndicators,
  generateRecommendations,
  type Indicators,
} from '@/engine'
import { axisProps, ChartCard, DataTable, GRID_COLOR, makeTooltip, REFERENCE_COLOR, SERIES } from '@/components/charts/chart-kit'
import { ScoreRing } from '@/components/common/indicators'
import { EmptyState, PageHeader } from '@/components/common/layout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/misc'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays'
import { useGame } from '@/hooks/use-game'
import { formatCop, formatCopShort, formatKg, formatNumber, shortDate } from '@/lib/format'
import { INDICATORS, type IndicatorKey } from '@/lib/indicators'
import { cn } from '@/lib/utils'
import { StrategyComparison } from './StrategyComparison'

const SMALL_MULTIPLES: IndicatorKey[] = ['fertility', 'erosion', 'moisture', 'health', 'waterQuality', 'biodiversity', 'contamination']

function IndicatorChart({ k, data, baseline }: { k: IndicatorKey; data: { label: string; [key: string]: number | string }[]; baseline: number }) {
  const meta = INDICATORS[k]
  return (
    <ChartCard
      title={meta.label}
      description={`Línea gris: valor inicial (${Math.round(baseline)}).`}
      height={160}
      table={
        <DataTable
          caption={meta.label}
          rows={data}
          columns={[
            { key: 'm', label: 'Mes', render: (r) => String(r.label) },
            { key: 'v', label: meta.label, render: (r) => formatNumber(Number(r[k]), 1), align: 'right' },
          ]}
        />
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis dataKey="label" {...axisProps} minTickGap={18} />
          <YAxis {...axisProps} domain={[0, 100]} ticks={[0, 50, 100]} width={40} />
          <ReferenceLine y={baseline} stroke={REFERENCE_COLOR} strokeWidth={1} />
          <ChartTooltip content={makeTooltip((v) => formatNumber(v, 1))} />
          <Area dataKey={k} name={meta.label} stroke={SERIES.s1} strokeWidth={2} fill={SERIES.s1} fillOpacity={0.1} type="monotone" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function ReportsPage() {
  const game = useGame()
  const scores = computeScores(game)
  const objectives = evaluateObjectives(game)
  const recommendations = generateRecommendations(game)
  const current = farmIndicators(game)
  const history = game.history

  const data = history.map((h) => ({
    label: shortDate(h.month, h.year),
    fertility: h.fertility,
    erosion: h.erosion,
    moisture: h.moisture,
    health: h.health,
    waterQuality: h.waterQuality,
    biodiversity: h.biodiversity,
    contamination: h.contamination,
    waterUsed: h.waterUsed,
    waterStock: h.waterStock,
    production: h.production,
    income: h.income,
    expenses: h.expenses,
    cumulativeProfit: h.cumulativeProfit,
  }))

  // Producción, ingresos y gastos por ciclo (incluye el ciclo en curso).
  const cycleRows = Array.from({ length: cycleForTurn(Math.max(0, game.turn - 1)) }, (_, i) => {
    const cycle = i + 1
    const records = history.filter((h) => h.cycle === cycle)
    const closed = game.cycles.find((c) => c.cycle === cycle)
    return {
      label: `Ciclo ${cycle}${closed ? '' : ' (en curso)'}`,
      production: records.reduce((a, r) => a + r.production, 0),
      income: records.reduce((a, r) => a + r.income, 0),
      expenses: records.reduce((a, r) => a + r.expenses, 0),
      waterUsed: records.reduce((a, r) => a + r.waterUsed, 0),
      classification: closed?.scores.classification ?? '—',
      global: closed?.scores.global ?? null,
    }
  }).filter((r) => history.length > 0 && r.label)

  const comparisonRows: { label: string; values: Indicators; money?: number }[] = [
    { label: 'Estado inicial', values: game.baseline, money: game.baseline.money },
    ...game.cycles.map((c) => ({ label: `Fin ciclo ${c.cycle}`, values: c.indicators })),
    { label: 'Estado actual', values: current, money: game.inventory.money },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader icon={BarChart3} title="Informes" description="Resultados de la partida calculados a partir del historial real de la finca." />

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="ambiente">Indicadores</TabsTrigger>
          <TabsTrigger value="economia">Producción y economía</TabsTrigger>
          <TabsTrigger value="ciclos">Ciclos y comparación</TabsTrigger>
          <TabsTrigger value="estrategias">
            <FlaskConical /> Estrategias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
            <Card className="items-center justify-center gap-4 p-6">
              <ScoreRing value={scores.global} label="Puntuación global" size={132} stroke={12} />
              <Badge variant={scores.classification === 'Deficiente' ? 'danger' : scores.classification === 'Aceptable' ? 'warning' : 'success'} className="text-sm">
                {scores.classification}
              </Badge>
              <div className="flex gap-4">
                <ScoreRing value={scores.productivity} label="Productividad · 30 %" size={70} stroke={7} />
                <ScoreRing value={scores.profitability} label="Rentabilidad · 30 %" size={70} stroke={7} />
                <ScoreRing value={scores.sustainability} label="Sostenibilidad · 40 %" size={70} stroke={7} />
              </div>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="size-4 text-forest-600" /> Objetivos del escenario
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {objectives.map((o) => (
                    <div key={o.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-1.5 font-semibold">
                          {o.achieved ? <CheckCircle2 className="size-4 text-forest-600" /> : <Circle className="size-4 text-muted-foreground" />}
                          {o.label}
                        </span>
                        <span className="text-xs tabular text-muted-foreground">
                          {o.current} / {o.target}
                        </span>
                      </div>
                      <Progress value={o.progress * 100} className="h-1.5" indicatorClassName={o.achieved ? 'bg-forest-500' : 'bg-sun-400'} />
                      <p className="text-xs text-muted-foreground">{o.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="size-4 text-sun-500" /> Recomendaciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2.5">
                  {recommendations.length === 0 && <p className="text-sm text-muted-foreground">¡Tu finca está en buen estado! Mantén las buenas prácticas.</p>}
                  {recommendations.map((r) => (
                    <div key={r.id} className="text-sm">
                      <div className="flex items-center gap-2 font-semibold">
                        <span className={cn('size-2 rounded-full', r.priority === 'alta' ? 'bg-clay-500' : r.priority === 'media' ? 'bg-sun-400' : 'bg-forest-400')} />
                        {r.title}
                      </div>
                      <p className="text-xs text-muted-foreground">{r.detail}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ambiente">
          {data.length === 0 ? (
            <EmptyState icon={BarChart3} title="Aún no hay historial" description="Avanza al menos un mes para ver la evolución de los indicadores." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {SMALL_MULTIPLES.map((k) => (
                <IndicatorChart key={k} k={k} data={data} baseline={game.baseline[k]} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="economia">
          {data.length === 0 ? (
            <EmptyState icon={BarChart3} title="Aún no hay historial" description="Avanza al menos un mes para ver producción y economía." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard
                title="Producción por ciclo"
                description="Café pergamino seco cosechado en cada ciclo productivo (kg)."
                table={
                  <DataTable
                    caption="Producción por ciclo"
                    rows={cycleRows}
                    columns={[
                      { key: 'c', label: 'Ciclo', render: (r) => r.label },
                      { key: 'p', label: 'Producción', render: (r) => formatKg(r.production), align: 'right' },
                    ]}
                  />
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cycleRows} margin={{ top: 16, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} width={52} tickFormatter={(v: number) => formatNumber(v)} />
                    <ChartTooltip content={makeTooltip((v) => formatKg(v))} cursor={{ fill: '#eef0e8' }} />
                    <Bar dataKey="production" name="Producción" fill={SERIES.s1} radius={[4, 4, 0, 0]} maxBarSize={24} label={{ position: 'top', fontSize: 11, fill: '#5c685f', formatter: (v: unknown) => formatNumber(Number(v)) }} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard
                title="Ingresos y gastos por ciclo"
                legend={[
                  { label: 'Ingresos', color: SERIES.s1, kind: 'bar' },
                  { label: 'Gastos', color: SERIES.s2, kind: 'bar' },
                ]}
                table={
                  <DataTable
                    caption="Ingresos y gastos por ciclo"
                    rows={cycleRows}
                    columns={[
                      { key: 'c', label: 'Ciclo', render: (r) => r.label },
                      { key: 'i', label: 'Ingresos', render: (r) => formatCop(r.income), align: 'right' },
                      { key: 'g', label: 'Gastos', render: (r) => formatCop(r.expenses), align: 'right' },
                      { key: 'b', label: 'Ganancia', render: (r) => formatCop(r.income - r.expenses), align: 'right' },
                    ]}
                  />
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cycleRows} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={2}>
                    <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} width={60} tickFormatter={(v: number) => formatCopShort(v)} />
                    <ChartTooltip content={makeTooltip((v) => formatCop(v))} cursor={{ fill: '#eef0e8' }} />
                    <Bar dataKey="income" name="Ingresos" fill={SERIES.s1} radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="expenses" name="Gastos" fill={SERIES.s2} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard
                title="Rentabilidad acumulada"
                description="Ganancia acumulada (ingresos − costos) desde el inicio. La línea gris marca el punto de equilibrio."
                table={
                  <DataTable
                    caption="Ganancia acumulada"
                    rows={data}
                    columns={[
                      { key: 'm', label: 'Mes', render: (r) => r.label },
                      { key: 'p', label: 'Ganancia acumulada', render: (r) => formatCop(r.cumulativeProfit), align: 'right' },
                    ]}
                  />
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                    <XAxis dataKey="label" {...axisProps} minTickGap={14} />
                    <YAxis {...axisProps} width={60} tickFormatter={(v: number) => formatCopShort(v)} />
                    <ReferenceLine y={0} stroke={REFERENCE_COLOR} />
                    <ChartTooltip content={makeTooltip((v) => formatCop(v))} />
                    <Line dataKey="cumulativeProfit" name="Ganancia acumulada" stroke={SERIES.s1} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} type="monotone" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard
                title="Consumo de agua"
                description="Agua usada cada mes en riego, beneficio y consumo doméstico (m³)."
                table={
                  <DataTable
                    caption="Consumo de agua"
                    rows={data}
                    columns={[
                      { key: 'm', label: 'Mes', render: (r) => r.label },
                      { key: 'u', label: 'Usada (m³)', render: (r) => formatNumber(r.waterUsed), align: 'right' },
                      { key: 's', label: 'En reservorio (m³)', render: (r) => formatNumber(r.waterStock), align: 'right' },
                    ]}
                  />
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                    <XAxis dataKey="label" {...axisProps} minTickGap={14} />
                    <YAxis {...axisProps} width={48} />
                    <ChartTooltip content={makeTooltip((v) => `${formatNumber(v)} m³`)} cursor={{ fill: '#eef0e8' }} />
                    <Bar dataKey="waterUsed" name="Agua usada" fill={SERIES.s1} radius={[4, 4, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ciclos" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparación de estados</CardTitle>
              <CardDescription>Estado inicial, cierre de cada ciclo productivo y estado actual.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm" data-testid="state-comparison">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-semibold">Momento</th>
                    {(['fertility', 'erosion', 'moisture', 'health', 'waterQuality', 'biodiversity', 'contamination'] as IndicatorKey[]).map((k) => (
                      <th key={k} className="pb-2 text-right font-semibold">
                        {INDICATORS[k].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tabular">
                  {comparisonRows.map((row) => (
                    <tr key={row.label} className="border-t border-border/60">
                      <td className="py-2 font-semibold">{row.label}</td>
                      {(['fertility', 'erosion', 'moisture', 'health', 'waterQuality', 'biodiversity', 'contamination'] as IndicatorKey[]).map((k) => (
                        <td key={k} className="py-2 text-right">
                          {Math.round(row.values[k])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Historial de ciclos</CardTitle>
              <CardDescription>Evaluación de cada ciclo productivo de 12 meses.</CardDescription>
            </CardHeader>
            <CardContent>
              {game.cycles.length === 0 ? (
                <EmptyState icon={BarChart3} title="Ningún ciclo completado" description="El primer ciclo productivo se evalúa al cumplir 12 meses." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="pb-2 font-semibold">Ciclo</th>
                        <th className="pb-2 text-right font-semibold">Producción</th>
                        <th className="pb-2 text-right font-semibold">Ingresos</th>
                        <th className="pb-2 text-right font-semibold">Gastos</th>
                        <th className="pb-2 text-right font-semibold">Ganancia</th>
                        <th className="pb-2 text-right font-semibold">Agua</th>
                        <th className="pb-2 text-right font-semibold">P / R / S</th>
                        <th className="pb-2 text-right font-semibold">Clasificación</th>
                      </tr>
                    </thead>
                    <tbody className="tabular">
                      {game.cycles.map((c) => (
                        <tr key={c.cycle} className="border-t border-border/60">
                          <td className="py-2 font-semibold">{c.cycle}</td>
                          <td className="py-2 text-right">{formatKg(c.production)}</td>
                          <td className="py-2 text-right">{formatCopShort(c.income)}</td>
                          <td className="py-2 text-right">{formatCopShort(c.expenses)}</td>
                          <td className={cn('py-2 text-right', c.profit < 0 && 'text-clay-600')}>{formatCopShort(c.profit)}</td>
                          <td className="py-2 text-right">{formatNumber(c.waterUsed)} m³</td>
                          <td className="py-2 text-right">
                            {Math.round(c.scores.productivity)} / {Math.round(c.scores.profitability)} / {Math.round(c.scores.sustainability)}
                          </td>
                          <td className="py-2 text-right">
                            <Badge variant={c.scores.classification === 'Deficiente' ? 'danger' : 'success'}>{c.scores.classification}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estrategias">
          <StrategyComparison game={game} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
