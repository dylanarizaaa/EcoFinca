import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Database, RotateCcw, Save, Settings, SlidersHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DEFAULT_PARAMS, ModelParamsSchema, type ModelParams, type StageDurations } from '@/engine'
import { Logo } from '@/components/common/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label, Switch } from '@/components/ui/misc'
import { Slider } from '@/components/ui/overlays'
import { useSavedGames } from '@/hooks/use-saved-games'
import { useSettingsStore } from '@/store/settings-store'

type ParamField = { key: Exclude<keyof ModelParams, 'stageDurations'>; label: string; hint: string; step?: number }

const PARAM_FIELDS: ParamField[] = [
  { key: 'baseYieldKgHa', label: 'Rendimiento base (kg cps/ha por cosecha)', hint: 'Orden de magnitud de promedios nacionales; valor de calibración.' },
  { key: 'coffeeBasePrice', label: 'Precio de referencia del café (COP/kg)', hint: 'Valor ficticio del juego, no es una cotización real.' },
  { key: 'inputPriceMultiplier', label: 'Multiplicador de precios de insumos', hint: '1 = precios de referencia del juego.', step: 0.05 },
  { key: 'monthlyFixedCost', label: 'Costo fijo mensual (COP)', hint: 'Administración, servicios y personal permanente.' },
  { key: 'baseLabor', label: 'Jornales base por mes', hint: 'Mano de obra familiar o permanente disponible.' },
  { key: 'laborCost', label: 'Costo del jornal adicional (COP)', hint: 'Valor de referencia del juego.' },
]

const STAGE_FIELDS: { key: keyof StageDurations; label: string }[] = [
  { key: 'preparacion', label: 'Preparación' },
  { key: 'establecimiento', label: 'Establecimiento' },
  { key: 'vegetativoInicial', label: 'Crecimiento vegetativo (planta joven)' },
  { key: 'vegetativoPostCosecha', label: 'Crecimiento vegetativo (post-cosecha)' },
  { key: 'floracion', label: 'Floración' },
  { key: 'fructificacion', label: 'Fructificación' },
  { key: 'maduracion', label: 'Maduración' },
  { key: 'cosecha', label: 'Ventana de cosecha' },
]

function ToggleRow({ id, label, description, checked, onChange }: { id: string; label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

export function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const reset = useSettingsStore((s) => s.reset)
  const { games, remove } = useSavedGames()
  const [draft, setDraft] = useState<ModelParams>(settings.params)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setDraft(settings.params), [settings.params])

  const saveParams = async () => {
    const parsed = ModelParamsSchema.safeParse(draft)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const message = issue ? `${issue.path.join('.')}: ${issue.message}` : 'Parámetros inválidos.'
      setError(message)
      toast.error('Parámetros inválidos', { description: message })
      return
    }
    setError(null)
    await update({ params: parsed.data })
    toast.success('Parámetros guardados', { description: 'Se aplicarán a las nuevas partidas.' })
  }

  return (
    <div className="min-h-dvh paper-texture">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft /> Inicio
          </Link>
        </Button>
        <Logo />
      </header>
      <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 pb-16 sm:px-6">
        <div className="flex items-center gap-3">
          <Settings className="size-7 text-forest-700" />
          <h1 className="font-display text-3xl font-black text-forest-900">Configuración</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Preferencias</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <ToggleRow id="autosave" label="Guardado automático" description="Guarda la partida en este dispositivo después de cada acción y cada mes." checked={settings.autosave} onChange={(v) => void update({ autosave: v })} />
            <ToggleRow id="tutorial" label="Mostrar tutorial en partidas nuevas" description="Guía paso a paso al iniciar una finca." checked={settings.showTutorial} onChange={(v) => void update({ showTutorial: v })} />
            <ToggleRow id="tooltips" label="Tooltips explicativos" description="Muestra explicaciones al pasar el cursor sobre indicadores y acciones." checked={settings.showTooltips} onChange={(v) => void update({ showTooltips: v })} />
            <ToggleRow id="motion" label="Reducir animaciones" description="Desactiva transiciones y animaciones decorativas." checked={settings.reduceMotion} onChange={(v) => void update({ reduceMotion: v })} />
            <div className="flex flex-col gap-2 py-3">
              <Label>Velocidad del avance automático: un mes cada {settings.autoAdvanceSeconds} s</Label>
              <Slider value={[settings.autoAdvanceSeconds]} min={2} max={30} step={1} onValueChange={(v) => void update({ autoAdvanceSeconds: v[0] ?? 6 })} className="max-w-sm" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" /> Parámetros del modelo
            </CardTitle>
            <CardDescription>
              Permiten calibrar la simulación con fuentes técnicas actualizadas. Se aplican a las partidas <b>nuevas</b>; cada partida guarda sus propios parámetros
              para ser reproducible. Los coeficientes ambientales detallados están en <code>src/engine/config/model.ts</code> y se documentan en docs/SIMULATION-MODEL.md.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {PARAM_FIELDS.map((f) => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <Label htmlFor={`p-${f.key}`}>{f.label}</Label>
                  <Input
                    id={`p-${f.key}`}
                    type="number"
                    step={f.step ?? 1}
                    value={draft[f.key]}
                    onChange={(e) => setDraft({ ...draft, [f.key]: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">{f.hint}</p>
                </div>
              ))}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-bold">Duración de etapas fenológicas (meses)</h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {STAGE_FIELDS.map((f) => (
                  <div key={f.key} className="flex flex-col gap-1.5">
                    <Label htmlFor={`s-${f.key}`} className="text-xs">
                      {f.label}
                    </Label>
                    <Input
                      id={`s-${f.key}`}
                      type="number"
                      min={1}
                      value={draft.stageDurations[f.key]}
                      onChange={(e) => setDraft({ ...draft, stageDurations: { ...draft.stageDurations, [f.key]: Math.round(Number(e.target.value)) } })}
                    />
                  </div>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void saveParams()}>
                <Save /> Guardar parámetros
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="outline">
                    <RotateCcw /> Restablecer valores por defecto
                  </Button>
                }
                title="¿Restablecer la configuración?"
                description="Se restaurarán las preferencias y los parámetros del modelo por defecto. Las partidas existentes no cambian."
                confirmLabel="Restablecer"
                onConfirm={() => {
                  setDraft(DEFAULT_PARAMS)
                  void reset().then(() => toast.success('Configuración restablecida'))
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-4" /> Datos guardados
            </CardTitle>
            <CardDescription>
              Las partidas se guardan localmente en este dispositivo (IndexedDB). Hay {games.length} partida(s) guardada(s).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfirmDialog
              trigger={
                <Button variant="destructive" disabled={games.length === 0}>
                  <Trash2 /> Eliminar todas las partidas
                </Button>
              }
              title="¿Eliminar todas las partidas?"
              description="Se borrarán todas las partidas guardadas en este dispositivo. Esta acción no se puede deshacer."
              confirmLabel="Eliminar todo"
              destructive
              onConfirm={() => {
                void Promise.all(games.map((g) => remove(g.id))).then(() => toast.success('Partidas eliminadas'))
              }}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
