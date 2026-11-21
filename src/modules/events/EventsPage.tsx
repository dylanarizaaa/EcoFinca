import { CalendarClock, History, ListChecks } from 'lucide-react'
import { EVENT_BY_ID, EVENT_CATALOG, isPending, type EventCategory } from '@/engine'
import { EmptyState, PageHeader } from '@/components/common/layout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays'
import { useGame } from '@/hooks/use-game'
import { shortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EventDecisionCard, SEVERITY_META } from './EventDecision'

const CATEGORY_LABEL: Record<EventCategory, string> = {
  clima: 'Clima',
  plagas: 'Plagas',
  mercado: 'Mercado',
  ambiente: 'Ambiente',
  recursos: 'Recursos',
  social: 'Social',
}

export function EventsPage() {
  const game = useGame()
  const pending = game.activeEvents.filter(isPending)
  const ongoing = game.activeEvents.filter((e) => !isPending(e))
  const log = [...game.eventLog].reverse()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={CalendarClock}
        title="Eventos"
        description="Situaciones que surgen según el clima, el estado de la finca y el azar controlado por la semilla. Algunas requieren tu decisión."
      />

      <Tabs defaultValue="activos">
        <TabsList>
          <TabsTrigger value="activos">
            <CalendarClock /> Activos {pending.length > 0 && <Badge variant="danger">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="historial">
            <History /> Historial
          </TabsTrigger>
          <TabsTrigger value="catalogo">
            <ListChecks /> Catálogo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="flex flex-col gap-4">
          {pending.length === 0 && ongoing.length === 0 && (
            <EmptyState icon={CalendarClock} title="No hay eventos activos" description="Los eventos pueden aparecer al avanzar cada mes." />
          )}
          {pending.map((e) => {
            const def = EVENT_BY_ID[e.eventId]
            return (
              def && (
                <Card key={e.instanceId} className="border-sun-400">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {def.name} <Badge variant="warning">Decisión pendiente</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EventDecisionCard game={game} event={e} />
                  </CardContent>
                </Card>
              )
            )
          })}
          {ongoing.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {ongoing.map((e) => {
                const def = EVENT_BY_ID[e.eventId]
                if (!def) return null
                const response = def.responses.find((r) => r.id === e.responseId)
                const meta = SEVERITY_META[def.severity]
                return (
                  <Card key={e.instanceId}>
                    <CardHeader>
                      <CardTitle className="flex flex-wrap items-center gap-2">
                        {def.name}
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </CardTitle>
                      <CardDescription>{def.impactText}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p>
                        Quedan <b>{e.remaining}</b> mes(es). Respuesta: <b>{response?.label ?? '—'}</b>
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historial">
          {log.length === 0 ? (
            <EmptyState icon={History} title="Sin eventos registrados" description="Aquí verás todos los eventos y tus respuestas." />
          ) : (
            <ol className="relative flex flex-col gap-3 border-l-2 border-border pl-5">
              {log.map((entry) => {
                const meta = SEVERITY_META[entry.severity]
                const cal = { month: entry.turn % 12, year: game.config.startYear + Math.floor(entry.turn / 12) }
                return (
                  <li key={entry.id} className="relative">
                    <span
                      className={cn(
                        'absolute top-1.5 -left-[27px] size-3 rounded-full ring-4 ring-background',
                        entry.severity === 'peligro' ? 'bg-clay-500' : entry.severity === 'advertencia' ? 'bg-sun-400' : entry.severity === 'positivo' ? 'bg-forest-500' : 'bg-water-400',
                      )}
                    />
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">{entry.title}</span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      <span className="text-xs text-muted-foreground">{shortDate(cal.month, cal.year)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.message}</p>
                  </li>
                )
              })}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="catalogo" className="grid gap-3 md:grid-cols-2">
          {EVENT_CATALOG.map((def) => {
            const meta = SEVERITY_META[def.severity]
            return (
              <Card key={def.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {def.name}
                    <Badge variant="outline">{CATEGORY_LABEL[def.category]}</Badge>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </CardTitle>
                  <CardDescription>{def.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>
                    <b>Condiciones:</b> {def.conditionText}
                  </p>
                  <p>
                    <b>Probabilidad:</b> {def.probabilityText}
                  </p>
                  <p>
                    <b>Impacto:</b> {def.impactText}
                  </p>
                  <p>
                    <b>Duración:</b> {def.durationMonths} mes(es)
                  </p>
                  <p>
                    <b>Respuestas:</b> {def.responses.map((r) => r.label).join(' · ')}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
      </Tabs>
    </div>
  )
}
