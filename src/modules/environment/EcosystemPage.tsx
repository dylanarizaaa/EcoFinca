import { useNavigate } from '@tanstack/react-router'
import { CheckCircle2, Droplets, Leaf, MapPin, TreePine, Trees } from 'lucide-react'
import {
  computeScores,
  farmIndicators,
  getActionCost,
  SCORING,
  validateAction,
  waterSecurity,
  type FarmAction,
} from '@/engine'
import { CostList } from '@/components/common/cost'
import { IndicatorBar, ScoreRing } from '@/components/common/indicators'
import { PageHeader } from '@/components/common/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/overlays'
import { useGame, useGameAction } from '@/hooks/use-game'
import { INDICATOR_ORDER } from '@/lib/indicators'
import { useGameStore } from '@/store/game-store'
import { InvestmentCard } from '@/modules/resources/InvestmentCard'

const PRACTICES = [
  { name: 'Abonos orgánicos', why: 'Liberan nutrientes poco a poco, alimentan la vida del suelo y no se lavan hacia la quebrada como el exceso de fertilizante químico.', where: 'Lote → Fertilizar → Orgánico' },
  { name: 'Barreras vegetales', why: 'Frenan el agua que baja por la ladera, retienen sedimentos y forman terrazas naturales con el tiempo.', where: 'Lote → Barreras vivas' },
  { name: 'Cobertura vegetal', why: 'Protege el suelo del golpe de la lluvia (hasta −75 % de erosión), conserva humedad y aporta materia orgánica.', where: 'Lote → Cobertura vegetal' },
  { name: 'Reforestación', why: 'Recupera hábitat, aumenta el caudal de la quebrada y protege el suelo de forma permanente.', where: 'Lote → Reforestar / Área degradada' },
  { name: 'Conservación de fuentes hídricas', why: 'La vegetación de la ronda filtra contaminantes, sombrea el agua y estabiliza las orillas.', where: 'Esta página' },
  { name: 'Riego eficiente', why: 'El goteo entrega el agua donde la planta la necesita: misma humedad con cerca de 40 % menos agua.', where: 'Recursos → Infraestructura' },
  { name: 'Tratamiento de residuos', why: 'Las aguas mieles del beneficio son muy contaminantes. Tratarlas y compostar la pulpa cierra el ciclo de nutrientes.', where: 'Recursos → Beneficio ecológico' },
  { name: 'Manejo integrado de plagas', why: 'Combina control biológico, trampas y prácticas culturales; conserva los enemigos naturales y evita residuos químicos.', where: 'Lote → Control de plagas → MIP' },
]

function FarmConservationAction({ action, title, description, done, doneText, icon: Icon }: {
  action: FarmAction
  title: string
  description: string
  done: boolean
  doneText: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const game = useGame()
  const run = useGameAction()
  const cost = getActionCost(game, action)
  const error = validateAction(game, action)
  return (
    <div className="surface flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-forest-100 text-forest-700">
          <Icon className="size-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {done ? (
        <Badge variant="success" className="self-start">
          <CheckCircle2 /> {doneText}
        </Badge>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CostList cost={cost} game={game} compact />
          <ConfirmDialog
            trigger={
              <Tooltip content={error} disabled={!error}>
                <span tabIndex={error ? 0 : -1}>
                  <Button size="sm" disabled={!!error}>
                    Iniciar
                  </Button>
                </span>
              </Tooltip>
            }
            title={`¿${title}?`}
            description={<CostList cost={cost} game={game} />}
            confirmLabel="Iniciar"
            onConfirm={() => run(action)}
          />
        </div>
      )}
    </div>
  )
}

