/**
 * EcoFinca Engine — avance de turno mensual.
 *
 * Orden de ejecución determinista de `advanceTurn`:
 *
 *   0. Resolver decisiones pendientes con la respuesta por defecto.
 *   1. Agregar modificadores de eventos activos.
 *   2. Recursos hídricos: caudal de la quebrada y balance del reservorio.
 *   3. Suelo por parcela: humedad, erosión, fertilidad, contaminación del suelo.
 *   4. Cultivos: salud, etapas fenológicas, producción estimada.
 *   5. Plagas y enfermedades: crecimiento, propagación y brotes.
 *   6. Impactos ambientales: contaminación, calidad del agua, biodiversidad.
 *   7. Economía: costos fijos, mantenimiento, almacenamiento, compost, mercado.
 *   8. Registro: historial mensual y evaluación de ciclo (cada 12 meses).
 *   9. Calendario: avanzar al mes siguiente.
 *  10. Eventos: reducir duración de los activos y generar nuevos.
 *  11. Clima del nuevo mes (con modificadores de eventos).
 *  12. Reinicio mensual: jornales, acciones por parcela, acumuladores.
 *  13. Condiciones de victoria y fracaso.
 */

import { DIFFICULTY, FAILURE } from '../config/model'
import { agriculturalArea, farmIndicators, harvestReadyParcels } from '../domain/selectors'
import type {
  CycleRecord,
  FinalEvaluation,
  GameState,
  Indicators,
  MonthlyRecord,
  TurnMessage,
  TurnSummary,
} from '../domain/types'
import { aggregateModifiers, resolvePendingDefaults, rollEvents, tickEvents } from '../events/engine'
import { coffeePrice, totalsFromTransactions } from '../formulas/economy'
import { calendarForTurn, cycleForTurn, MONTHS_PER_CYCLE } from '../lib/calendar'
import { mean, round, sum } from '../lib/math'
import { checkFailure, evaluateObjectives, totalMonths } from '../rules/objectives'
import { generateRecommendations } from '../rules/recommendations'
import { computeScores, scoreCycle } from '../rules/scoring'
import { SCENARIOS } from '../scenarios/scenarios'
import { generateClimate } from './climate'
import { stepEconomy, stepEnvironment, stepParcels, stepPests, stepWaterResources } from './steps'

function roundIndicators(ind: Indicators): Indicators {
  return {
    fertility: round(ind.fertility, 2),
    moisture: round(ind.moisture, 2),
    erosion: round(ind.erosion, 2),
    waterQuality: round(ind.waterQuality, 2),
    biodiversity: round(ind.biodiversity, 2),
    contamination: round(ind.contamination, 2),
    health: round(ind.health, 2),
  }
}

export type RecordSource = Pick<
  GameState,
  | 'turn'
  | 'calendar'
  | 'climate'
  | 'tracker'
  | 'inventory'
  | 'counters'
  | 'parcels'
  | 'environment'
  | 'infrastructure'
  | 'params'
  | 'market'
  | 'history'
>

/** Construye el registro mensual del estado actual. */
export function buildRecord(state: RecordSource): MonthlyRecord {
  const totals = { income: state.counters.totalIncome, expenses: state.counters.totalExpenses }
  return {
    turn: state.turn,
    year: state.calendar.year,
    month: state.calendar.month,
    cycle: cycleForTurn(state.turn),
    ...roundIndicators(farmIndicators(state)),
    precipitation: state.climate.precipitation,
    temperature: state.climate.temperature,
    condition: state.climate.condition,
    waterUsed: round(state.tracker.waterUsed, 1),
    waterStock: round(state.inventory.agua, 1),
    production: round(state.tracker.harvestedKg, 1),
    income: Math.round(state.tracker.income),
    expenses: Math.round(state.tracker.expenses),
    money: Math.round(state.inventory.money),
    cumulativeProfit: Math.round(totals.income - totals.expenses),
    coffeePrice: coffeePrice(state),
    scores: computeScores(state),
  }
}

function snapshot(state: GameState): Indicators & { money: number; water: number } {
  return { ...roundIndicators(farmIndicators(state)), money: Math.round(state.inventory.money), water: round(state.inventory.agua, 1) }
}

function closeCycle(state: GameState): CycleRecord {
  const cycle = cycleForTurn(state.turn)
  const startTurn = state.turn - MONTHS_PER_CYCLE + 1
  const records = state.history.filter((h) => h.turn >= startTurn && h.turn <= state.turn)
  const totals = totalsFromTransactions(state.transactions, startTurn, state.turn)
  const base: Omit<CycleRecord, 'scores'> = {
    cycle,
    startTurn,
    endTurn: state.turn,
    production: round(sum(records.map((r) => r.production)), 1),
    income: totals.income,
    expenses: totals.expenses,
    profit: totals.profit,
    waterUsed: round(sum(records.map((r) => r.waterUsed)), 1),
    indicators: roundIndicators(farmIndicators(state)),
  }
  const avgCapacity = mean(records.map((r) => r.scores.productivity / 100))
  const sustainability = computeScores(state).sustainability
  return {
    ...base,
    scores: scoreCycle(base, agriculturalArea(state), state.params.baseYieldKgHa, avgCapacity, sustainability),
  }
}

/** Calcula la evaluación final de la partida. */
export function buildFinalEvaluation(state: GameState, reason: string, failed: boolean): FinalEvaluation {
  const scores = computeScores(state)
  const objectives = evaluateObjectives(state)
  const victory = !failed && objectives.every((o) => o.achieved) && scores.classification !== 'Deficiente'
  return {
    victory,
    reason,
    finishedTurn: state.turn,
    scores,
    objectives,
    recommendations: generateRecommendations(state, 8),
  }
}

