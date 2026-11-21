import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Dices, Droplets, Loader2, Mountain, Scale, Sprout } from 'lucide-react'
import { toast } from 'sonner'
import {
  DIFFICULTY,
  DIFFICULTY_INFO,
  GameConfigSchema,
  objectiveDefinitions,
  randomSeed,
  SCENARIO_IDS,
  SCENARIOS,
  type Difficulty,
  type GameConfig,
  type ParcelCount,
  type ScenarioId,
} from '@/engine'
import { Logo } from '@/components/common/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/misc'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/overlays'
import { formatCop } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/store/game-store'
import { useSettingsStore } from '@/store/settings-store'

const SCENARIO_ICONS: Record<ScenarioId, React.ComponentType<{ className?: string }>> = {
  equilibrada: Scale,
  'suelo-degradado': Mountain,
  'crisis-hidrica': Droplets,
}

const PARCEL_OPTIONS: ParcelCount[] = [4, 6, 8, 9]

function recommendedBudget(scenario: ScenarioId, difficulty: Difficulty): number {
  return Math.round((SCENARIOS[scenario].defaultBudget * DIFFICULTY[difficulty].budget) / 500_000) * 500_000
}

type Errors = Partial<Record<keyof GameConfig, string>>

export function NewGamePage() {
  const navigate = useNavigate()
  const startNewGame = useGameStore((s) => s.startNewGame)
  const params = useSettingsStore((s) => s.settings.params)
  const [farmName, setFarmName] = useState('La Esperanza')
  const [managerName, setManagerName] = useState('')
  const [scenarioId, setScenarioId] = useState<ScenarioId>('equilibrada')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [budgetText, setBudgetText] = useState(String(recommendedBudget('equilibrada', 'normal')))
  const [budgetTouched, setBudgetTouched] = useState(false)
  const [durationYears, setDurationYears] = useState(3)
  const [parcelCount, setParcelCount] = useState<ParcelCount>(6)
  const [seedText, setSeedText] = useState(() => String(randomSeed()))
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const recommended = recommendedBudget(scenarioId, difficulty)
  const scenario = SCENARIOS[scenarioId]
  const objectives = useMemo(() => objectiveDefinitions(scenarioId), [scenarioId])

  const updateScenario = (id: ScenarioId) => {
    setScenarioId(id)
    if (!budgetTouched) setBudgetText(String(recommendedBudget(id, difficulty)))
  }
  const updateDifficulty = (d: Difficulty) => {
    setDifficulty(d)
    if (!budgetTouched) setBudgetText(String(recommendedBudget(scenarioId, d)))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const candidate = {
      farmName,
      managerName,
      scenarioId,
      difficulty,
      initialBudget: Number(budgetText.replace(/\D/g, '')),
      durationYears,
      parcelCount,
      seed: Number(seedText),
      startYear: new Date().getFullYear(),
    }
    const parsed = GameConfigSchema.safeParse(candidate)
    if (!parsed.success) {
      const next: Errors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof GameConfig
        next[key] ??= issue.message
      }
      setErrors(next)
      toast.error('Revisa la configuración', { description: Object.values(next)[0] })
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      const game = await startNewGame(parsed.data as GameConfig, params)
      toast.success(`¡Bienvenido a ${game.config.farmName}!`)
      await navigate({ to: '/juego/$gameId', params: { gameId: game.id } })
    } catch (err) {
      toast.error('No fue posible crear la partida', { description: err instanceof Error ? err.message : undefined })
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh paper-texture">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft /> Inicio
          </Link>
        </Button>
        <Logo />
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <h1 className="font-display text-3xl font-black text-forest-900">Nueva partida</h1>
        <p className="mt-1 text-muted-foreground">Configura tu finca. Cada opción modifica las condiciones iniciales de la simulación.</p>

        <form onSubmit={(e) => void submit(e)} className="mt-6 flex flex-col gap-6" noValidate>
          <Card>
            <CardHeader>
              <CardTitle>Tu finca</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="farmName">Nombre de la finca</Label>
                <Input id="farmName" value={farmName} onChange={(e) => setFarmName(e.target.value)} aria-invalid={!!errors.farmName} maxLength={40} />
                {errors.farmName && <p className="text-xs text-destructive">{errors.farmName}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="managerName">Nombre del administrador</Label>
                <Input
                  id="managerName"
                  value={managerName}
                  placeholder="Tu nombre"
                  onChange={(e) => setManagerName(e.target.value)}
                  aria-invalid={!!errors.managerName}
                  maxLength={40}
                />
                {errors.managerName && <p className="text-xs text-destructive">{errors.managerName}</p>}
              </div>
            </CardContent>
          </Card>

          <section aria-labelledby="scenario-title">
            <h2 id="scenario-title" className="mb-3 font-display text-lg font-bold">
              Escenario
            </h2>
            <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Escenario">
              {SCENARIO_IDS.map((id) => {
                const s = SCENARIOS[id]
                const Icon = SCENARIO_ICONS[id]
                const selected = id === scenarioId
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => updateScenario(id)}
                    className={cn(
                      'surface flex flex-col gap-2 p-4 text-left transition-all',
                      selected ? 'border-forest-500 ring-2 ring-forest-500/25' : 'hover:border-forest-300',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('flex size-10 items-center justify-center rounded-xl', selected ? 'bg-forest-800 text-leaf-200' : 'bg-muted text-forest-700')}>
                        <Icon className="size-5" />
                      </span>
                      <Badge variant="muted">{s.tagline}</Badge>
                    </div>
                    <span className="font-display text-lg font-bold">{s.name}</span>
                    <span className="text-sm text-muted-foreground">{s.description}</span>
                    <span className="mt-auto flex flex-wrap gap-1 pt-1">
                      {s.challenges.slice(0, 3).map((c) => (
                        <Badge key={c} variant="outline" className="font-medium">
                          {c}
                        </Badge>
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="surface-muted mt-3 p-4 text-sm">
              <p>
                <span className="font-semibold">Objetivo: </span>
                {scenario.objective}
              </p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-3">
                {objectives.map((o) => (
                  <li key={o.id} className="flex items-start gap-1.5">
                    <Sprout className="mt-0.5 size-3.5 shrink-0 text-forest-600" />
                    <span>
                      <b>{o.label}:</b> {o.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Reglas de la partida</CardTitle>
              <CardDescription>La dificultad afecta el presupuesto recomendado, la variabilidad del clima, los eventos y las plagas.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Dificultad</Label>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Dificultad">
                  {(['facil', 'normal', 'dificil'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={difficulty === d}
                      onClick={() => updateDifficulty(d)}
                      className={cn(
                        'rounded-xl border p-2.5 text-left text-sm transition-all',
                        difficulty === d ? 'border-forest-500 bg-forest-50 ring-2 ring-forest-500/20' : 'border-border hover:bg-muted/60',
                      )}
                    >
                      <span className="block font-semibold">{DIFFICULTY_INFO[d].name}</span>
                      <span className="text-xs text-muted-foreground">{DIFFICULTY_INFO[d].description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="budget">Presupuesto inicial (COP)</Label>
                <div className="flex gap-2">
                  <Input
                    id="budget"
                    inputMode="numeric"
                    value={Number(budgetText || 0).toLocaleString('es-CO')}
                    onChange={(e) => {
                      setBudgetTouched(true)
                      setBudgetText(e.target.value.replace(/\D/g, '').slice(0, 9))
                    }}
                    aria-invalid={!!errors.initialBudget}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setBudgetTouched(false)
                      setBudgetText(String(recommended))
                    }}
                  >
                    Recomendado
                  </Button>
                </div>
                <p className={cn('text-xs', errors.initialBudget ? 'text-destructive' : 'text-muted-foreground')}>
                  {errors.initialBudget ?? `Recomendado para este escenario y dificultad: ${formatCop(recommended)}.`}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="duration">Duración</Label>
                <Select value={String(durationYears)} onValueChange={(v) => setDurationYears(Number(v))}>
                  <SelectTrigger id="duration" aria-label="Duración de la partida">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y} {y === 1 ? 'año' : 'años'} ({y * 12} meses · {y} ciclo{y > 1 ? 's' : ''} productivo{y > 1 ? 's' : ''})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Parcelas del área productiva (3,6 ha)</Label>
                <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Número de parcelas">
                  {PARCEL_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={parcelCount === n}
                      onClick={() => setParcelCount(n)}
                      className={cn(
                        'rounded-xl border py-2 text-center text-sm font-semibold transition-all',
                        parcelCount === n ? 'border-forest-500 bg-forest-50 ring-2 ring-forest-500/20' : 'border-border hover:bg-muted/60',
                      )}
                    >
                      {n}
                      <span className="block text-[11px] font-normal text-muted-foreground">≈{(3.6 / n).toFixed(2)} ha</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <Label htmlFor="seed">Semilla aleatoria</Label>
                <div className="flex max-w-md gap-2">
                  <Input
                    id="seed"
                    inputMode="numeric"
                    value={seedText}
                    onChange={(e) => setSeedText(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    aria-invalid={!!errors.seed}
                  />
                  <Button type="button" variant="outline" onClick={() => setSeedText(String(randomSeed()))}>
                    <Dices /> Aleatoria
                  </Button>
                </div>
                <p className={cn('text-xs', errors.seed ? 'text-destructive' : 'text-muted-foreground')}>
                  {errors.seed ?? 'Con la misma semilla y configuración el clima y los eventos se repiten: útil para comparar estrategias.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" size="lg" asChild>
              <Link to="/">Cancelar</Link>
            </Button>
            <Button type="submit" size="lg" disabled={submitting} data-testid="start-game">
              {submitting ? <Loader2 className="animate-spin" /> : <Sprout />}
              Iniciar finca
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
