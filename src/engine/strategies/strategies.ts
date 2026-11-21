/**
 * Estrategias automáticas para la comparación controlada:
 *
 *   A. Producción convencional: maximiza producción a corto plazo con
 *      fertilizante químico abundante, control químico y riego por gravedad.
 *   B. Producción sostenible: abonos orgánicos, coberturas, barreras,
 *      sombrío, MIP, beneficio ecológico, riego eficiente y conservación.
 *
 * Ambas parten del mismo estado inicial y la misma semilla, por lo que
 * enfrentan exactamente el mismo clima.
 */

import { RESOURCES } from '../config/economy'
import { plantedParcels } from '../domain/selectors'
import type { GameAction, GameState, Parcel, ResourceId } from '../domain/types'
import { pendingEvents } from '../events/engine'
import { EVENT_BY_ID } from '../events/catalog'
import { DIFFICULTY } from '../config/model'
import { applyAction, getActionCost, validateAction } from '../rules/actions'
import { SCENARIOS } from '../scenarios/scenarios'
import { computeScores } from '../rules/scoring'

export type StrategyId = 'convencional' | 'sostenible'

export interface StrategyInfo {
  id: StrategyId
  name: string
  description: string
  practices: string[]
}

export const STRATEGIES: Record<StrategyId, StrategyInfo> = {
  convencional: {
    id: 'convencional',
    name: 'Producción convencional',
    description: 'Maximiza la producción inmediata con insumos de síntesis.',
    practices: [
      'Fertilizante químico en dosis alta cada 4 meses',
      'Control químico ante cualquier foco de plagas',
      'Riego por gravedad cuando el suelo se seca',
      'Sin coberturas, barreras ni conservación',
    ],
  },
  sostenible: {
    id: 'sostenible',
    name: 'Producción sostenible',
    description: 'Combina productividad con conservación del suelo, el agua y la biodiversidad.',
    practices: [
      'Abono orgánico y cobertura vegetal',
      'Barreras vivas y sombrío (agroforestería)',
      'Manejo integrado de plagas (MIP)',
      'Riego por goteo, beneficio ecológico y conservación de la ronda',
    ],
  },
}

type Step = (state: GameState) => GameState

/** Ejecuta una acción si es válida; si faltan insumos intenta comprarlos. */
function tryAction(state: GameState, action: GameAction): GameState {
  let current = state
  if (validateAction(current, action) !== null) {
    const cost = getActionCost(current, action)
    for (const [key, amount] of Object.entries(cost.resources) as [ResourceId, number][]) {
      const missing = Math.ceil(amount - current.inventory[key])
      if (missing > 0 && key !== 'agua') {
        const bought = applyAction(current, { type: 'comprar', item: key, quantity: missing })
        if (bought.ok) current = bought.state
      }
    }
  }
  const result = applyAction(current, action)
  return result.ok ? result.state : current
}

function monthlyFixedCost(state: GameState): number {
  return (
    state.params.monthlyFixedCost *
    SCENARIOS[state.config.scenarioId].fixedCostMult *
    DIFFICULTY[state.config.difficulty].fixedCost
  )
}

/** Reserva de liquidez: cuatro meses de costos fijos. */
function reserve(state: GameState): number {
  return monthlyFixedCost(state) * 4
}

function canSpend(state: GameState, amount: number, factor = 1): boolean {
  return state.inventory.money - amount > reserve(state) * factor
}

function sellAll(state: GameState): GameState {
  if (state.inventory.cafe <= 0) return state
  return tryAction(state, { type: 'vender', quantityKg: state.inventory.cafe })
}

