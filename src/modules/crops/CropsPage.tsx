import { useNavigate } from '@tanstack/react-router'
import { BookMarked, MapPin, Sprout, Wheat } from 'lucide-react'
import {
  PEST_IDS,
  PEST_INFO,
  STAGE_INFO,
  STAGE_ORDER,
  stageDuration,
  VARIETIES,
  plantedParcels,
} from '@/engine'
import { IndicatorBar, StatTile } from '@/components/common/indicators'
import { PageHeader } from '@/components/common/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useGame } from '@/hooks/use-game'
import { formatHa, formatKg } from '@/lib/format'
import { useGameStore } from '@/store/game-store'
import { StageTimeline } from './StageTimeline'

export function CropsPage() {
  const game = useGame()
  const navigate = useNavigate()
  const select = useGameStore((s) => s.selectParcel)
  const planted = plantedParcels(game)
  const estimated = planted.reduce((a, p) => a + (p.crop?.estimatedYieldKg ?? 0), 0)
  const ready = game.parcels.filter((p) => p.crop?.stage === 'cosecha')
  const d = game.params.stageDurations

  const openParcel = (id: string) => {
    select(id)
    void navigate({ to: '/juego/$gameId', params: { gameId: game.id } })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader icon={Sprout} title="Cultivos" description="Estado de cada lote, etapa fenológica, salud y producción estimada." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Sprout} label="Lotes sembrados" value={`${planted.length}/${game.parcels.length}`} hint={`${formatHa(planted.reduce((a, p) => a + p.areaHa, 0))} con café`} />
        <StatTile icon={Wheat} label="Listos para cosechar" value={ready.length} hint={ready.map((p) => p.id).join(', ') || 'Ninguno este mes'} tone={ready.length ? 'good' : undefined} />
        <StatTile icon={BookMarked} label="Producción estimada" value={formatKg(estimated)} hint="Suma de las próximas cosechas" />
        <StatTile icon={Wheat} label="Producción acumulada" value={formatKg(game.counters.totalProductionKg)} hint="Desde el inicio de la partida" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {game.parcels.map((p) => {
          const crop = p.crop
          return (
            <Card key={p.id} className="gap-0" data-testid={`crop-card-${p.id}`}>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>
                    {p.name} <span className="text-sm text-muted-foreground">· {p.id}</span>
                  </CardTitle>
                  <CardDescription>
                    {formatHa(p.areaHa)} · pendiente {Math.round(p.slope * 100)} %
                  </CardDescription>
                </div>
                {crop?.variety ? (
                  <Badge variant="success">{VARIETIES[crop.variety].name}</Badge>
                ) : (
                  <Badge variant="secondary">{p.landUse === 'reforestacion' ? 'Reforestación' : crop ? 'Preparación' : 'Barbecho'}</Badge>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {crop?.variety ? (
                  <>
                    <StageTimeline crop={crop} params={game.params} />
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Edad</div>
                        <div className="font-semibold">{crop.ageMonths} meses</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Estimada</div>
                        <div className="font-semibold">{formatKg(crop.estimatedYieldKg)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Acumulada</div>
                        <div className="font-semibold">{formatKg(p.totalProductionKg)}</div>
                      </div>
                    </div>
                    <IndicatorBar indicator="health" value={crop.health} compact />
                    <IndicatorBar indicator="fertility" value={p.soil.fertility} compact />
                    <IndicatorBar indicator="moisture" value={p.soil.moisture} compact />
                    <div className="flex flex-wrap gap-1">
                      {PEST_IDS.filter((pest) => p.pests[pest] >= 5).map((pest) => (
                        <Badge key={pest} variant={p.pests[pest] > 25 ? 'danger' : 'warning'}>
                          {PEST_INFO[pest].name}: {Math.round(p.pests[pest])}
                        </Badge>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {p.landUse === 'reforestacion'
                      ? `Bosque en regeneración desde hace ${p.reforestationAge} meses.`
                      : crop
                        ? 'Terreno en preparación. Al completarse podrás sembrar colinos.'
                        : 'Lote sin cultivo. Prepara el terreno para sembrar o protégelo con cobertura.'}
                  </p>
                )}
                <Button variant="outline" size="sm" className="self-start" onClick={() => openParcel(p.id)}>
                  <MapPin /> Ver en el mapa y actuar
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Etapas fenológicas del café</CardTitle>
            <CardDescription>
              Duraciones configurables (Configuración → Parámetros del modelo). Valores orientativos basados en literatura divulgativa sobre café
              arábica en Colombia: primera cosecha entre 18 y 24 meses después de la siembra y unas 32 semanas entre floración y cosecha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2">
              {STAGE_ORDER.map((stage, i) => (
                <li key={stage} className="flex gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-forest-100 text-xs font-bold text-forest-700">{i + 1}</span>
                  <div>
                    <span className="font-semibold">{STAGE_INFO[stage].name}</span>{' '}
                    <span className="text-muted-foreground">
                      ·{' '}
                      {stage === 'vegetativo'
                        ? `${d.vegetativoInicial} meses (planta joven) / ${d.vegetativoPostCosecha} meses (post-cosecha)`
                        : `${stageDuration(stage, d, 1)} mes(es)`}
                    </span>
                    <p className="text-xs text-muted-foreground">{STAGE_INFO[stage].description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Variedades disponibles</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {Object.values(VARIETIES).map((v) => (
                <div key={v.id} className="rounded-xl bg-muted/60 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{v.name}</span>
                    <Badge variant={v.rustSusceptibility < 0.5 ? 'success' : 'danger'}>{v.rustSusceptibility < 0.5 ? 'Resistente' : 'Susceptible'}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{v.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Plagas y enfermedades</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {PEST_IDS.map((pest) => (
                <div key={pest} className="text-sm">
                  <span className="font-semibold">{PEST_INFO[pest].name}</span>{' '}
                  <i className="text-muted-foreground">({PEST_INFO[pest].scientific})</i>
                  <p className="text-xs text-muted-foreground">
                    {PEST_INFO[pest].description} <b>Favorecida por:</b> {PEST_INFO[pest].favoredBy}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
