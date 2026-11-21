import { describe, expect, it } from 'vitest'
import {
  advanceTurn,
  applyAction,
  compareStrategies,
  DEFAULT_PARAMS,
  farmIndicators,
  parcelYieldEstimate,
} from '@/engine'
import type { GameAction, GameState } from '@/engine'
import { makeConfig, makeGame, parcel } from '../helpers'

function act(state: GameState, action: GameAction): GameState {
  const r = applyAction(state, action)
  if (!r.ok) throw new Error(`${action.type}: ${r.error}`)
  return r.state
}

describe('Integración: ciclo productivo completo', () => {
  it('preparar → sembrar → crecer → cosechar → vender en un lote nuevo', () => {
    let s = makeGame({ durationYears: 4, initialBudget: 60_000_000 })
    const id = 'P-02'
    s = act(s, { type: 'preparar', parcelId: id })
    s = act(s, { type: 'cobertura', parcelId: id })
    s = advanceTurn(s).state
    s = act(s, { type: 'comprar', item: 'colinos', quantity: 5000 })
    s = act(s, { type: 'sembrar', parcelId: id, variety: 'cenicafe1' })

    const stagesSeen = new Set<string>()
    let harvestedKg = 0
    for (let month = 0; month < 30 && s.status === 'activo'; month++) {
      const p = parcel(s, id)
      if (p.crop) stagesSeen.add(p.crop.stage)
      // Manejo básico: fertilizar cada 4 meses, regar si está seco, mantener.
      if (p.crop?.variety && month % 4 === 0) {
        s = act(s, { type: 'comprar', item: 'abonoOrganico', quantity: 20 })
        s = act(s, { type: 'fertilizar', parcelId: id, fertilizer: 'organico', dose: 'recomendada' })
      }
      if (p.crop?.variety && p.soil.moisture < 35 && s.inventory.agua > 150) s = act(s, { type: 'regar', parcelId: id })
      if (p.crop?.stage === 'cosecha') {
        const before = s.inventory.cafe
        s = act(s, { type: 'cosechar', parcelId: id })
        harvestedKg += s.inventory.cafe - before
      }
      // Los demás lotes se cosechan y el café se vende para mantener la liquidez.
      for (const other of s.parcels) {
        if (other.id !== id && other.crop?.stage === 'cosecha') s = act(s, { type: 'cosechar', parcelId: other.id })
      }
      if (s.inventory.cafe > 0) s = act(s, { type: 'vender', quantityKg: s.inventory.cafe })
      s = advanceTurn(s).state
    }

    expect([...stagesSeen]).toEqual(
      expect.arrayContaining(['establecimiento', 'vegetativo', 'floracion', 'fructificacion', 'maduracion', 'cosecha']),
    )
    expect(s.status).toBe('activo')
    expect(harvestedKg).toBeGreaterThan(0)
    expect(parcel(s, id).crop?.harvests).toBeGreaterThanOrEqual(1)
    expect(parcel(s, id).totalProductionKg).toBeCloseTo(harvestedKg, 0)
    expect(s.transactions.some((t) => t.category === 'venta')).toBe(true)
  })

  it('una partida completa termina con evaluación final', () => {
    let s = makeGame({ durationYears: 1 })
    for (let i = 0; i < 12 && s.status === 'activo'; i++) {
      for (const p of s.parcels) {
        if (p.crop?.stage === 'cosecha') {
          const r = applyAction(s, { type: 'cosechar', parcelId: p.id })
          if (r.ok) s = r.state
        }
      }
      if (s.inventory.cafe > 0) s = act(s, { type: 'vender', quantityKg: s.inventory.cafe })
      s = advanceTurn(s).state
    }
    expect(s.turn).toBe(12)
    expect(['victoria', 'finalizado', 'derrota']).toContain(s.status)
    expect(s.outcome).not.toBeNull()
    expect(s.cycles).toHaveLength(1)
    expect(s.cycles[0]?.production).toBeGreaterThan(0)
    expect(s.cycles[0]?.income).toBeGreaterThan(0)
  })

  it('los costos de producción y los ingresos se reflejan en el historial', () => {
    let s = makeGame()
    const p = s.parcels.find((x) => x.crop?.variety)!
    s = act(s, { type: 'mantenimiento', parcelId: p.id })
    s = advanceTurn(s).state
    const record = s.history[0]!
    expect(record.expenses).toBeGreaterThan(0)
    expect(record.money).toBe(Math.round(s.inventory.money))
  })

  it('las prácticas de conservación reducen la erosión frente a no hacer nada', () => {
    const base = makeGame({ scenarioId: 'suelo-degradado', initialBudget: 40_000_000 })
    let conserved = base
    for (const p of base.parcels) {
      conserved = act(conserved, { type: 'cobertura', parcelId: p.id })
      conserved = act(conserved, { type: 'contratarJornales', quantity: 10 })
      conserved = act(conserved, { type: 'barreras', parcelId: p.id })
    }
    let passive = base
    for (let i = 0; i < 12; i++) {
      conserved = advanceTurn(conserved).state
      passive = advanceTurn(passive).state
    }
    expect(farmIndicators(conserved).erosion).toBeLessThan(farmIndicators(passive).erosion)
    expect(farmIndicators(conserved).erosion).toBeLessThan(farmIndicators(base).erosion)
  })

  it('el exceso de fertilizante químico aumenta la contaminación', () => {
    const base = makeGame({ initialBudget: 80_000_000 })
    let heavy = base
    for (let m = 0; m < 6; m++) {
      for (const p of heavy.parcels) {
        heavy = act(heavy, { type: 'comprar', item: 'fertilizanteQuimico', quantity: 6 })
        heavy = act(heavy, { type: 'fertilizar', parcelId: p.id, fertilizer: 'quimico', dose: 'alta' })
      }
      heavy = advanceTurn(heavy).state
    }
    let light = base
    for (let m = 0; m < 6; m++) light = advanceTurn(light).state
    expect(heavy.environment.contamination).toBeGreaterThan(light.environment.contamination)
    expect(heavy.environment.waterQuality).toBeLessThan(light.environment.waterQuality)
  })

  it('la estimación de cosecha responde a la fertilidad', () => {
    const s = makeGame()
    const p = s.parcels.find((x) => x.crop?.variety && x.crop.stage !== 'establecimiento')!
    const poor = structuredClone(s)
    const pp = poor.parcels.find((x) => x.id === p.id)!
    pp.soil.fertility = 10
    if (pp.crop) {
      pp.crop.reproFactorSum = 0
      pp.crop.reproMonths = 0
    }
    const rich = structuredClone(poor)
    rich.parcels.find((x) => x.id === p.id)!.soil.fertility = 80
    expect(parcelYieldEstimate(rich, rich.parcels.find((x) => x.id === p.id)!)).toBeGreaterThan(
      parcelYieldEstimate(poor, pp),
    )
  })
})

