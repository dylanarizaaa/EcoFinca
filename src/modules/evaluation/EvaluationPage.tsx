import { Link } from '@tanstack/react-router'
import { BarChart3, CheckCircle2, Flag, Home, Lightbulb, Plus, Trophy, XCircle } from 'lucide-react'
import { CLASSIFICATION_INFO, computeScores, evaluateObjectives, generateRecommendations, SCENARIOS, totalsFromTransactions } from '@/engine'
import { ScoreRing } from '@/components/common/indicators'
import { PageHeader } from '@/components/common/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/misc'
import { useGame } from '@/hooks/use-game'
import { formatCop, formatKg, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/store/game-store'

export function EvaluationPage() {
  const game = useGame()
  const finish = useGameStore((s) => s.finish)
  const outcome = game.outcome
  const finished = game.status !== 'activo'
  const scores = outcome?.scores ?? computeScores(game)
  const objectives = outcome?.objectives ?? evaluateObjectives(game)
  const recommendations = outcome?.recommendations ?? generateRecommendations(game, 8)
  const totals = totalsFromTransactions(game.transactions)
  const victory = game.status === 'victoria'

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Flag}
        title={finished ? 'Evaluación final' : 'Evaluación preliminar'}
        description={
          finished
            ? outcome?.reason
            : 'La partida sigue en curso. Esta es una evaluación con el estado actual; puedes finalizar la partida para obtener la evaluación definitiva.'
        }
        actions={
          !finished && (
            <ConfirmDialog
              trigger={
                <Button>
                  <Flag /> Finalizar partida
                </Button>
              }
              title="¿Finalizar la partida ahora?"
              description="La evaluación final se calculará con el estado actual. No podrás seguir avanzando."
              confirmLabel="Finalizar"
              onConfirm={finish}
            />
          )
        }
      />

      {finished && (
        <div
          className={cn(
            'flex flex-col items-center gap-3 rounded-2xl p-8 text-center sm:flex-row sm:text-left',
            victory ? 'bg-gradient-to-br from-forest-800 to-forest-600 text-white' : game.status === 'derrota' ? 'bg-clay-500 text-white' : 'bg-sand-200 text-earth-700',
          )}
          data-testid="final-banner"
        >
          {victory ? <Trophy className="size-14 text-sun-300" /> : game.status === 'derrota' ? <XCircle className="size-14" /> : <Flag className="size-14" />}
          <div>
            <p className="font-display text-3xl font-black">
              {victory ? '¡Victoria!' : game.status === 'derrota' ? 'Derrota' : 'Partida finalizada'}
            </p>
            <p className="opacity-90">
              {game.config.farmName} · {SCENARIOS[game.config.scenarioId].name} · {game.turn} meses administrados
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="items-center gap-4 p-6">
          <ScoreRing value={scores.global} label="Puntuación global" size={140} stroke={12} />
          <Badge variant={scores.classification === 'Deficiente' ? 'danger' : scores.classification === 'Aceptable' ? 'warning' : 'success'} className="px-3 py-1 text-base">
            {scores.classification}
          </Badge>
          <p className="max-w-56 text-center text-sm text-muted-foreground">{CLASSIFICATION_INFO[scores.classification].description}</p>
          <div className="flex gap-4">
            <ScoreRing value={scores.productivity} label="Productividad" size={72} stroke={7} />
            <ScoreRing value={scores.profitability} label="Rentabilidad" size={72} stroke={7} />
            <ScoreRing value={scores.sustainability} label="Sostenibilidad" size={72} stroke={7} />
          </div>
          <p className="text-center text-xs text-muted-foreground">Global = 0,30·P + 0,30·R + 0,40·S, con tope si S &lt; 60.</p>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Objetivos del escenario</CardTitle>
              <CardDescription>{SCENARIOS[game.config.scenarioId].objective}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {objectives.map((o) => (
                <div key={o.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                    <span className="flex items-center gap-1.5">
                      {o.achieved ? <CheckCircle2 className="size-4 text-forest-600" /> : <XCircle className="size-4 text-clay-500" />}
                      {o.label}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground tabular">
                      {o.current} / {o.target}
                    </span>
                  </div>
                  <Progress value={o.progress * 100} className="h-1.5" indicatorClassName={o.achieved ? 'bg-forest-500' : 'bg-clay-400'} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Victoria: cumplir todos los objetivos con una clasificación distinta de «Deficiente».</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Producción total</dt>
                  <dd className="font-display text-lg font-bold">{formatKg(game.counters.totalProductionKg)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ganancia neta</dt>
                  <dd className={cn('font-display text-lg font-bold', totals.profit < 0 && 'text-clay-600')}>{formatCop(totals.profit)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Agua utilizada</dt>
                  <dd className="font-display text-lg font-bold">{formatNumber(game.counters.totalWaterUsed)} m³</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ciclos completados</dt>
                  <dd className="font-display text-lg font-bold">{game.cycles.length}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Eventos enfrentados</dt>
                  <dd className="font-display text-lg font-bold">{new Set(game.eventLog.map((e) => e.eventId)).size}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dinero final</dt>
                  <dd className="font-display text-lg font-bold">{formatCop(game.inventory.money)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-4 text-sun-500" /> Recomendaciones de mejora
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {recommendations.length === 0 && <p className="text-sm text-muted-foreground">Excelente gestión. No hay recomendaciones críticas.</p>}
              {recommendations.map((r) => (
                <div key={r.id} className="rounded-xl bg-muted/60 p-3 text-sm">
                  <div className="flex items-center gap-2 font-semibold">
                    <Badge variant={r.priority === 'alta' ? 'danger' : r.priority === 'media' ? 'warning' : 'muted'}>{r.priority}</Badge>
                    {r.title}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link to="/juego/$gameId/informes" params={{ gameId: game.id }}>
            <BarChart3 /> Ver informes y comparar estrategias
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/nueva-partida">
            <Plus /> Nueva partida
          </Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/">
            <Home /> Menú principal
          </Link>
        </Button>
      </div>
    </div>
  )
}
