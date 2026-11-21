import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_PARAMS } from '@/engine'
import type { TurnSummary } from '@/engine'
import { IndicatorBar, ScoreRing } from '@/components/common/indicators'
import { TooltipProvider } from '@/components/ui/overlays'
import { TurnSummaryDialog } from '@/modules/game/TurnSummaryDialog'
import { EcoFincaDB, setDb } from '@/persistence/db'
import { saveGame } from '@/persistence/repository'
import { useGameStore } from '@/store/game-store'
import { makeGame } from '../helpers'
import { renderApp } from './render'

let db: EcoFincaDB

beforeEach(() => {
  db = new EcoFincaDB(`ecofinca-ui-${Math.random()}`)
  setDb(db)
  useGameStore.getState().unload()
})

afterEach(async () => {
  useGameStore.getState().unload()
  await db.delete()
  setDb(null)
})

describe('Pantalla de inicio', () => {
  it('muestra las opciones principales y deshabilita «Continuar» sin partidas guardadas', async () => {
    renderApp('/')
    expect(await screen.findByRole('button', { name: /Nueva partida/ })).toBeEnabled()
    expect(screen.getByRole('link', { name: /Cómo jugar/ })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Configuración/ }).length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.getByText('Aún no tienes partidas')).toBeInTheDocument())
    expect(screen.getByTestId('continue-game')).toBeDisabled()
  })

  it('habilita «Continuar» y lista la partida guardada', async () => {
    await saveGame({ ...makeGame({ farmName: 'El Mirador' }), id: 'guardada-1' })
    renderApp('/')
    await waitFor(() => expect(screen.getByTestId('continue-game')).toBeEnabled())
    expect(screen.getByText('El Mirador')).toBeInTheDocument()
  })

  it('pide confirmación antes de eliminar una partida', async () => {
    const user = userEvent.setup()
    await saveGame({ ...makeGame({ farmName: 'Para borrar' }), id: 'borrar-1' })
    renderApp('/')
    await user.click(await screen.findByRole('button', { name: /Eliminar Para borrar/ }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/no se puede deshacer/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(screen.queryByText('Para borrar')).not.toBeInTheDocument())
  })
})

describe('Configuración de partida', () => {
  it('valida el formulario con Zod y muestra errores', async () => {
    const user = userEvent.setup()
    renderApp('/nueva-partida')
    await user.click(await screen.findByTestId('start-game'))
    expect((await screen.findAllByText(/administrador debe tener al menos 2 caracteres/)).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Nombre del administrador')).toHaveAttribute('aria-invalid', 'true')
    expect(useGameStore.getState().game).toBeNull()
  })

  it('crea una partida y abre la finca', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/nueva-partida')
    await user.type(await screen.findByLabelText('Nombre del administrador'), 'Ana Rojas')
    await user.click(screen.getByRole('radio', { name: /Crisis hídrica/ }))
    await user.click(screen.getByTestId('start-game'))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/juego\//), { timeout: 4000 })
    const game = useGameStore.getState().game
    expect(game?.config.scenarioId).toBe('crisis-hidrica')
    expect(game?.config.managerName).toBe('Ana Rojas')
    expect(await screen.findByTestId('advance-month')).toBeInTheDocument()
  })
})