describe('Integración: comparación de estrategias', () => {
  it('usa las mismas condiciones iniciales y semilla para ambas estrategias', () => {
    const result = compareStrategies(makeConfig({ durationYears: 2 }), DEFAULT_PARAMS)
    const a = result.runs.convencional.history
    const b = result.runs.sostenible.history
    expect(a.map((h) => h.precipitation)).toEqual(b.map((h) => h.precipitation))
    expect(a.map((h) => h.temperature)).toEqual(b.map((h) => h.temperature))
  })

  it('la estrategia sostenible conserva mejor el ecosistema que la convencional', () => {
    const result = compareStrategies(makeConfig({ durationYears: 3 }), DEFAULT_PARAMS)
    const conv = result.runs.convencional
    const sus = result.runs.sostenible
    const lastConv = conv.history.at(-1)!
    const lastSus = sus.history.at(-1)!
    expect(sus.finalScores.sustainability).toBeGreaterThan(conv.finalScores.sustainability)
    expect(lastSus.erosion).toBeLessThan(lastConv.erosion)
    expect(lastSus.biodiversity).toBeGreaterThan(lastConv.biodiversity)
    expect(sus.waterUsed).toBeLessThan(conv.waterUsed)
    expect(sus.finalScores.global).toBeGreaterThan(conv.finalScores.global)
  })

  it('es reproducible', () => {
    const a = compareStrategies(makeConfig({ durationYears: 1 }), DEFAULT_PARAMS)
    const b = compareStrategies(makeConfig({ durationYears: 1 }), DEFAULT_PARAMS)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
