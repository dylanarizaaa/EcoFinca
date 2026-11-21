import { Bar, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { CloudSun, Droplets, Gauge, Thermometer, Umbrella, Wind } from 'lucide-react'
import {
  aggregateModifiers,
  climateOutlook,
  CONDITION_INFO,
  EVENT_BY_ID,
  EVENT_CATALOG,
  monthName,
  SCENARIOS,
} from '@/engine'
import { axisProps, ChartCard, DataTable, GRID_COLOR, makeTooltip, REFERENCE_COLOR, SERIES } from '@/components/charts/chart-kit'
import { StatTile } from '@/components/common/indicators'
import { EmptyState, PageHeader } from '@/components/common/layout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/misc'
import { useGame } from '@/hooks/use-game'
import { shortDate } from '@/lib/format'
import { WEATHER_ICONS } from '@/modules/game/TopBar'

export function ClimatePage() {
  const game = useGame()
  const c = game.climate
  const Icon = WEATHER_ICONS[c.condition]
  const scenario = SCENARIOS[game.config.scenarioId]
  const climateEvents = game.activeEvents.filter((e) => EVENT_BY_ID[e.eventId]?.category === 'clima')
  const mods = aggregateModifiers(climateEvents)
  const activeMonths = Math.max(0, ...climateEvents.map((e) => e.remaining))
  const outlook = climateOutlook(c.month, 4, scenario.climate, mods, activeMonths)
  const ratio = c.normalPrecipitation > 0 ? c.precipitation / c.normalPrecipitation : 1

  const data = game.history.map((h) => ({
    label: shortDate(h.month, h.year),
    precipitation: h.precipitation,
    normal: Math.round(outlookNormal(h.month)),
    temperature: h.temperature,
    condition: CONDITION_INFO[h.condition].name,
  }))
  function outlookNormal(month: number) {
    return climateOutlook(month, 1, scenario.climate, { precipitationMult: 1, temperatureAdd: 0 })[0]?.normalPrecipitation ?? 0
  }
  const counts = game.history.reduce<Record<string, number>>((acc, h) => {
    acc[h.condition] = (acc[h.condition] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={CloudSun}
        title="Clima"
        description="El clima de cada mes se genera a partir del perfil del escenario, la dificultad, la semilla y los eventos climáticos activos."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-4 bg-gradient-to-br from-water-100 to-sand-100 p-5">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-white/80 text-water-500 shadow-sm">
              <Icon className="size-9" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {monthName(c.month)} {game.calendar.year} · condición del mes
              </p>
              <p className="font-display text-2xl font-black text-forest-900">{CONDITION_INFO[c.condition].name}</p>
              <p className="text-sm text-muted-foreground">{CONDITION_INFO[c.condition].description}</p>
            </div>
          </div>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile icon={Thermometer} label="Temperatura" value={`${c.temperature.toFixed(1)} °C`} hint="Promedio mensual" className="shadow-none" />
            <StatTile
              icon={Umbrella}
              label="Precipitación"
              value={`${c.precipitation} mm`}
              hint={`${Math.round(ratio * 100)} % de lo normal (${c.normalPrecipitation} mm)`}
              tone={ratio < 0.6 ? 'poor' : ratio > 1.5 ? 'fair' : 'good'}
              className="shadow-none"
            />
            <StatTile icon={Droplets} label="Humedad ambiental" value={`${c.humidity} %`} className="shadow-none" />
            <div className="surface col-span-full flex flex-col gap-3 p-4 shadow-none sm:col-span-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Gauge className="size-4 text-clay-500" /> Riesgo de sequía
                </span>
                <span className="font-bold tabular">{c.droughtRisk}</span>
              </div>
              <Progress value={c.droughtRisk} indicatorClassName={c.droughtRisk > 60 ? 'bg-clay-500' : c.droughtRisk > 35 ? 'bg-sun-400' : 'bg-forest-500'} />
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Wind className="size-4 text-water-500" /> Intensidad de lluvia
                </span>
                <span className="font-bold tabular">{c.rainIntensity}</span>
              </div>
              <Progress value={c.rainIntensity} indicatorClassName={c.rainIntensity > 70 ? 'bg-clay-500' : 'bg-water-400'} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Perspectiva estacional</CardTitle>
              <CardDescription>Valores esperados según el régimen bimodal del escenario y los eventos activos (no es un pronóstico exacto).</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {outlook.map((o, i) => (
                <div key={i} className="rounded-xl bg-muted/60 p-3 text-center">
                  <div className="text-xs font-semibold text-muted-foreground">{i === 0 ? 'Este mes' : monthName(o.month)}</div>
                  <div className="font-display text-lg font-bold">{o.expectedPrecipitation} mm</div>
                  <div className="text-xs text-muted-foreground">{o.expectedTemperature} °C</div>
                  {o.expectedPrecipitation !== o.normalPrecipitation && <div className="text-[11px] text-clay-600">normal {o.normalPrecipitation} mm</div>}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Eventos climáticos activos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {climateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay eventos climáticos activos.</p>
              ) : (
                climateEvents.map((e) => {
                  const def = EVENT_BY_ID[e.eventId]
                  return (
                    def && (
                      <div key={e.instanceId} className="rounded-xl border border-sun-300 bg-sun-300/15 p-3 text-sm">
                        <div className="flex items-center justify-between font-semibold">
                          {def.name} <Badge variant="warning">{e.remaining} mes(es)</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{def.impactText}</p>
                      </div>
                    )
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState icon={CloudSun} title="Aún no hay registros" description="Avanza el primer mes para comenzar a registrar el clima de la finca." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Precipitación mensual"
            description="Lluvia registrada frente a la normal del escenario (mm)."
            legend={[
              { label: 'Registrada', color: SERIES.s1, kind: 'bar' },
              { label: 'Normal', color: REFERENCE_COLOR, kind: 'reference' },
            ]}
            table={
              <DataTable
                caption="Precipitación mensual"
                rows={data}
                columns={[
                  { key: 'm', label: 'Mes', render: (r) => r.label },
                  { key: 'p', label: 'Registrada (mm)', render: (r) => r.precipitation, align: 'right' },
                  { key: 'n', label: 'Normal (mm)', render: (r) => r.normal, align: 'right' },
                  { key: 'c', label: 'Condición', render: (r) => r.condition },
                ]}
              />
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                <XAxis dataKey="label" {...axisProps} minTickGap={12} />
                <YAxis {...axisProps} width={44} />
                <ChartTooltip content={makeTooltip((v) => `${Math.round(v)} mm`)} cursor={{ fill: '#eef0e8' }} />
                <Bar dataKey="precipitation" name="Registrada" fill={SERIES.s1} radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Line dataKey="normal" name="Normal" stroke={REFERENCE_COLOR} strokeWidth={2} dot={false} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard
            title="Temperatura media"
            description="Temperatura media mensual (°C)."
            table={
              <DataTable
                caption="Temperatura mensual"
                rows={data}
                columns={[
                  { key: 'm', label: 'Mes', render: (r) => r.label },
                  { key: 't', label: 'Temperatura (°C)', render: (r) => r.temperature.toFixed(1), align: 'right' },
                ]}
              />
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                <XAxis dataKey="label" {...axisProps} minTickGap={12} />
                <YAxis {...axisProps} width={44} domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(v: number) => v.toFixed(0)} />
                <ChartTooltip content={makeTooltip((v) => `${v.toFixed(1)} °C`)} />
                <Line dataKey="temperature" name="Temperatura" stroke={SERIES.s2} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Condiciones registradas</CardTitle>
            <CardDescription>Frecuencia de cada condición climática durante la partida.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(CONDITION_INFO) as (keyof typeof CONDITION_INFO)[]).map((k) => {
              const CIcon = WEATHER_ICONS[k]
              return (
                <div key={k} className="flex items-center gap-2 rounded-lg bg-muted/60 p-2 text-sm">
                  <CIcon className="size-4 text-water-500" />
                  <span className="flex-1">{CONDITION_INFO[k].name}</span>
                  <span className="font-bold tabular">{counts[k] ?? 0}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Eventos climáticos posibles</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {EVENT_CATALOG.filter((e) => e.category === 'clima').map((e) => (
              <div key={e.id} className="text-sm">
                <span className="font-semibold">{e.name}</span>
                <p className="text-xs text-muted-foreground">
                  <b>Cuándo:</b> {e.conditionText} <b>Probabilidad:</b> {e.probabilityText} <b>Impacto:</b> {e.impactText}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