export function EcosystemPage() {
  const game = useGame()
  const navigate = useNavigate()
  const select = useGameStore((s) => s.selectParcel)
  const ind = farmIndicators(game)
  const base = game.baseline
  const scores = computeScores(game)
  const env = game.environment
  const water = waterSecurity(game)
  const w = SCORING.sustainabilityWeights
  const breakdown = [
    { label: 'Fertilidad', weight: w.fertility, value: ind.fertility },
    { label: 'Suelo sin erosión', weight: w.erosion, value: 100 - ind.erosion },
    { label: 'Calidad del agua', weight: w.waterQuality, value: ind.waterQuality },
    { label: 'Biodiversidad', weight: w.biodiversity, value: ind.biodiversity },
    { label: 'Agua limpia (sin contaminación)', weight: w.contamination, value: 100 - ind.contamination },
    { label: 'Seguridad hídrica', weight: w.water, value: water },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader icon={Leaf} title="Ecosistema" description="Indicadores ambientales de la finca, cómo se calcula la sostenibilidad y acciones de conservación." />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Indicadores ambientales</CardTitle>
            <CardDescription>Variación respecto al estado inicial de la finca.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {INDICATOR_ORDER.map((k) => (
              <IndicatorBar key={k} indicator={k} value={ind[k]} delta={ind[k] - base[k]} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-4">
            <ScoreRing value={scores.sustainability} label="Sostenibilidad" />
            <div>
              <CardTitle>¿Cómo se calcula?</CardTitle>
              <CardDescription>
                La sostenibilidad pesa 40 % de la puntuación global. Con sostenibilidad menor a 60 la nota máxima posible es «Aceptable», y
                menor a 40, «Deficiente»: no se premia la rentabilidad obtenida destruyendo el ecosistema.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {breakdown.map((b) => (
              <div key={b.label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
                <span>
                  {b.label} <span className="text-xs text-muted-foreground">× {Math.round(b.weight * 100)} %</span>
                </span>
                <span className="font-semibold tabular">{Math.round(b.value)}</span>
                <Progress value={b.value} className="col-span-2 h-1.5" indicatorClassName="bg-forest-500" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Conservación a escala de finca</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <FarmConservationAction
            action={{ type: 'conservarFuentes' }}
            icon={Droplets}
            title="Conservar la ronda de la quebrada"
            description={`Aislar y revegetalizar la ronda hídrica (${env.riparianHa} ha). Mejora gradual de calidad del agua, caudal y biodiversidad durante 12 meses. Protección actual: ${Math.round(env.riparian.level * 100)} %.`}
            done={env.riparian.active}
            doneText={`Programa activo · ${Math.round(env.riparian.level * 100)} % establecido`}
          />
          <FarmConservationAction
            action={{ type: 'restaurarArea' }}
            icon={TreePine}
            title="Restaurar el área degradada"
            description={
              env.degradedHa > 0
                ? `Reforestar con especies nativas las ${env.degradedHa} ha degradadas del borde del bosque. Se convierte en bosque en 3 años.`
                : 'La finca no tiene áreas degradadas pendientes.'
            }
            done={env.degradedHa === 0}
            doneText={env.restorationHa > 0 ? `En restauración · ${Math.round((env.restorationAge / 36) * 100)} %` : 'Sin áreas degradadas'}
          />
          <InvestmentCard game={game} id="beneficioEcologico" />
          <InvestmentCard game={game} id="riegoGoteo" />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Prácticas por lote</CardTitle>
          <CardDescription>Nivel de establecimiento de las prácticas de conservación en cada parcela.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 font-semibold">Lote</th>
                <th className="pb-2 font-semibold">Erosión</th>
                <th className="pb-2 font-semibold">Biodiversidad</th>
                <th className="pb-2 font-semibold">Cobertura</th>
                <th className="pb-2 font-semibold">Barreras</th>
                <th className="pb-2 font-semibold">Sombrío</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {game.parcels.map((p) => (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="py-2 font-medium">
                    {p.name} <span className="text-xs text-muted-foreground">{p.id}</span>
                  </td>
                  <td className="py-2 tabular">{Math.round(p.soil.erosion)}</td>
                  <td className="py-2 tabular">{Math.round(p.biodiversity)}</td>
                  {[p.practices.cover, p.practices.barrier, p.practices.shade].map((e, i) => (
                    <td key={i} className="py-2">
                      {e.active ? <Badge variant="success">{Math.round(e.level * 100)} %</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  ))}
                  <td className="py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        select(p.id)
                        void navigate({ to: '/juego/$gameId', params: { gameId: game.id } })
                      }}
                    >
                      <MapPin /> Actuar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Trees className="size-5 text-forest-600" /> ¿Por qué estas prácticas son beneficiosas?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PRACTICES.map((p) => (
            <div key={p.name} className="surface-muted p-4">
              <h3 className="font-display font-bold text-forest-800">{p.name}</h3>
              <p className="mt-1 text-sm">{p.why}</p>
              <p className="mt-2 text-xs text-muted-foreground">Dónde: {p.where}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
