import { describe, expect, it } from 'vitest'
import { advanceTurn, createGame, DEFAULT_PARAMS, farmIndicators, generateClimate, NEUTRAL_MODIFIERS, SCENARIOS } from '@/engine'
import type { GameState } from '@/engine'
import { makeConfig, makeGame } from '../helpers'

function run(state: GameState, months: number): GameState {
  let s = state
  for (let i = 0; i < months && s.status === 'activo'; i++) s = advanceTurn(s).state
  return s
}

function assertInRange(state: GameState) {
  for (const p of state.parcels) {
    for (const v of [p.soil.fertility, p.soil.moisture, p.soil.erosion, p.soil.contamination, p.biodiversity]) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
    for (const v of Object.values(p.pests)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
    if (p.crop) {
      expect(p.crop.health).toBeGreaterThanOrEqual(0)
      expect(p.crop.health).toBeLessThanOrEqual(100)
      expect(p.crop.estimatedYieldKg).toBeGreaterThanOrEqual(0)
    }
  }
  const env = state.environment
  for (const v of [env.waterQuality, env.contamination, env.biodiversity, env.streamFlow]) {
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThanOrEqual(100)
  }
  expect(state.inventory.agua).toBeGreaterThanOrEqual(0)
  expect(state.inventory.agua).toBeLessThanOrEqual(state.infrastructure.reservoirCapacity)
  expect(state.inventory.cafe).toBeGreaterThanOrEqual(0)
}

describe('Avance de turnos', () => {
  it('avanza el calendario, registra el historial y reinicia los jornales', () => {
    const game = makeGame()
    const { state, summary } = advanceTurn(game)
    expect(state.turn).toBe(1)
    expect(state.calendar).toEqual({ month: 1, year: 2026 })
    expect(state.history).toHaveLength(1)
    expect(state.history[0]?.turn).toBe(0)
    expect(summary.turn).toBe(0)
    expect(summary.climate).toEqual(game.climate)
    expect(state.labor.available).toBe(DEFAULT_PARAMS.baseLabor)
  })

  it('cobra los costos fijos cada mes', () => {
    const game = makeGame()
    const { state } = advanceTurn(game)
    const fixed = state.transactions.filter((t) => t.category === 'costos-fijos')
    expect(fixed.length).toBeGreaterThan(0)
    expect(state.inventory.money).toBeLessThan(game.inventory.money)
  })

  it('es determinista: misma semilla → mismos resultados', () => {
    const a = run(makeGame(), 18)
    const b = run(makeGame(), 18)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('semillas distintas producen climas distintos', () => {
    const a = run(makeGame({ seed: 1 }), 12)
    const b = run(makeGame({ seed: 2 }), 12)
    expect(a.history.map((h) => h.precipitation)).not.toEqual(b.history.map((h) => h.precipitation))
  })

  it('mantiene todas las variables en rango durante varios ciclos', () => {
    for (const scenarioId of ['equilibrada', 'suelo-degradado', 'crisis-hidrica'] as const) {
      let s = makeGame({ scenarioId, difficulty: 'dificil' })
      for (let i = 0; i < 30 && s.status === 'activo'; i++) {
        s = advanceTurn(s).state
        assertInRange(s)
      }
    }
  })

  it('produce un resumen con cambios antes/después', () => {
    const { summary, state } = advanceTurn(makeGame())
    expect(summary.before.money).toBeGreaterThan(summary.after.money)
    expect(summary.after.fertility).toBeCloseTo(farmIndicators(state).fertility, 1)
    expect(summary.scores.global).toBeGreaterThan(0)
  })

  it('los cultivos avanzan de etapa con el tiempo', () => {
    const game = makeGame()
    const later = run(game, 6)
    const changed = game.parcels.filter((p) => {
      const after = later.parcels.find((x) => x.id === p.id)
      return p.crop && after?.crop && (after.crop.stage !== p.crop.stage || after.crop.harvests !== p.crop.harvests)
    })
    expect(changed.length).toBeGreaterThan(0)
  })

  it('el cultivo no cosechado se pierde al cerrar la ventana de cosecha', () => {
    let s = makeGame()
    let lost = false
    for (let i = 0; i < 12 && !lost; i++) {
      const r = advanceTurn(s)
      lost = r.summary.messages.some((m) => m.text.includes('Se perdió la cosecha'))
      s = r.state
    }
    expect(lost).toBe(true)
  })

  it('no permite avanzar una partida terminada', () => {
    const game = { ...makeGame(), status: 'finalizado' as const }
    expect(() => advanceTurn(game)).toThrow()
  })
})

describe('Sistema climático', () => {
  it('es reproducible y varía con el escenario', () => {
    const input = {
      seed: 99,
      turn: 4,
      month: 4,
      scenario: SCENARIOS.equilibrada.climate,
      difficulty: 'normal' as const,
      modifiers: NEUTRAL_MODIFIERS,
    }
    expect(generateClimate(input)).toEqual(generateClimate(input))
    const crisis = generateClimate({ ...input, scenario: SCENARIOS['crisis-hidrica'].climate })
    expect(crisis.precipitation).toBeLessThan(generateClimate(input).precipitation)
    expect(crisis.temperature).toBeGreaterThan(generateClimate(input).temperature)
  })

  it('los modificadores de eventos alteran el clima (sequía)', () => {
    const input = {
      seed: 5,
      turn: 0,
      month: 3,
      scenario: SCENARIOS.equilibrada.climate,
      difficulty: 'normal' as const,
      modifiers: NEUTRAL_MODIFIERS,
    }
    const normal = generateClimate(input)
    const drought = generateClimate({ ...input, modifiers: { ...NEUTRAL_MODIFIERS, precipitationMult: 0.4, temperatureAdd: 1.5 } })
    expect(drought.precipitation).toBeCloseTo(normal.precipitation * 0.4, -1)
    expect(drought.temperature).toBeGreaterThan(normal.temperature)
    expect(drought.droughtRisk).toBeGreaterThan(normal.droughtRisk)
  })

  it('la crisis hídrica seca los suelos más que la finca equilibrada', () => {
    const eq = run(createGame(makeConfig({ scenarioId: 'equilibrada' })), 12)
    const crisis = run(createGame(makeConfig({ scenarioId: 'crisis-hidrica' })), 12)
    const avg = (s: GameState) => s.history.reduce((a, h) => a + h.moisture, 0) / s.history.length
    expect(avg(crisis)).toBeLessThan(avg(eq))
  })
})

describe('Configuración de partida', () => {
  it('cada escenario genera condiciones iniciales distintas', () => {
    const eq = makeGame({ scenarioId: 'equilibrada' })
    const deg = makeGame({ scenarioId: 'suelo-degradado', initialBudget: 24_000_000 })
    const crisis = makeGame({ scenarioId: 'crisis-hidrica', initialBudget: 24_000_000 })
    expect(farmIndicators(deg).fertility).toBeLessThan(farmIndicators(eq).fertility)
    expect(farmIndicators(deg).erosion).toBeGreaterThan(farmIndicators(eq).erosion)
    expect(crisis.inventory.agua).toBeLessThan(eq.inventory.agua)
    expect(farmIndicators(crisis).moisture).toBeLessThan(farmIndicators(eq).moisture)
  })

  it('el número de parcelas, el presupuesto y la duración se aplican', () => {
    const g = makeGame({ parcelCount: 9, initialBudget: 50_000_000, durationYears: 2 })
    expect(g.parcels).toHaveLength(9)
    expect(g.inventory.money).toBe(50_000_000)
    expect(g.config.durationYears).toBe(2)
    const area = g.parcels.reduce((a, p) => a + p.areaHa, 0)
    expect(area).toBeCloseTo(3.6, 1)
  })

  it('rechaza configuraciones inválidas con Zod', () => {
    expect(() => createGame(makeConfig({ farmName: 'X' }))).toThrow()
    expect(() => createGame(makeConfig({ initialBudget: 100 }))).toThrow()
  })

  it('la finca suma 5 hectáreas', () => {
    const g = makeGame()
    const env = g.environment
    const total = g.parcels.reduce((a, p) => a + p.areaHa, 0) + env.forestHa + env.degradedHa + env.riparianHa + env.infrastructureHa
    expect(total).toBeCloseTo(5, 1)
  })
})
