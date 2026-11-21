import { describe, expect, it } from 'vitest'
import {
  advanceTurn,
  aggregateModifiers,
  applyAction,
  checkFailure,
  combineScores,
  computeScores,
  EVENT_BY_ID,
  EVENT_CATALOG,
  evaluateObjectives,
  finishGame,
  generateRecommendations,
  pendingEvents,
  resolvePendingDefaults,
  rollEvents,
  startEvent,
} from '@/engine'
import type { GameState } from '@/engine'
import { makeGame, withParcel } from '../helpers'

function withEvent(state: GameState, eventId: string): GameState {
  const draft = structuredClone(state)
  const def = EVENT_BY_ID[eventId]
  if (!def) throw new Error(eventId)
  startEvent(draft, def)
  return draft
}

describe('Sistema de eventos', () => {
  it('todos los eventos tienen nombre, descripción, condición, probabilidad, impacto, duración y respuestas', () => {
    expect(EVENT_CATALOG.length).toBeGreaterThanOrEqual(7)
    for (const e of EVENT_CATALOG) {
      expect(e.name).toBeTruthy()
      expect(e.description).toBeTruthy()
      expect(e.conditionText).toBeTruthy()
      expect(e.probabilityText).toBeTruthy()
      expect(e.impactText).toBeTruthy()
      expect(e.durationMonths).toBeGreaterThan(0)
      expect(e.responses.length).toBeGreaterThan(0)
      const p = e.probability(makeGame())
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })

  it('la sequía modifica precipitación, temperatura y caudal', () => {
    const game = withEvent(makeGame(), 'sequia-prolongada')
    const mods = aggregateModifiers(game.activeEvents)
    expect(mods.precipitationMult).toBeCloseTo(0.4, 6)
    expect(mods.temperatureAdd).toBeCloseTo(1.5, 6)
    expect(mods.streamFlowMult).toBeCloseTo(0.7, 6)
  })

  it('el brote de broca afecta la parcela objetivo y sus vecinas', () => {
    const base = makeGame()
    const game = withEvent(base, 'brote-broca')
    const ev = game.activeEvents[0]!
    expect(ev.targetParcelId).not.toBeNull()
    const before = base.parcels.find((p) => p.id === ev.targetParcelId)!
    const after = game.parcels.find((p) => p.id === ev.targetParcelId)!
    expect(after.pests.broca).toBeCloseTo(Math.min(100, before.pests.broca + 25), 6)
  })

  it('responder un evento cobra su costo y aplica sus efectos', () => {
    const game = withEvent(makeGame(), 'brote-broca')
    const ev = game.activeEvents[0]!
    const target = game.parcels.find((p) => p.id === ev.targetParcelId)!
    const result = applyAction(game, { type: 'responderEvento', instanceId: ev.instanceId, responseId: 'mip' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.inventory.money).toBe(game.inventory.money - 400_000)
    expect(result.state.parcels.find((p) => p.id === target.id)!.pests.broca).toBeLessThan(target.pests.broca)
    expect(pendingEvents(result.state)).toHaveLength(0)
  })

  it('las respuestas pueden cambiar los modificadores del evento', () => {
    const game = withEvent(makeGame(), 'lluvias-intensas')
    const ev = game.activeEvents[0]!
    const result = applyAction(game, { type: 'responderEvento', instanceId: ev.instanceId, responseId: 'drenajes' })
    if (!result.ok) throw new Error(result.error)
    expect(aggregateModifiers(result.state.activeEvents).erosionMult).toBeCloseTo(0.85, 6)
  })

  it('si el jugador no decide, se aplica la respuesta por defecto', () => {
    const game = structuredClone(withEvent(makeGame(), 'inspeccion-ambiental'))
    const money = game.inventory.money
    resolvePendingDefaults(game)
    expect(pendingEvents(game)).toHaveLength(0)
    expect(game.inventory.money).toBe(money - 3_000_000)
    expect(game.transactions.at(-1)?.category).toBe('multa')
  })

  it('los eventos expiran después de su duración', () => {
    let game = withEvent(makeGame(), 'alza-insumos')
    const ev = game.activeEvents[0]!
    const r = applyAction(game, { type: 'responderEvento', instanceId: ev.instanceId, responseId: 'ignorar' })
    if (!r.ok) throw new Error(r.error)
    game = r.state
    for (let i = 0; i < 4; i++) game = advanceTurn(game).state
    expect(game.activeEvents.find((e) => e.eventId === 'alza-insumos')).toBeUndefined()
  })

  it('respeta condiciones: la inspección solo ocurre con contaminación alta', () => {
    const clean = makeGame()
    expect(EVENT_BY_ID['inspeccion-ambiental']!.condition(clean)).toBe(false)
    const dirty = { ...clean, environment: { ...clean.environment, contamination: 60 } }
    expect(EVENT_BY_ID['inspeccion-ambiental']!.condition(dirty)).toBe(true)
  })

  it('la generación de eventos es determinista para una semilla', () => {
    const a = structuredClone(makeGame())
    const b = structuredClone(makeGame())
    expect(rollEvents(a)).toEqual(rollEvents(b))
  })

  it('a lo largo de una partida ocurren eventos', () => {
    let s = makeGame()
    for (let i = 0; i < 24 && s.status === 'activo'; i++) s = advanceTurn(s).state
    expect(s.eventLog.length).toBeGreaterThan(0)
  })
})

describe('Puntuación', () => {
  it('aplica los pesos 0,30 / 0,30 / 0,40', () => {
    const s = combineScores(80, 70, 90)
    expect(s.global).toBeCloseTo(80 * 0.3 + 70 * 0.3 + 90 * 0.4, 1)
    expect(s.classification).toBe('Excelente')
  })

  it('no permite clasificación excelente con sostenibilidad baja', () => {
    const destructive = combineScores(100, 100, 45)
    expect(destructive.global).toBeLessThanOrEqual(64)
    expect(destructive.classification).not.toBe('Excelente')
    const collapse = combineScores(100, 100, 30)
    expect(collapse.global).toBeLessThanOrEqual(49)
    expect(collapse.classification).toBe('Deficiente')
  })

  it('calcula los índices a partir del estado real', () => {
    const scores = computeScores(makeGame())
    for (const v of [scores.productivity, scores.profitability, scores.sustainability, scores.global]) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
  })

  it('degradar el ecosistema reduce la sostenibilidad', () => {
    const game = makeGame()
    const degraded = structuredClone(game)
    for (const p of degraded.parcels) {
      p.soil.erosion = 90
      p.soil.fertility = 10
    }
    degraded.environment.waterQuality = 20
    degraded.environment.contamination = 80
    expect(computeScores(degraded).sustainability).toBeLessThan(computeScores(game).sustainability)
  })
})

describe('Condiciones de victoria y fracaso', () => {
  it('detecta la quiebra por saldo negativo prolongado', () => {
    const game = makeGame()
    expect(checkFailure(game).reason).toBeNull()
    const broke = { ...game, counters: { ...game.counters, negativeMoneyMonths: 3 } }
    expect(checkFailure(broke).reason).toBe('quiebra')
    const debt = { ...game, inventory: { ...game.inventory, money: -game.config.initialBudget } }
    expect(checkFailure(debt).reason).toBe('quiebra')
  })

  it('detecta el colapso ecológico', () => {
    const game = makeGame()
    const collapsed = { ...game, counters: { ...game.counters, collapseMonths: 3 } }
    expect(checkFailure(collapsed).reason).toBe('colapso')
  })

  it('la quiebra termina la partida con derrota al avanzar el turno', () => {
    const base = makeGame()
    const game = { ...base, inventory: { ...base.inventory, money: -1 }, counters: { ...base.counters, negativeMoneyMonths: 2 } }
    const { state, summary } = advanceTurn(game)
    expect(state.status).toBe('derrota')
    expect(state.outcome?.victory).toBe(false)
    expect(summary.gameOver).toBe(true)
  })

  it('evalúa los objetivos del escenario', () => {
    const objectives = evaluateObjectives(makeGame())
    expect(objectives).toHaveLength(3)
    for (const o of objectives) {
      expect(o.progress).toBeGreaterThanOrEqual(0)
      expect(o.progress).toBeLessThanOrEqual(1)
    }
  })

  it('finalizar la partida genera evaluación y recomendaciones', () => {
    const game = withParcel(makeGame(), 'P-01', (p) => {
      p.soil.erosion = 80
    })
    const ended = finishGame(game)
    expect(['victoria', 'finalizado']).toContain(ended.status)
    expect(ended.outcome?.scores).toBeDefined()
    expect(ended.outcome?.objectives.length).toBe(3)
    expect(Array.isArray(ended.outcome?.recommendations)).toBe(true)
  })

  it('las recomendaciones responden al estado', () => {
    const base = makeGame()
    const eroded = structuredClone(base)
    for (const p of eroded.parcels) p.soil.erosion = 80
    const ids = generateRecommendations(eroded).map((r) => r.id)
    expect(ids).toContain('erosion-alta')
  })
})