/** Termina la partida anticipadamente (o al cumplirse la duración). */
export function finishGame(state: GameState, reason = 'La partida terminó por decisión del administrador.'): GameState {
  if (state.status !== 'activo') return state
  const draft = structuredClone(state)
  const outcome = buildFinalEvaluation(draft, reason, false)
  draft.outcome = outcome
  draft.status = outcome.victory ? 'victoria' : 'finalizado'
  return draft
}

function resetMonth(draft: GameState): void {
  const diff = DIFFICULTY[draft.config.difficulty]
  const mods = aggregateModifiers(draft.activeEvents)
  draft.labor = { available: Math.max(0, draft.params.baseLabor + diff.labor + mods.laborAdd), hired: 0 }
  for (const p of draft.parcels) {
    p.actionsThisTurn = []
    p.irrigationMm = 0
  }
  draft.tracker = {
    waterUsed: 0,
    harvestedKg: 0,
    income: 0,
    expenses: 0,
    processingLoad: 0,
    pesticideLoad: 0,
    chemicalFertilizerBultos: 0,
  }
}

export function climateForCurrentMonth(state: GameState) {
  const mods = aggregateModifiers(state.activeEvents)
  return generateClimate({
    seed: state.config.seed,
    turn: state.turn,
    month: state.calendar.month,
    scenario: SCENARIOS[state.config.scenarioId].climate,
    difficulty: state.config.difficulty,
    modifiers: mods,
  })
}

/** Procesa un mes completo y devuelve el nuevo estado y su resumen. */
export function advanceTurn(state: GameState): { state: GameState; summary: TurnSummary } {
  if (state.status !== 'activo') {
    throw new Error('No se puede avanzar: la partida ha terminado.')
  }
  const draft = structuredClone(state)
  const messages: TurnMessage[] = []
  const before = snapshot(draft)
  const processedClimate = draft.climate
  const processedTurn = draft.turn
  const processedCalendar = { ...draft.calendar }

  // 0. Decisiones pendientes
  for (const text of resolvePendingDefaults(draft)) messages.push({ severity: 'advertencia', text })

  // 1. Modificadores de eventos
  const mods = aggregateModifiers(draft.activeEvents)

  // 2. Recursos hídricos
  stepWaterResources(draft, mods, messages)

  // 3–4. Suelo y cultivos
  const stats = stepParcels(draft, mods, messages)

  // 5. Plagas
  stepPests(draft, mods, messages)

  // 6. Ambiente
  stepEnvironment(draft, stats)

  // 7. Economía
  stepEconomy(draft, messages)

  // 8. Registro
  const record = buildRecord(draft)
  draft.history.push(record)
  if (record.scores.sustainability < FAILURE.collapseSustainability) draft.counters.collapseMonths += 1
  else draft.counters.collapseMonths = 0

  let cycleCompleted: CycleRecord | null = null
  if ((draft.turn + 1) % MONTHS_PER_CYCLE === 0) {
    cycleCompleted = closeCycle(draft)
    draft.cycles.push(cycleCompleted)
    messages.push({
      severity: 'info',
      text: `Ciclo productivo ${cycleCompleted.cycle} completado: ${cycleCompleted.production.toLocaleString('es-CO')} kg producidos, clasificación ${cycleCompleted.scores.classification}.`,
    })
  }

  // 9. Calendario
  draft.turn += 1
  draft.calendar = calendarForTurn(draft.config.startYear, draft.turn)

  // 10. Eventos
  for (const name of tickEvents(draft)) messages.push({ severity: 'info', text: `Terminó: ${name}.` })
  const newEvents = draft.turn < totalMonths(draft) ? rollEvents(draft) : []
  for (const name of newEvents) messages.push({ severity: 'advertencia', text: `Nuevo evento: ${name}.` })

  // 11. Clima del nuevo mes
  draft.climate = climateForCurrentMonth(draft)

  // 12. Reinicio mensual
  resetMonth(draft)

  // 13. Victoria / fracaso
  const failure = checkFailure(draft)
  let gameOver = false
  if (failure.reason) {
    draft.outcome = buildFinalEvaluation(draft, failure.message, true)
    draft.status = 'derrota'
    gameOver = true
    messages.push({ severity: 'peligro', text: failure.message })
  } else if (draft.turn >= totalMonths(draft)) {
    const years = draft.config.durationYears
    const outcome = buildFinalEvaluation(
      draft,
      years === 1 ? 'Se completó el año de la partida.' : `Se completaron los ${years} años de la partida.`,
      false,
    )
    draft.outcome = outcome
    draft.status = outcome.victory ? 'victoria' : 'finalizado'
    gameOver = true
    messages.push({
      severity: outcome.victory ? 'positivo' : 'info',
      text: outcome.victory ? '¡Objetivos cumplidos! La partida terminó con victoria.' : 'La partida terminó.',
    })
  }

  const summary: TurnSummary = {
    turn: processedTurn,
    month: processedCalendar.month,
    year: processedCalendar.year,
    climate: processedClimate,
    before,
    after: snapshot(draft),
    messages,
    newEvents,
    harvestReady: harvestReadyParcels(draft).map((p) => p.id),
    cycleCompleted,
    scores: record.scores,
    gameOver,
  }
  return { state: draft, summary }
}
