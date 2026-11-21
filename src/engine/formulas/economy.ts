/**
 * Economía de la finca:
 *
 *   Ganancia = Ingresos por cosecha − Costos totales
 */

import { CERTIFICATION, RESOURCES } from '../config/economy'
import type { GameState, ResourceId, Transaction } from '../domain/types'

export function computeProfit(income: number, costs: number): number {
  return income - costs
}

/** Margen sobre costos; 0 cuando no hay costos. */
export function profitMargin(income: number, costs: number): number {
  if (costs <= 0) return income > 0 ? 1 : 0
  return (income - costs) / costs
}

export function totalsFromTransactions(transactions: readonly Transaction[], fromTurn = 0, toTurn = Infinity) {
  let income = 0
  let expenses = 0
  for (const t of transactions) {
    if (t.turn < fromTurn || t.turn > toTurn) continue
    if (t.kind === 'ingreso') income += t.amount
    else expenses += t.amount
  }
  return { income, expenses, profit: computeProfit(income, expenses) }
}

/** Precio actual del café (COP/kg cps) incluyendo índice de mercado y prima. */
export function coffeePrice(state: Pick<GameState, 'params' | 'market' | 'infrastructure'>, eventMult = 1): number {
  const premium = state.infrastructure.certified ? 1 + CERTIFICATION.premium : 1
  return Math.round(state.params.coffeeBasePrice * state.market.coffeeIndex * eventMult * premium)
}

/** Precio unitario actual de un insumo. */
export function resourcePrice(
  state: Pick<GameState, 'params' | 'market'>,
  resource: ResourceId,
  eventMult = 1,
): number {
  return Math.round(RESOURCES[resource].basePrice * state.params.inputPriceMultiplier * state.market.inputIndex * eventMult)
}

/** Patrimonio: dinero + café almacenado + insumos + valor residual de inversiones. */
export function computeEquity(state: Pick<GameState, 'inventory' | 'params' | 'market' | 'infrastructure'>): number {
  const inv = state.inventory
  const inputs =
    inv.abonoOrganico * RESOURCES.abonoOrganico.basePrice +
    inv.fertilizanteQuimico * RESOURCES.fertilizanteQuimico.basePrice +
    inv.controlQuimico * RESOURCES.controlQuimico.basePrice +
    inv.controlBiologico * RESOURCES.controlBiologico.basePrice +
    inv.colinos * RESOURCES.colinos.basePrice
  const coffee = inv.cafe * state.params.coffeeBasePrice * state.market.coffeeIndex * 0.95
  return inv.money + coffee + inputs * 0.8 + state.infrastructure.investedValue * 0.6
}
