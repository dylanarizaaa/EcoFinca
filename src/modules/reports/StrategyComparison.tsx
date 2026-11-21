import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { FlaskConical, Loader2, Play } from 'lucide-react'
import { compareStrategies, STRATEGIES, type ComparisonResult, type GameState, type MonthlyRecord } from '@/engine'
import { axisProps, ChartCard, DataTable, GRID_COLOR, makeTooltip, SERIES } from '@/components/charts/chart-kit'
import { EmptyState } from '@/components/common/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/overlays'
import { formatCop, formatCopShort, formatKg, formatNumber } from '@/lib/format'

type MetricKey = 'sustainability' | 'global' | 'productivity' | 'fertility' | 'erosion' | 'biodiversity' | 'waterQuality' | 'contamination' | 'cumulativeProfit'

const METRICS: Record<MetricKey, { label: string; get: (r: MonthlyRecord) => number; format: (v: number) => string }> = {
  sustainability: { label: 'Índice de sostenibilidad', get: (r) => r.scores.sustainability, format: (v) => formatNumber(v, 1) },
  global: { label: 'Puntuación global', get: (r) => r.scores.global, format: (v) => formatNumber(v, 1) },
  productivity: { label: 'Índice de productividad', get: (r) => r.scores.productivity, format: (v) => formatNumber(v, 1) },
  fertility: { label: 'Fertilidad del suelo', get: (r) => r.fertility, format: (v) => formatNumber(v, 1) },
  erosion: { label: 'Erosión', get: (r) => r.erosion, format: (v) => formatNumber(v, 1) },
  biodiversity: { label: 'Biodiversidad', get: (r) => r.biodiversity, format: (v) => formatNumber(v, 1) },
  waterQuality: { label: 'Calidad del agua', get: (r) => r.waterQuality, format: (v) => formatNumber(v, 1) },
  contamination: { label: 'Contaminación', get: (r) => r.contamination, format: (v) => formatNumber(v, 1) },
  cumulativeProfit: { label: 'Ganancia acumulada', get: (r) => r.cumulativeProfit, format: (v) => formatCopShort(v) },
}

