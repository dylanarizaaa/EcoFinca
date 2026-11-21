import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router'
import { GameLayout } from '@/app/layouts/GameLayout'
import { NotFound, RootLayout } from '@/app/layouts/RootLayout'
import { FarmPage } from '@/modules/farm/FarmPage'
import { HomePage } from '@/modules/home/HomePage'
import { NewGamePage } from '@/modules/setup/NewGamePage'

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFound })

const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage })
const newGameRoute = createRoute({ getParentRoute: () => rootRoute, path: '/nueva-partida', component: NewGamePage })
const howToRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/como-jugar',
  component: lazyRouteComponent(() => import('@/modules/howto/HowToPlayPage'), 'HowToPlayPage'),
})
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/configuracion',
  component: lazyRouteComponent(() => import('@/modules/settings/SettingsPage'), 'SettingsPage'),
})
const encyclopediaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/enciclopedia',
  component: lazyRouteComponent(() => import('@/modules/encyclopedia/EncyclopediaPage'), 'StandaloneEncyclopediaPage'),
})

export const gameRoute = createRoute({ getParentRoute: () => rootRoute, path: '/juego/$gameId', component: GameLayout })

const farmRoute = createRoute({ getParentRoute: () => gameRoute, path: '/', component: FarmPage })
const cropsRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: 'cultivos',
  component: lazyRouteComponent(() => import('@/modules/crops/CropsPage'), 'CropsPage'),
})
const resourcesRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: 'recursos',
  component: lazyRouteComponent(() => import('@/modules/resources/ResourcesPage'), 'ResourcesPage'),
})
const ecosystemRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: 'ecosistema',
  component: lazyRouteComponent(() => import('@/modules/environment/EcosystemPage'), 'EcosystemPage'),
})
const climateRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: 'clima',
  component: lazyRouteComponent(() => import('@/modules/climate/ClimatePage'), 'ClimatePage'),
})
const marketRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: 'mercado',
  component: lazyRouteComponent(() => import('@/modules/market/MarketPage'), 'MarketPage'),
})
const eventsRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: 'eventos',
  component: lazyRouteComponent(() => import('@/modules/events/EventsPage'), 'EventsPage'),
})
const reportsRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: 'informes',
  component: lazyRouteComponent(() => import('@/modules/reports/ReportsPage'), 'ReportsPage'),
})
const gameEncyclopediaRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: 'enciclopedia',
  component: lazyRouteComponent(() => import('@/modules/encyclopedia/EncyclopediaPage'), 'EncyclopediaPage'),
})
const evaluationRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: 'evaluacion',
  component: lazyRouteComponent(() => import('@/modules/evaluation/EvaluationPage'), 'EvaluationPage'),
})

export const routeTree = rootRoute.addChildren([
  homeRoute,
  newGameRoute,
  howToRoute,
  settingsRoute,
  encyclopediaRoute,
  gameRoute.addChildren([
    farmRoute,
    cropsRoute,
    resourcesRoute,
    ecosystemRoute,
    climateRoute,
    marketRoute,
    eventsRoute,
    reportsRoute,
    gameEncyclopediaRoute,
    evaluationRoute,
  ]),
])

export function createAppRouter(history = createHashHistory()) {
  return createRouter({
    routeTree,
    history,
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultPendingMinMs: 0,
  })
}

export const router = createAppRouter()

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
