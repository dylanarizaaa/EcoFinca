/**
 * Objetivos por escenario, condiciones de victoria y de fracaso.
 */

import { FAILURE } from '../config/model'
import { farmIndicators } from '../domain/selectors'
import type { GameState, ObjectiveStatus, ScenarioId } from '../domain/types'
import { computeEquity } from '../formulas/economy'
import { clamp01, round } from '../lib/math'
import { computeScores } from './scoring'

interface ObjectiveDefinition {
  id: string
  label: string
  description: string
  evaluate: (state: GameState) => { value: number; achieved: boolean; progress: number; current: string; target: string }
}

const pct = (v: number) => `${round(v, 0)}`
const cop = (v: number) => `${Math.round(v / 1000).toLocaleString('es-CO')} mil COP`

function atLeast(value: number, target: number) {
  return { value, achieved: value >= target, progress: clamp01(value / target), current: pct(value), target: `≥ ${target}` }
}

function atMost(value: number, target: number, start: number) {
  const progress = value <= target ? 1 : clamp01((start - value) / Math.max(1, start - target))
  return { value, achieved: value <= target, progress, current: pct(value), target: `≤ ${target}` }
}

const OBJECTIVES: Record<ScenarioId, ObjectiveDefinition[]> = {
  equilibrada: [
    {
      id: 'productividad',
      label: 'Productividad sostenida',
      description: 'Mantener el índice de productividad en 55 o más.',
      evaluate: (s) => atLeast(computeScores(s).productivity, 55),
    },
    {
      id: 'sostenibilidad',
      label: 'Ecosistema saludable',
      description: 'Mantener el índice de sostenibilidad en 65 o más.',
      evaluate: (s) => atLeast(computeScores(s).sustainability, 65),
    },
    {
      id: 'patrimonio',
      label: 'Patrimonio conservado',
      description: 'Terminar con un patrimonio mayor o igual al inicial.',
      evaluate: (s) => {
        const equity = computeEquity(s)
        const target = s.counters.initialEquity
        return {
          value: equity,
          achieved: equity >= target,
          progress: clamp01(equity / Math.max(1, target)),
          current: cop(equity),
          target: `≥ ${cop(target)}`,
        }
      },
    },
  ],
  'suelo-degradado': [
    {
      id: 'fertilidad',
      label: 'Suelo recuperado',
      description: 'Elevar la fertilidad promedio a 55 o más.',
      evaluate: (s) => atLeast(farmIndicators(s).fertility, 55),
    },
    {
      id: 'erosion',
      label: 'Erosión controlada',
      description: 'Reducir la erosión promedio a 35 o menos.',
      evaluate: (s) => atMost(farmIndicators(s).erosion, 35, s.baseline.erosion),
    },
    {
      id: 'rentabilidad',
      label: 'Finca rentable',
      description: 'Alcanzar un índice de rentabilidad de 50 o más (patrimonio sin pérdidas).',
      evaluate: (s) => atLeast(computeScores(s).profitability, 50),
    },
  ],
  'crisis-hidrica': [
    {
      id: 'salud',
      label: 'Cultivos sanos',
      description: 'Mantener la salud promedio del café en 60 o más.',
      evaluate: (s) => atLeast(farmIndicators(s).health, 60),
    },
    {
      id: 'calidad-agua',
      label: 'Fuente hídrica protegida',
      description: 'Mantener la calidad del agua en 60 o más.',
      evaluate: (s) => atLeast(s.environment.waterQuality, 60),
    },
    {
      id: 'eficiencia',
      label: 'Uso eficiente del agua',
      description: 'No dejar el reservorio vacío más de 2 meses en toda la partida.',
      evaluate: (s) => {
        const months = s.counters.emptyWaterMonths
        return {
          value: months,
          achieved: months <= 2,
          progress: months <= 2 ? 1 : clamp01(1 - (months - 2) / 6),
          current: `${months} meses`,
          target: '≤ 2 meses',
        }
      },
    },
  ],
}

export function evaluateObjectives(state: GameState): ObjectiveStatus[] {
  return OBJECTIVES[state.config.scenarioId].map((o) => {
    const r = o.evaluate(state)
    return {
      id: o.id,
      label: o.label,
      description: o.description,
      achieved: r.achieved,
      progress: round(r.progress, 3),
      current: r.current,
      target: r.target,
    }
  })
}

export function objectiveDefinitions(scenario: ScenarioId): { id: string; label: string; description: string }[] {
  return OBJECTIVES[scenario].map(({ id, label, description }) => ({ id, label, description }))
}

export type FailureReason = 'quiebra' | 'colapso' | null

/** Evalúa las condiciones de fracaso a partir de los contadores del estado. */
export function checkFailure(state: GameState): { reason: FailureReason; message: string } {
  const debtLimit = -state.config.initialBudget * FAILURE.maxDebtFraction
  if (state.counters.negativeMoneyMonths >= FAILURE.negativeMoneyMonths || state.inventory.money < debtLimit) {
    return {
      reason: 'quiebra',
      message: 'La finca entró en quiebra: el saldo permaneció negativo demasiado tiempo o la deuda superó el límite.',
    }
  }
  if (state.counters.collapseMonths >= FAILURE.collapseMonths) {
    return {
      reason: 'colapso',
      message: 'Colapso ecológico: la sostenibilidad se mantuvo en niveles críticos durante varios meses.',
    }
  }
  return { reason: null, message: '' }
}

export function totalMonths(state: Pick<GameState, 'config'>): number {
  return state.config.durationYears * 12
}