export function StrategyComparison({ game }: { game: GameState }) {
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [running, setRunning] = useState(false)
  const [metric, setMetric] = useState<MetricKey>('sustainability')

  const run = () => {
    setRunning(true)
    // Se difiere para que la interfaz muestre el estado de carga antes del cálculo.
    setTimeout(() => {
      setResult(compareStrategies(game.config, game.params))
      setRunning(false)
    }, 30)
  }

  const m = METRICS[metric]
  const data = useMemo(() => {
    if (!result) return []
    const conv = result.runs.convencional.history
    const sus = result.runs.sostenible.history
    return conv.map((r, i) => {
      const own = game.history[i]
      const susRecord = sus[i]
      return {
        label: `M${i + 1}`,
        convencional: m.get(r),
        sostenible: susRecord ? m.get(susRecord) : null,
        partida: own ? m.get(own) : null,
      }
    })
  }, [result, game.history, m])

  const rows = result
    ? (['convencional', 'sostenible'] as const).map((id) => {
        const r = result.runs[id]
        const last = r.history.at(-1)
        return { id, name: STRATEGIES[id].name, run: r, last }
      })
    : []

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="size-5 text-forest-600" /> Experimento controlado
          </CardTitle>
          <CardDescription>
            Se simulan dos estrategias automáticas desde las <b>mismas condiciones iniciales</b> de tu partida y con la <b>misma semilla</b> (
            {game.config.seed}): ambas enfrentan exactamente el mismo clima. Tu propia partida se muestra como tercera serie.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {(['convencional', 'sostenible'] as const).map((id) => (
            <div key={id} className="rounded-xl bg-muted/60 p-4">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ background: id === 'convencional' ? SERIES.s2 : SERIES.s3 }} />
                <h3 className="font-display font-bold">{STRATEGIES[id].name}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{STRATEGIES[id].description}</p>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {STRATEGIES[id].practices.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
          <div className="md:col-span-2">
            <Button onClick={run} disabled={running} data-testid="run-comparison">
              {running ? <Loader2 className="animate-spin" /> : <Play />}
              {result ? 'Volver a ejecutar' : `Simular ${game.config.durationYears * 12} meses`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!result && !running && (
        <EmptyState icon={FlaskConical} title="Ejecuta la comparación" description="Verás cómo evolucionan la producción, la economía y el ecosistema con cada estrategia." />
      )}

      {result && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm" data-testid="comparison-table">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-semibold">Estrategia</th>
                  <th className="pb-2 text-right font-semibold">Producción</th>
                  <th className="pb-2 text-right font-semibold">Ganancia</th>
                  <th className="pb-2 text-right font-semibold">Agua usada</th>
                  <th className="pb-2 text-right font-semibold">Fertilizante químico</th>
                  <th className="pb-2 text-right font-semibold">Erosión</th>
                  <th className="pb-2 text-right font-semibold">Biodiversidad</th>
                  <th className="pb-2 text-right font-semibold">Sostenibilidad</th>
                  <th className="pb-2 text-right font-semibold">Global</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="py-2 font-semibold">
                      <span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: r.id === 'convencional' ? SERIES.s2 : SERIES.s3 }} />
                      {r.name}
                      {r.run.status === 'derrota' && <Badge variant="danger" className="ml-2">Quiebra</Badge>}
                    </td>
                    <td className="py-2 text-right">{formatKg(r.run.totalProduction)}</td>
                    <td className="py-2 text-right">{formatCop(r.run.profit)}</td>
                    <td className="py-2 text-right">{formatNumber(r.run.waterUsed)} m³</td>
                    <td className="py-2 text-right">{formatNumber(r.run.chemicalFertilizer, 1)} bultos</td>
                    <td className="py-2 text-right">{formatNumber(r.last?.erosion ?? 0)}</td>
                    <td className="py-2 text-right">{formatNumber(r.last?.biodiversity ?? 0)}</td>
                    <td className="py-2 text-right">{formatNumber(r.run.finalScores.sustainability, 1)}</td>
                    <td className="py-2 text-right font-bold">
                      {formatNumber(r.run.finalScores.global, 1)} <span className="text-xs font-normal">({r.run.finalScores.classification})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold">Indicador:</span>
            <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
              <SelectTrigger className="w-64" aria-label="Indicador a comparar">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(METRICS) as MetricKey[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {METRICS[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ChartCard
            title={m.label}
            description="Evolución mensual con el mismo clima para todas las series."
            height={280}
            legend={[
              { label: 'Tu partida', color: SERIES.s1 },
              { label: 'Convencional', color: SERIES.s2 },
              { label: 'Sostenible', color: SERIES.s3 },
            ]}
            table={
              <DataTable
                caption={m.label}
                rows={data}
                columns={[
                  { key: 'm', label: 'Mes', render: (r) => r.label },
                  { key: 'p', label: 'Tu partida', render: (r) => (r.partida === null ? '—' : m.format(r.partida)), align: 'right' },
                  { key: 'c', label: 'Convencional', render: (r) => m.format(r.convencional), align: 'right' },
                  { key: 's', label: 'Sostenible', render: (r) => (r.sostenible === null ? '—' : m.format(r.sostenible)), align: 'right' },
                ]}
              />
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                <YAxis {...axisProps} width={metric === 'cumulativeProfit' ? 64 : 40} tickFormatter={(v: number) => (metric === 'cumulativeProfit' ? formatCopShort(v) : String(Math.round(v)))} />
                <ChartTooltip content={makeTooltip(m.format)} />
                <Line dataKey="partida" name="Tu partida" stroke={SERIES.s1} strokeWidth={2} dot={false} connectNulls={false} type="monotone" />
                <Line dataKey="convencional" name="Convencional" stroke={SERIES.s2} strokeWidth={2} dot={false} type="monotone" />
                <Line dataKey="sostenible" name="Sostenible" stroke={SERIES.s3} strokeWidth={2} dot={false} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  )
}