function respondEvents(state: GameState, prefer: string[]): GameState {
  let current = state
  for (const ev of pendingEvents(current)) {
    const def = EVENT_BY_ID[ev.eventId]
    if (!def) continue
    const ordered = [...def.responses].sort((a, b) => {
      const ia = prefer.indexOf(a.id)
      const ib = prefer.indexOf(b.id)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    for (const r of ordered) {
      const result = applyAction(current, { type: 'responderEvento', instanceId: ev.instanceId, responseId: r.id })
      if (result.ok) {
        current = result.state
        break
      }
    }
  }
  return current
}

function forEachParcel(state: GameState, fn: (s: GameState, p: Parcel) => GameState): GameState {
  let current = state
  for (const id of state.parcels.map((p) => p.id)) {
    const parcel = current.parcels.find((p) => p.id === id)
    if (parcel) current = fn(current, parcel)
  }
  return current
}

function harvestAndReplant(state: GameState, variety: 'castillo' | 'cenicafe1'): GameState {
  return forEachParcel(state, (s, p) => {
    if (p.crop?.stage === 'cosecha') return tryAction(s, { type: 'cosechar', parcelId: p.id })
    if (p.landUse === 'barbecho' && !p.crop && s.inventory.money > reserve(s) * 2)
      return tryAction(s, { type: 'preparar', parcelId: p.id })
    if (p.crop?.stage === 'preparacion' && s.inventory.money > reserve(s))
      return tryAction(s, { type: 'sembrar', parcelId: p.id, variety })
    return s
  })
}

export const conventionalStep: Step = (input) => {
  let s = respondEvents(input, ['quimico', 'fungicida', 'carrotanque', 'aceptar', 'ignorar', 'multa', 'rechazar'])
  s = harvestAndReplant(s, 'castillo')
  s = sellAll(s)
  s = forEachParcel(s, (st, p) => {
    if (!p.crop?.variety) return st
    let next = st
    if (st.turn % 4 === 0 && st.inventory.money > reserve(st)) {
      next = tryAction(next, { type: 'fertilizar', parcelId: p.id, fertilizer: 'quimico', dose: 'alta' })
    }
    const pest = Math.max(p.pests.broca, p.pests.roya, p.pests['mancha-hierro'])
    if (pest > 8 && next.inventory.money > reserve(next)) {
      next = tryAction(next, { type: 'controlPlagas', parcelId: p.id, method: 'quimico' })
    }
    if (p.soil.moisture < 40 && next.inventory.agua > RESOURCES.agua.criticalLevel) {
      next = tryAction(next, { type: 'regar', parcelId: p.id })
    }
    return next
  })
  return s
}

const INVESTMENT_PRIORITY: Record<GameState['config']['scenarioId'], GameAction[]> = {
  equilibrada: [
    { type: 'conservarFuentes' },
    { type: 'invertir', investment: 'beneficioEcologico' },
    { type: 'invertir', investment: 'riegoGoteo' },
    { type: 'invertir', investment: 'certificacion' },
  ],
  'suelo-degradado': [
    { type: 'conservarFuentes' },
    { type: 'restaurarArea' },
    { type: 'invertir', investment: 'beneficioEcologico' },
    { type: 'invertir', investment: 'certificacion' },
  ],
  'crisis-hidrica': [
    { type: 'invertir', investment: 'riegoGoteo' },
    { type: 'conservarFuentes' },
    { type: 'invertir', investment: 'beneficioEcologico' },
    { type: 'restaurarArea' },
    { type: 'invertir', investment: 'certificacion' },
  ],
}

export const sustainableStep: Step = (input) => {
  let s = respondEvents(input, ['mip', 'nutricion', 'mantillo', 'acuerdo', 'drenajes', 'compost', 'asistir', 'aceptar', 'plan', 'aviturismo', 'sombrio-transitorio', 'ahorro', 'ignorar', 'rechazar', 'multa'])
  s = harvestAndReplant(s, 'cenicafe1')
  s = sellAll(s)

  // 1. Nutrición, sanidad y agua de los cafetales (capital productivo).
  s = forEachParcel(s, (st, p) => {
    if (!p.crop?.variety) return st
    let next = st
    if (p.soil.fertility < 40 && canSpend(next, 600_000))
      next = tryAction(next, { type: 'fertilizar', parcelId: p.id, fertilizer: 'quimico', dose: 'baja' })
    else if (p.soil.fertility < 66 && canSpend(next, 600_000))
      next = tryAction(next, { type: 'fertilizar', parcelId: p.id, fertilizer: 'organico', dose: 'recomendada' })
    const pest = Math.max(p.pests.broca, p.pests.roya, p.pests['mancha-hierro'])
    if (pest > 12) next = tryAction(next, { type: 'controlPlagas', parcelId: p.id, method: 'integrado' })
    else if (p.crop.health < 75 && canSpend(next, 200_000)) next = tryAction(next, { type: 'mantenimiento', parcelId: p.id })
    if (p.soil.moisture < 35 && next.inventory.agua > RESOURCES.agua.criticalLevel)
      next = tryAction(next, { type: 'regar', parcelId: p.id })
    return next
  })

  // 2. Conservación de suelos: máximo dos prácticas nuevas por mes, empezando por los lotes más erosionados.
  let budget = 2
  const byErosion = [...s.parcels].sort((a, b) => b.soil.erosion - a.soil.erosion).map((p) => p.id)
  for (const id of byErosion) {
    if (budget <= 0) break
    const p = s.parcels.find((x) => x.id === id)
    if (!p) continue
    const candidates: GameAction[] = []
    if (p.landUse !== 'reforestacion' && !p.practices.cover.active) candidates.push({ type: 'cobertura', parcelId: id })
    if (p.slope > 0.35 && !p.practices.barrier.active) candidates.push({ type: 'barreras', parcelId: id })
    if (p.landUse === 'cafe' && p.crop?.variety && !p.practices.shade.active && s.turn >= 6)
      candidates.push({ type: 'sombrio', parcelId: id })
    for (const action of candidates) {
      if (budget <= 0) break
      const cost = getActionCost(s, action)
      if (!canSpend(s, cost.money) || validateAction(s, action) !== null) continue
      s = tryAction(s, action)
      budget--
    }
  }

  // 3. Inversiones de finca: una por mes, solo con holgura financiera.
  for (const action of INVESTMENT_PRIORITY[s.config.scenarioId]) {
    if (validateAction(s, action) !== null) continue
    const cost = getActionCost(s, action)
    if (canSpend(s, cost.money, 1.5)) {
      s = tryAction(s, action)
      break
    }
  }
  return s
}

export const STRATEGY_STEPS: Record<StrategyId, Step> = {
  convencional: conventionalStep,
  sostenible: sustainableStep,
}

/** Resumen de una corrida para mostrar en la interfaz. */
export function strategySnapshot(state: GameState) {
  return {
    scores: computeScores(state),
    planted: plantedParcels(state).length,
  }
}
