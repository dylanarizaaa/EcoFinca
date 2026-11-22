import { Link } from '@tanstack/react-router'
import { BarChart3, BookOpen, CalendarClock, CloudSun, Leaf, Map, Package, Sprout, Store } from 'lucide-react'
import { pendingEvents, type GameState } from '@/engine'

const ITEMS = [
  { to: '/juego/$gameId', label: 'Finca', icon: Map, exact: true },
  { to: '/juego/$gameId/cultivos', label: 'Cultivos', icon: Sprout },
  { to: '/juego/$gameId/recursos', label: 'Recursos', icon: Package },
  { to: '/juego/$gameId/ecosistema', label: 'Ecosistema', icon: Leaf },
  { to: '/juego/$gameId/clima', label: 'Clima', icon: CloudSun },
  { to: '/juego/$gameId/mercado', label: 'Mercado', icon: Store },
  { to: '/juego/$gameId/eventos', label: 'Eventos', icon: CalendarClock },
  { to: '/juego/$gameId/informes', label: 'Informes', icon: BarChart3 },
  { to: '/juego/$gameId/enciclopedia', label: 'Enciclopedia', icon: BookOpen },
] as const

export function GameNav({ game }: { game: GameState }) {
  const pending = pendingEvents(game).length
  return (
    <nav className="sticky top-[calc(var(--topbar-h,3.75rem)+var(--safe-top))] z-20 border-b border-border bg-card/95 backdrop-blur" aria-label="Secciones del juego">
      <ul className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-3 py-1.5 sm:px-4">
        {ITEMS.map(({ to, label, icon: Icon, ...rest }) => (
          <li key={to}>
            <Link
              to={to}
              params={{ gameId: game.id }}
              activeOptions={{ exact: 'exact' in rest }}
              className="relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-forest-800 data-[status=active]:text-white"
            >
              <Icon className="size-4" />
              {label}
              {label === 'Eventos' && pending > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-clay-500 text-[11px] font-bold text-white" aria-label={`${pending} decisiones pendientes`}>
                  {pending}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