describe('Pantalla principal del juego', () => {
  async function openGame() {
    const game = await useGameStore.getState().startNewGame(
      {
        farmName: 'La Esperanza',
        managerName: 'Ana',
        scenarioId: 'equilibrada',
        difficulty: 'normal',
        initialBudget: 30_000_000,
        durationYears: 3,
        parcelCount: 6,
        seed: 2024,
        startYear: 2026,
      },
      DEFAULT_PARAMS,
    )
    localStorage.setItem(`ecofinca:tutorial:${game.id}`, '1')
    const utils = renderApp(`/juego/${game.id}`)
    await screen.findByTestId('advance-month')
    return { game, ...utils }
  }

  it('muestra la barra superior con datos reales y el mapa interactivo', async () => {
    const { game } = await openGame()
    expect(screen.getByText('La Esperanza')).toBeInTheDocument()
    expect(screen.getByText('Enero 2026')).toBeInTheDocument()
    for (const p of game.parcels) expect(screen.getByTestId(`parcel-${p.id}`)).toBeInTheDocument()
  })

  it('seleccionar una parcela muestra su información y acciones', async () => {
    await openGame()
    fireEvent.click(screen.getByTestId('parcel-P-03'))
    const panel = await screen.findByTestId('parcel-panel')
    expect(within(panel).getByText(/Lote 3/)).toBeInTheDocument()
    expect(within(panel).getByText('Fertilidad del suelo')).toBeInTheDocument()
    expect(within(panel).getByTestId('parcel-actions')).toBeInTheDocument()
  })

  it('ejecutar una acción modifica el estado y descuenta recursos', async () => {
    const user = userEvent.setup()
    const { game } = await openGame()
    const target = game.parcels.find((p) => !p.practices.cover.active)!
    fireEvent.click(screen.getByTestId(`parcel-${target.id}`))
    await user.click(await screen.findByRole('button', { name: `Cobertura vegetal en ${target.id}` }))
    await waitFor(() => {
      const state = useGameStore.getState().game
      expect(state?.parcels.find((p) => p.id === target.id)?.practices.cover.active).toBe(true)
      expect(state?.inventory.money).toBeLessThan(game.inventory.money)
    })
  })

  it('avanzar el mes muestra el resumen del turno', async () => {
    const user = userEvent.setup()
    await openGame()
    await user.click(screen.getByTestId('advance-month'))
    expect(await screen.findByTestId('turn-summary')).toBeInTheDocument()
    expect(useGameStore.getState().game?.turn).toBe(1)
  })

  it('la navegación entre secciones preserva la partida', async () => {
    const user = userEvent.setup()
    const { game } = await openGame()
    const nav = screen.getByRole('navigation', { name: 'Secciones del juego' })
    await user.click(within(nav).getByRole('link', { name: /^Mercado/ }))
    expect(await screen.findByRole('heading', { name: 'Mercado' })).toBeInTheDocument()
    await user.click(within(nav).getByRole('link', { name: /^Recursos/ }))
    expect(await screen.findByRole('heading', { name: 'Recursos' })).toBeInTheDocument()
    expect(useGameStore.getState().game?.id).toBe(game.id)
  })

  it('el menú de pausa ofrece guardar y salir', async () => {
    const user = userEvent.setup()
    await openGame()
    await user.click(screen.getByRole('button', { name: 'Pausar partida' }))
    const menu = await screen.findByTestId('pause-menu')
    expect(within(menu).getByRole('button', { name: /Reanudar/ })).toBeInTheDocument()
    expect(within(menu).getByRole('button', { name: /Guardar ahora/ })).toBeInTheDocument()
  })
})

describe('Componentes de indicadores', () => {
  it('IndicatorBar muestra el valor y su variación', () => {
    render(
      <TooltipProvider>
        <IndicatorBar indicator="erosion" value={72.4} delta={5} />
      </TooltipProvider>,
    )
    expect(screen.getByText('72')).toBeInTheDocument()
    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /Erosión: 72 de 100/ })).toBeInTheDocument()
  })

  it('ScoreRing es accesible', () => {
    render(<ScoreRing value={81} label="Sostenibilidad" />)
    expect(screen.getByRole('img', { name: 'Sostenibilidad: 81 de 100' })).toBeInTheDocument()
  })

  it('el resumen de turno lista los mensajes y el ciclo completado', async () => {
    const summary: TurnSummary = {
      turn: 11,
      month: 11,
      year: 2026,
      climate: makeGame().climate,
      before: { fertility: 60, moisture: 50, erosion: 20, waterQuality: 80, biodiversity: 45, contamination: 10, health: 80, money: 1_000_000, water: 500 },
      after: { fertility: 62, moisture: 55, erosion: 19, waterQuality: 81, biodiversity: 46, contamination: 9, health: 82, money: 2_000_000, water: 520 },
      messages: [{ severity: 'positivo', text: '¡El café de Lote 1 (P-01) está listo para cosechar!' }],
      newEvents: [],
      harvestReady: ['P-01'],
      cycleCompleted: {
        cycle: 1,
        startTurn: 0,
        endTurn: 11,
        production: 3200,
        income: 60_000_000,
        expenses: 40_000_000,
        profit: 20_000_000,
        waterUsed: 900,
        indicators: { fertility: 62, moisture: 55, erosion: 19, waterQuality: 81, biodiversity: 46, contamination: 9, health: 82 },
        scores: { productivity: 70, profitability: 75, sustainability: 80, global: 75.5, classification: 'Buena' },
      },
      scores: { productivity: 70, profitability: 75, sustainability: 80, global: 75.5, classification: 'Buena' },
      gameOver: false,
    }
    await act(async () => {
      render(
        <TooltipProvider>
          <TurnSummaryDialog summary={summary} open onClose={() => {}} onEvaluate={() => {}} />
        </TooltipProvider>,
      )
    })
    expect(screen.getByText(/listo para cosechar/)).toBeInTheDocument()
    expect(screen.getByText(/Ciclo productivo 1 completado/)).toBeInTheDocument()
  })
})
