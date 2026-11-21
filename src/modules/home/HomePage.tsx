import { Link, useNavigate } from '@tanstack/react-router'
import { BookOpen, HelpCircle, Play, Plus, Settings, Sprout, Trash2, Trophy } from 'lucide-react'
import { SCENARIOS } from '@/engine'
import { HeroLandscape } from '@/components/illustrations/HeroLandscape'
import { Logo } from '@/components/common/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/overlays'
import { useSavedGames } from '@/hooks/use-saved-games'
import { formatCopShort, formatDateTime } from '@/lib/format'
import { toast } from 'sonner'

const STATUS_LABEL = { activo: 'En curso', victoria: 'Victoria', derrota: 'Derrota', finalizado: 'Finalizada' } as const

export function HomePage() {
  const navigate = useNavigate()
  const { games, loading, remove } = useSavedGames()
  const latest = games.find((g) => g.status === 'activo') ?? games[0]

  return (
    <div className="min-h-dvh paper-texture">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/enciclopedia">
              <BookOpen /> <span className="hidden sm:inline">Enciclopedia</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/configuracion">
              <Settings /> <span className="hidden sm:inline">Configuración</span>
            </Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="grid items-center gap-8 pt-4 lg:grid-cols-[1.05fr_1fr] lg:pt-10">
          <div className="flex flex-col gap-5">
            <Badge variant="success" className="px-3 py-1 text-sm">
              <Sprout /> Simulador educativo de agricultura sostenible
            </Badge>
            <h1 className="font-display text-4xl leading-[1.05] font-black text-forest-900 sm:text-5xl lg:text-6xl">
              Cultiva café.
              <br />
              <span className="text-forest-500">Cuida la tierra.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Administra una finca cafetera colombiana de cinco hectáreas. Cada decisión sobre el suelo, el agua, los fertilizantes y las
              plagas afecta tu producción, tu economía y el ecosistema. ¿Puedes ser rentable sin destruir lo que te da de comer?
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="xl" onClick={() => void navigate({ to: '/nueva-partida' })} data-testid="new-game">
                <Plus /> Nueva partida
              </Button>
              <Tooltip content={latest ? `${latest.farmName} · ${STATUS_LABEL[latest.status]}` : 'No hay partidas guardadas'}>
                <span tabIndex={latest ? -1 : 0}>
                  <Button
                    size="xl"
                    variant="outline"
                    disabled={!latest}
                    onClick={() => latest && void navigate({ to: '/juego/$gameId', params: { gameId: latest.id } })}
                    data-testid="continue-game"
                  >
                    <Play /> Continuar partida
                  </Button>
                </span>
              </Tooltip>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" asChild>
                <Link to="/como-jugar">
                  <HelpCircle /> Cómo jugar
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link to="/configuracion">
                  <Settings /> Configuración
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-leaf-200/50 blur-2xl" />
            <HeroLandscape className="w-full overflow-hidden rounded-[1.75rem] border-4 border-white shadow-2xl" />
          </div>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { title: 'Productividad', text: 'Fertilidad, agua y sanidad determinan cuánto café cosechas.', color: 'bg-leaf-200 text-forest-800' },
            { title: 'Rentabilidad', text: 'Compra insumos, paga jornales, vende tu cosecha y cuida la liquidez.', color: 'bg-sand-200 text-earth-700' },
            { title: 'Sostenibilidad', text: 'Erosión, contaminación, biodiversidad y agua pesan 40 % en tu puntuación.', color: 'bg-water-100 text-water-600' },
          ].map((c) => (
            <div key={c.title} className="surface p-5">
              <span className={`inline-block rounded-lg px-2.5 py-1 text-sm font-bold ${c.color}`}>{c.title}</span>
              <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-14" aria-labelledby="saved-title">
          <h2 id="saved-title" className="font-display text-2xl font-extrabold text-forest-900">
            Partidas guardadas
          </h2>
          <p className="text-sm text-muted-foreground">Se guardan automáticamente en este navegador (IndexedDB).</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {loading &&
              Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-28" />)}
            {!loading && games.length === 0 && (
              <div className="surface-muted col-span-full flex flex-col items-center gap-2 p-8 text-center">
                <Sprout className="size-8 text-forest-400" />
                <p className="font-display font-bold">Aún no tienes partidas</p>
                <p className="text-sm text-muted-foreground">Crea una nueva partida para empezar a administrar tu finca.</p>
              </div>
            )}
            {games.map((g) => (
              <article key={g.id} className="surface flex flex-col gap-3 p-4" data-testid="saved-game">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold">{g.farmName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {SCENARIOS[g.scenarioId].name} · Adm. {g.managerName}
                    </p>
                  </div>
                  <Badge variant={g.status === 'victoria' ? 'success' : g.status === 'derrota' ? 'danger' : g.status === 'activo' ? 'info' : 'muted'}>
                    {g.status === 'victoria' && <Trophy />}
                    {STATUS_LABEL[g.status]}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Progreso</div>
                    <div className="font-semibold tabular">
                      {g.turn}/{g.totalMonths} meses
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Dinero</div>
                    <div className="font-semibold tabular">{formatCopShort(g.money)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Puntuación</div>
                    <div className="font-semibold tabular">{Math.round(g.globalScore)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Guardada {formatDateTime(g.updatedAt)}</span>
                  <div className="flex gap-1">
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${g.farmName}`}>
                          <Trash2 />
                        </Button>
                      }
                      title="¿Eliminar esta partida?"
                      description={`Se borrará «${g.farmName}» y todo su historial de este navegador. Esta acción no se puede deshacer.`}
                      confirmLabel="Eliminar"
                      destructive
                      onConfirm={() =>
                        void remove(g.id).then(() => toast.success('Partida eliminada'), () => toast.error('No se pudo eliminar la partida'))
                      }
                    />
                    <Button size="sm" onClick={() => void navigate({ to: '/juego/$gameId', params: { gameId: g.id } })}>
                      <Play /> Abrir
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        EcoFinca · Modelo educativo simplificado. Los coeficientes y precios son hipotéticos y configurables.
      </footer>
    </div>
  )
}
