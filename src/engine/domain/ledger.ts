/**
 * Libro de movimientos e inventario: única vía para modificar dinero,
 * jornales y recursos dentro del motor. Garantiza que no existan saldos
 * negativos por acciones del jugador.
 */

import { RESOURCES } from '../config/economy'
import { round } from '../lib/math'
import type { Cost, GameState, ResourceId, TransactionCategory, TransactionKind } from './types'

export const EMPTY_COST: Cost = { money: 0, labor: 0, resources: {} }

const RESOURCE_KEYS: readonly ResourceId[] = [
  'agua',
  'abonoOrganico',
  'fertilizanteQuimico',
  'controlQuimico',
  'controlBiologico',
  'colinos',
]

export function nextId(draft: GameState, prefix: string): string {
  draft.counters.nextId += 1
  return `${prefix}-${draft.counters.nextId}`
}

export function addTransaction(
  draft: GameState,
  kind: TransactionKind,
  category: TransactionCategory,
  description: string,
  amount: number,
): void {
  const value = Math.round(Math.max(0, amount))
  if (value === 0) return
  draft.transactions.push({ id: nextId(draft, 'tx'), turn: draft.turn, kind, category, description, amount: value })
  if (kind === 'ingreso') {
    draft.inventory.money += value
    draft.tracker.income += value
    draft.counters.totalIncome += value
  } else {
    draft.inventory.money -= value
    draft.tracker.expenses += value
    draft.counters.totalExpenses += value
  }
}

/** Devuelve un mensaje de error si el costo no puede pagarse, o null. */
export function checkAffordable(state: GameState, cost: Cost): string | null {
  if (cost.money > 0 && state.inventory.money < cost.money) {
    return `Dinero insuficiente: se necesitan ${formatCop(cost.money)} y hay ${formatCop(Math.max(0, state.inventory.money))}.`
  }
  if (cost.labor > 0 && state.labor.available + 1e-9 < cost.labor) {
    return `Jornales insuficientes: se necesitan ${round(cost.labor, 1)} y quedan ${round(state.labor.available, 1)} este mes.`
  }
  for (const key of RESOURCE_KEYS) {
    const needed = cost.resources[key] ?? 0
    if (needed > 0 && state.inventory[key] + 1e-9 < needed) {
      const info = RESOURCES[key]
      return `${info.name} insuficiente: se necesitan ${round(needed, 1)} ${info.unitPlural} y hay ${round(state.inventory[key], 1)}.`
    }
  }
  return null
}

/** Descuenta un costo ya validado del inventario. */
export function payCost(draft: GameState, cost: Cost, category: TransactionCategory, description: string): void {
  if (cost.money > 0) addTransaction(draft, 'gasto', category, description, cost.money)
  if (cost.labor > 0) draft.labor.available = round(Math.max(0, draft.labor.available - cost.labor), 2)
  for (const key of RESOURCE_KEYS) {
    const amount = cost.resources[key] ?? 0
    if (amount > 0) {
      draft.inventory[key] = round(Math.max(0, draft.inventory[key] - amount), 2)
      if (key === 'agua') {
        draft.tracker.waterUsed += amount
        draft.counters.totalWaterUsed += amount
      }
    }
  }
}

export function formatCop(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`
}

export function costIsEmpty(cost: Cost): boolean {
  return cost.money === 0 && cost.labor === 0 && Object.values(cost.resources).every((v) => !v)
}
