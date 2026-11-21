/**
 * Comparación controlada de estrategias: ejecuta la simulación con las
 * mismas condiciones iniciales y la misma semilla para cada estrategia.
 */

import type { GameConfig, GameState, ModelParams, MonthlyRecord, Scores } from '../domain/types'
import { totalsFromTransactions } from '../formulas/economy'
import { evaluateObjectives } from '../rules/objectives'
import { computeScores } from '../rules/scoring'
import { createGame } from '../scenarios/create-game'
import { advanceTurn } from '../simulation/turn'
import { STRATEGY_STEPS, type StrategyId } from './strategies'

export interface StrategyRun {
  strategy: StrategyId
  history: MonthlyRecord[]
  finalScores: Scores
  totalProduction: number
  income: number
  expenses: number
  profit: number
  waterUsed: number
  chemicalFertilizer: number
  objectivesAchieved: number
  objectivesTotal: number
  status: GameState['status']
}

export function runStrategy(initial: GameState, strategy: StrategyId, months: number): StrategyRun {
  const step = STRATEGY_STEPS[strategy]
  let state = initial
  let chemical = 0
  for (let i = 0; i < months && state.status === 'activo'; i++) {
    state = step(state)
    chemical += state.tracker.chemicalFertilizerBultos
    state = advanceTurn(state).state
  }
  const totals = totalsFromTransactions(state.transactions)
  const objectives = evaluateObjectives(state)
  return {
    strategy,
    history: state.history,
    finalScores: computeScores(state),
    totalProduction: state.counters.totalProductionKg,
    income: totals.income,
    expenses: totals.expenses,
    profit: totals.profit,
    waterUsed: state.counters.totalWaterUsed,
    chemicalFertilizer: chemical,
    objectivesAchieved: objectives.filter((o) => o.achieved).length,
    objectivesTotal: objectives.length,
    status: state.status,
  }
}

export interface ComparisonResult {
  months: number
  seed: number
  runs: Record<StrategyId, StrategyRun>
}

/** Compara ambas estrategias partiendo del mismo estado inicial. */
export function compareStrategies(config: GameConfig, params: ModelParams, months?: number): ComparisonResult {
  const initial = createGame(config, params)
  const total = months ?? config.durationYears * 12
  return {
    months: total,
    seed: config.seed,
    runs: {
      convencional: runStrategy(initial, 'convencional', total),
      sostenible: runStrategy(initial, 'sostenible', total),
    },
  }
}
