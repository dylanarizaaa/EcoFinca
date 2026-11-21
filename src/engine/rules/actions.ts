/**
 * Acciones del jugador: cálculo de costos, validación y aplicación de efectos.
 *
 * Todas las funciones son puras respecto al estado recibido: `applyAction`
 * devuelve un NUEVO estado y nunca modifica el original.
 */

import { stageDuration, VARIETIES } from '../config/crops'
import {
  ACTION_COSTS,
  CERTIFICATION,
  COMPOST_BULTOS_PER_KG,
  COMPOST_DELAY_MONTHS,
  FARM_ACTION_COSTS,
  INVESTMENTS,
  PARCEL_ACTION_LABELS,
  RESOURCES,
} from '../config/economy'
import { CONTAMINATION, FERTILITY, HEALTH, PESTS, PRODUCTION, WATER, WATER_RESOURCES } from '../config/model'
import { addTransaction, checkAffordable, EMPTY_COST, payCost } from '../domain/ledger'
import { findParcel, parcelYieldEstimate } from '../domain/selectors'
import type {
  ActionResult,
  Cost,
  CropState,
  FarmAction,
  GameAction,
  GameState,
  Parcel,
  ParcelAction,
  ResourceId,
} from '../domain/types'
import { aggregateModifiers, applyEventResponse } from '../events/engine'
import { coffeePrice, resourcePrice } from '../formulas/economy'
import { applyChemicalFertilizer, applyOrganicFertilizer } from '../formulas/soil'
import { irrigationVolumeM3 } from '../formulas/water'
import { clamp100, round } from '../lib/math'
import { computeScores } from './scoring'

const halfUp = (x: number) => Math.ceil(x * 2 - 1e-9) / 2

export function isParcelAction(action: GameAction): action is ParcelAction {
  return 'parcelId' in action
}

/** Factor de precios vigente (calibración × índice de mercado × eventos). */
export function priceFactor(state: GameState): number {
  return state.params.inputPriceMultiplier * state.market.inputIndex * aggregateModifiers(state.activeEvents).inputPriceMult
}

export function currentCoffeePrice(state: GameState): number {
  return coffeePrice(state, aggregateModifiers(state.activeEvents).coffeePriceMult)
}

export function currentResourcePrice(state: GameState, resource: ResourceId): number {
  return resourcePrice(state, resource, aggregateModifiers(state.activeEvents).inputPriceMult)
}

function irrigationEfficiency(state: GameState): number {
  return WATER.irrigationEfficiency[state.infrastructure.irrigation]
}

export function processingWaterM3(state: GameState, kg: number): number {
  const liters = state.infrastructure.ecoProcessing
    ? WATER_RESOURCES.processingLitersPerKg.ecologico
    : WATER_RESOURCES.processingLitersPerKg.tradicional
  return round((kg * liters) / 1000, 1)
}

function cost(money: number, labor: number, resources: Partial<Record<ResourceId, number>> = {}): Cost {
  return { money: Math.round(money), labor: halfUp(labor), resources }
}

/** Costo de una acción en el estado actual (dinero, jornales y recursos). */
export function getActionCost(state: GameState, action: GameAction): Cost {
  const pf = priceFactor(state)
  if (isParcelAction(action)) {
    const parcel = findParcel(state, action.parcelId)
    if (!parcel) return EMPTY_COST
    const a = parcel.areaHa
    switch (action.type) {
      case 'preparar':
        return cost(ACTION_COSTS.preparar.moneyPerHa * a * pf, ACTION_COSTS.preparar.laborPerHa * a)
      case 'sembrar':
        return cost(ACTION_COSTS.sembrar.moneyPerHa * a * pf, ACTION_COSTS.sembrar.laborPerHa * a, {
          colinos: Math.ceil((PRODUCTION.plantsPerHa * a) / 100) * 100,
        })
      case 'fertilizar': {
        const dose = FERTILITY.doseMultiplier[action.dose]
        if (action.fertilizer === 'organico') {
          return cost(0, ACTION_COSTS.fertilizarOrganico.laborPerHa * a, {
            abonoOrganico: halfUp(ACTION_COSTS.fertilizarOrganico.bultosPerHa * a * dose),
          })
        }
        return cost(0, ACTION_COSTS.fertilizarQuimico.laborPerHa * a, {
          fertilizanteQuimico: halfUp(ACTION_COSTS.fertilizarQuimico.bultosPerHa * a * dose),
        })
      }
      case 'regar':
        return cost(
          ACTION_COSTS.regar.moneyPerHa * a * pf,
          ACTION_COSTS.regar.laborPerHa[state.infrastructure.irrigation] * a,
          { agua: round(irrigationVolumeM3(a, irrigationEfficiency(state)), 0) },
        )
      case 'controlPlagas':
        return action.method === 'quimico'
          ? cost(0, ACTION_COSTS.controlQuimico.laborPerHa * a, {
              controlQuimico: halfUp(ACTION_COSTS.controlQuimico.dosisPerHa * a),
            })
          : cost(0, ACTION_COSTS.controlIntegrado.laborPerHa * a, {
              controlBiologico: halfUp(ACTION_COSTS.controlIntegrado.dosisPerHa * a),
            })
      case 'cobertura':
        return cost(ACTION_COSTS.cobertura.moneyPerHa * a * pf, ACTION_COSTS.cobertura.laborPerHa * a)
      case 'barreras':
        return cost(ACTION_COSTS.barreras.moneyPerHa * a * pf, ACTION_COSTS.barreras.laborPerHa * a)
      case 'sombrio':
        return cost(ACTION_COSTS.sombrio.moneyPerHa * a * pf, ACTION_COSTS.sombrio.laborPerHa * a)
      case 'mantenimiento':
        return cost(ACTION_COSTS.mantenimiento.moneyPerHa * a * pf, ACTION_COSTS.mantenimiento.laborPerHa * a)
      case 'cosechar': {
        const kg = parcelYieldEstimate(state, parcel)
        return cost(ACTION_COSTS.cosechar.moneyPerKg * kg, ACTION_COSTS.cosechar.laborPerHa * a, {
          agua: processingWaterM3(state, kg),
        })
      }
      case 'reforestar':
        return cost(ACTION_COSTS.reforestar.moneyPerHa * a * pf, ACTION_COSTS.reforestar.laborPerHa * a)
    }
  }
  switch (action.type) {
    case 'comprar':
      return cost(currentResourcePrice(state, action.item) * action.quantity, 0)
    case 'vender':
      return EMPTY_COST
    case 'invertir': {
      const info = INVESTMENTS[action.investment]
      return cost(info.cost * state.params.inputPriceMultiplier, info.labor)
    }
    case 'contratarJornales':
      return cost(state.params.laborCost * action.quantity, 0)
    case 'conservarFuentes':
      return cost(FARM_ACTION_COSTS.conservarFuentes.money * pf, FARM_ACTION_COSTS.conservarFuentes.labor)
    case 'restaurarArea': {
      const ha = state.environment.degradedHa
      return cost(FARM_ACTION_COSTS.restaurarArea.moneyPerHa * ha * pf, FARM_ACTION_COSTS.restaurarArea.laborPerHa * ha)
    }
    case 'responderEvento':
      return EMPTY_COST
  }
}

function validateParcelAction(state: GameState, action: ParcelAction, parcel: Parcel): string | null {
  const crop = parcel.crop
  if (action.type !== 'cosechar' && parcel.actionsThisTurn.includes(action.type)) {
    return `Ya realizaste «${PARCEL_ACTION_LABELS[action.type]}» en ${parcel.id} este mes.`
  }
  const planted = crop !== null && crop.variety !== null
  switch (action.type) {
    case 'preparar':
      if (parcel.landUse === 'reforestacion') return 'El lote está reforestado: no se puede volver a cultivar.'
      if (crop?.stage === 'preparacion') return 'El terreno ya está en preparación.'
      return null
    case 'sembrar': {
      if (!crop || crop.stage !== 'preparacion') return 'Primero debes preparar el terreno.'
      const needed = stageDuration('preparacion', state.params.stageDurations, 0)
      if (crop.monthsInStage < needed) return `La preparación del terreno tarda ${needed} mes(es). Avanza el mes para poder sembrar.`
      return null
    }
    case 'fertilizar':
      if (parcel.landUse === 'reforestacion') return 'Los lotes reforestados no se fertilizan.'
      return null
    case 'regar':
      if (!planted) return 'Solo se riegan lotes con café sembrado.'
      return null
    case 'controlPlagas':
      if (!planted) return 'No hay cultivo que proteger en este lote.'
      return null
    case 'cobertura':
      if (parcel.landUse === 'reforestacion') return 'El lote reforestado ya tiene cobertura natural.'
      if (parcel.practices.cover.active) return 'El lote ya tiene cobertura vegetal.'
      return null
    case 'barreras':
      if (parcel.practices.barrier.active) return 'El lote ya tiene barreras vivas.'
      return null
    case 'sombrio':
      if (parcel.landUse !== 'cafe') return 'El sombrío se establece en lotes de café.'
      if (parcel.practices.shade.active) return 'El lote ya tiene sombrío.'
      return null
    case 'mantenimiento':
      if (!planted) return 'No hay cafetal que mantener en este lote.'
      return null
    case 'cosechar':
      if (!crop || crop.stage !== 'cosecha') return 'El café de este lote aún no está listo para cosechar.'
      return null
    case 'reforestar':
      if (parcel.landUse === 'reforestacion') return 'El lote ya está reforestado.'
      return null
  }
}

function validateFarmAction(state: GameState, action: FarmAction): string | null {
  switch (action.type) {
    case 'comprar': {
      if (!Number.isFinite(action.quantity) || action.quantity <= 0) return 'La cantidad debe ser mayor que cero.'
      if (!Number.isInteger(action.quantity)) return 'La cantidad debe ser un número entero.'
      if (action.item === 'agua') {
        const room = state.infrastructure.reservoirCapacity - state.inventory.agua
        if (action.quantity > room) return `El reservorio solo tiene espacio para ${Math.floor(room)} m³.`
      }
      return null
    }
    case 'vender':
      if (!Number.isFinite(action.quantityKg) || action.quantityKg <= 0) return 'La cantidad debe ser mayor que cero.'
      if (action.quantityKg > state.inventory.cafe + 1e-9) return 'No tienes suficiente café almacenado.'
      return null
    case 'invertir': {
      const infra = state.infrastructure
      if (action.investment === 'riegoGoteo' && infra.irrigation === 'goteo') return 'El riego por goteo ya está instalado.'
      if (action.investment === 'beneficioEcologico' && infra.ecoProcessing) return 'El beneficio ecológico ya está instalado.'
      if (action.investment === 'certificacion') {
        if (infra.certified) return 'La finca ya está certificada.'
        if (!infra.ecoProcessing) return 'La certificación requiere beneficio ecológico.'
        const s = computeScores(state).sustainability
        if (s < CERTIFICATION.minSustainabilityToObtain)
          return `La certificación requiere sostenibilidad ≥ ${CERTIFICATION.minSustainabilityToObtain} (actual ${round(s, 0)}).`
      }
      if (action.investment === 'reservorio' && infra.reservoirCapacity >= 1800) return 'El reservorio alcanzó su tamaño máximo.'
      return null
    }
    case 'contratarJornales':
      if (!Number.isInteger(action.quantity) || action.quantity <= 0) return 'Indica un número entero de jornales.'
      if (action.quantity > 60) return 'No es posible contratar más de 60 jornales en un mes.'
      return null
    case 'conservarFuentes':
      if (state.environment.riparian.active) return 'La ronda hídrica ya está en conservación.'
      return null
    case 'restaurarArea':
      if (state.environment.degradedHa <= 0) return 'No hay áreas degradadas por restaurar.'
      return null
    case 'responderEvento':
      return null
  }
}

/** Devuelve un mensaje explicando por qué la acción no es posible, o null. */
export function validateAction(state: GameState, action: GameAction): string | null {
  if (state.status !== 'activo') return 'La partida ha terminado.'
  if (isParcelAction(action)) {
    const parcel = findParcel(state, action.parcelId)
    if (!parcel) return 'La parcela no existe.'
    const error = validateParcelAction(state, action, parcel)
    if (error) return error
  } else {
    const error = validateFarmAction(state, action)
    if (error) return error
  }
  if (action.type === 'responderEvento') return null
  const actionCost = getActionCost(state, action)
  // La recolección puede pagarse con una venta anticipada de parte de la cosecha.
  if (action.type === 'cosechar') return checkAffordable(state, { ...actionCost, money: 0 })
  return checkAffordable(state, actionCost)
}

/**
 * Si el dinero no alcanza para pagar la recolección, se registra una venta
 * anticipada de parte de la cosecha. Devuelve los kg vendidos (que luego se
 * descuentan del café que llega al almacén).
 */
function advanceSaleForHarvest(draft: GameState, harvestCost: number): number {
  const shortfall = harvestCost - Math.max(0, draft.inventory.money)
  if (shortfall <= 0) return 0
  const price = currentCoffeePrice(draft)
  const kg = round(Math.ceil((shortfall / price) * 10) / 10, 1)
  addTransaction(draft, 'ingreso', 'venta', `Venta anticipada de ${kg} kg para pagar la recolección`, kg * price)
  return kg
}

function newCrop(): CropState {
  return {
    variety: null,
    stage: 'preparacion',
    monthsInStage: 0,
    ageMonths: 0,
    health: 100,
    harvests: 0,
    reproFactorSum: 0,
    reproMonths: 0,
    estimatedYieldKg: 0,
    accumulatedKg: 0,
  }
}

function applyParcelEffects(draft: GameState, action: ParcelAction, parcel: Parcel): { message: string; effects: string[] } {
  const effects: string[] = []
  switch (action.type) {
    case 'preparar': {
      const renewing = parcel.crop !== null && parcel.crop.variety !== null
      parcel.landUse = 'cafe'
      parcel.crop = newCrop()
      parcel.practices.cover = { active: parcel.practices.cover.active, level: round(parcel.practices.cover.level * 0.5, 3) }
      parcel.soil.moisture = clamp100(parcel.soil.moisture + 3)
      parcel.pests = { broca: 0, roya: round(parcel.pests.roya * 0.3, 2), 'mancha-hierro': round(parcel.pests['mancha-hierro'] * 0.3, 2) }
      effects.push('El lote queda listo para sembrar el próximo mes.', 'El suelo descubierto es más vulnerable a la erosión.')
      if (renewing) effects.push('Se eliminaron las plantas anteriores (renovación).')
      return { message: `Terreno de ${parcel.name} en preparación.`, effects }
    }
    case 'sembrar': {
      const crop = parcel.crop
      if (crop) {
        crop.variety = action.variety
        crop.stage = 'establecimiento'
        crop.monthsInStage = 0
        crop.ageMonths = 0
        crop.health = 78
        crop.harvests = 0
        crop.reproFactorSum = 0
        crop.reproMonths = 0
        crop.estimatedYieldKg = 0
      }
      effects.push(`Variedad ${VARIETIES[action.variety].name}.`, 'Los colinos son sensibles a la sequía durante el establecimiento.')
      return { message: `${parcel.name} sembrado con ${VARIETIES[action.variety].name}.`, effects }
    }
    case 'fertilizar': {
      const dose = FERTILITY.doseMultiplier[action.dose]
      const before = parcel.soil.fertility
      if (action.fertilizer === 'quimico') {
        const r = applyChemicalFertilizer(parcel.soil.fertility, parcel.soil.chemicalLoad, dose)
        parcel.soil.fertility = r.fertility
        parcel.soil.chemicalLoad = r.chemicalLoad
        draft.tracker.chemicalFertilizerBultos += getActionCost(draft, action).resources.fertilizanteQuimico ?? 0
        effects.push(`Fertilidad ${round(before, 0)} → ${round(r.fertility, 0)}.`)
        if (r.excess > 0) effects.push(`Exceso de ${round(r.excess, 1)} puntos: se convierte en carga contaminante.`)
        effects.push('Parte del fertilizante puede llegar a la quebrada con la lluvia.')
      } else {
        const r = applyOrganicFertilizer(parcel.soil.fertility, parcel.soil.organicPool, dose)
        parcel.soil.fertility = r.fertility
        parcel.soil.organicPool = r.organicPool
        parcel.biodiversity = clamp100(parcel.biodiversity + 1)
        effects.push('Nutrientes de liberación gradual durante los próximos meses.', 'Mejora la vida del suelo.')
      }
      return { message: `${parcel.name} fertilizado (${action.fertilizer === 'quimico' ? 'químico' : 'orgánico'}, dosis ${action.dose}).`, effects }
    }
    case 'regar': {
      parcel.irrigationMm += WATER.irrigationEffectiveMm
      effects.push(`+${WATER.irrigationEffectiveMm} mm efectivos al cerrar el mes.`)
      if (draft.infrastructure.irrigation === 'gravedad') effects.push('Riego por gravedad: 45 % del agua se pierde.')
      return { message: `Riego programado en ${parcel.name}.`, effects }
    }
    case 'controlPlagas': {
      if (action.method === 'quimico') {
        const k = 1 - PESTS.chemical.reduction
        parcel.pests = {
          broca: round(parcel.pests.broca * k, 2),
          roya: round(parcel.pests.roya * k, 2),
          'mancha-hierro': round(parcel.pests['mancha-hierro'] * k, 2),
        }
        parcel.protection = { monthsRemaining: PESTS.chemical.months, method: 'quimico' }
        parcel.soil.contamination = clamp100(parcel.soil.contamination + PESTS.chemical.soilContamination)
        parcel.biodiversity = clamp100(parcel.biodiversity - PESTS.chemical.biodiversityLoss * 0.5)
        draft.tracker.pesticideLoad += PESTS.chemical.farmLoad * parcel.areaHa
        effects.push('−75 % de incidencia.', 'Contamina el suelo y reduce la fauna benéfica.')
      } else {
        const k = 1 - PESTS.integrated.reduction
        parcel.pests = {
          broca: round(parcel.pests.broca * k, 2),
          roya: round(parcel.pests.roya * k, 2),
          'mancha-hierro': round(parcel.pests['mancha-hierro'] * k, 2),
        }
        parcel.protection = { monthsRemaining: PESTS.integrated.months, method: 'integrado' }
        parcel.biodiversity = clamp100(parcel.biodiversity + PESTS.integrated.biodiversityGain)
        effects.push('−50 % de incidencia y 3 meses de protección.', 'Conserva los enemigos naturales.')
      }
      return { message: `Control de plagas en ${parcel.name}.`, effects }
    }
    case 'cobertura':
      parcel.practices.cover = { active: true, level: Math.max(parcel.practices.cover.level, 0.1) }
      effects.push('Protección creciente contra la erosión durante ~3 meses.')
      return { message: `Cobertura vegetal establecida en ${parcel.name}.`, effects }
    case 'barreras':
      parcel.practices.barrier = { active: true, level: Math.max(parcel.practices.barrier.level, 0.1) }
      effects.push('Las barreras maduran en ~6 meses y retienen sedimentos.')
      return { message: `Barreras vivas sembradas en ${parcel.name}.`, effects }
    case 'sombrio':
      parcel.practices.shade = { active: true, level: Math.max(parcel.practices.shade.level, 0.05) }
      effects.push('El sombrío madura en ~12 meses.', 'Reduce el estrés térmico y la evaporación.')
      return { message: `Sombrío establecido en ${parcel.name}.`, effects }
    case 'mantenimiento': {
      const crop = parcel.crop
      if (crop) crop.health = clamp100(crop.health + HEALTH.maintenanceBoost)
      const postHarvest = crop?.stage === 'vegetativo' && (crop.harvests ?? 0) > 0
      const k = 1 - PESTS.maintenanceReduction
      parcel.pests = {
        broca: round(parcel.pests.broca * (postHarvest ? 0.6 : k), 2),
        roya: round(parcel.pests.roya * k, 2),
        'mancha-hierro': round(parcel.pests['mancha-hierro'] * k, 2),
      }
      effects.push(`+${HEALTH.maintenanceBoost} de salud.`, 'Menos focos de plagas.')
      return { message: `Mantenimiento realizado en ${parcel.name}.`, effects }
    }
    case 'cosechar': {
      const crop = parcel.crop
      const kg = round(parcelYieldEstimate(draft, parcel), 1)
      draft.inventory.cafe = round(draft.inventory.cafe + kg, 1)
      draft.tracker.harvestedKg += kg
      draft.counters.totalProductionKg += kg
      parcel.totalProductionKg = round(parcel.totalProductionKg + kg, 1)
      const load = kg * CONTAMINATION.processingPerKg * (draft.infrastructure.ecoProcessing ? 1 - CONTAMINATION.ecoProcessingReduction : 1)
      draft.tracker.processingLoad += load
      if (draft.infrastructure.ecoProcessing) {
        draft.infrastructure.pendingCompost.push({
          readyTurn: draft.turn + COMPOST_DELAY_MONTHS,
          bultos: round(kg * COMPOST_BULTOS_PER_KG, 1),
        })
        effects.push(`La pulpa se compostará: ${round(kg * COMPOST_BULTOS_PER_KG, 1)} bultos de abono en ${COMPOST_DELAY_MONTHS} meses.`)
      } else {
        effects.push('Las aguas mieles del beneficio tradicional llegan a la quebrada.')
      }
      if (crop) {
        crop.accumulatedKg = round(crop.accumulatedKg + kg, 1)
        crop.harvests += 1
        crop.stage = 'vegetativo'
        crop.monthsInStage = 0
        crop.reproFactorSum = 0
        crop.reproMonths = 0
        crop.estimatedYieldKg = 0
      }
      parcel.pests.broca = round(parcel.pests.broca * 0.6, 2)
      effects.unshift(`${kg.toLocaleString('es-CO')} kg de café pergamino seco al almacén.`)
      return { message: `Cosecha de ${parcel.name}: ${kg.toLocaleString('es-CO')} kg cps.`, effects }
    }
    case 'reforestar':
      parcel.landUse = 'reforestacion'
      parcel.crop = null
      parcel.reforestationAge = 0
      parcel.practices.cover = { active: true, level: Math.max(0.2, parcel.practices.cover.level) }
      parcel.practices.shade = { active: false, level: 0 }
      parcel.pests = { broca: 0, roya: 0, 'mancha-hierro': 0 }
      effects.push('El lote se convierte en bosque nativo en regeneración.', 'Aumentan la biodiversidad y la protección del agua.')
      return { message: `${parcel.name} en proceso de reforestación.`, effects }
  }
}

function applyFarmEffects(draft: GameState, action: FarmAction): { message: string; effects: string[] } {
  switch (action.type) {
    case 'comprar': {
      const info = RESOURCES[action.item]
      draft.inventory[action.item] = round(draft.inventory[action.item] + action.quantity, 2)
      return {
        message: `Compra: ${action.quantity.toLocaleString('es-CO')} ${action.quantity === 1 ? info.unit : info.unitPlural} de ${info.name.toLowerCase()}.`,
        effects: [],
      }
    }
    case 'vender': {
      const price = currentCoffeePrice(draft)
      const income = action.quantityKg * price
      draft.inventory.cafe = round(draft.inventory.cafe - action.quantityKg, 1)
      addTransaction(draft, 'ingreso', 'venta', `Venta de ${round(action.quantityKg, 1)} kg de café a $${price.toLocaleString('es-CO')}/kg`, income)
      return { message: `Venta de ${round(action.quantityKg, 1).toLocaleString('es-CO')} kg de café.`, effects: [] }
    }
    case 'invertir': {
      const info = INVESTMENTS[action.investment]
      const infra = draft.infrastructure
      infra.investedValue += info.cost
      if (action.investment === 'riegoGoteo') infra.irrigation = 'goteo'
      if (action.investment === 'beneficioEcologico') infra.ecoProcessing = true
      if (action.investment === 'reservorio') {
        infra.reservoirCapacity += 500
        infra.catchmentM2 += 300
      }
      if (action.investment === 'certificacion') infra.certified = true
      return { message: `Inversión realizada: ${info.name}.`, effects: info.benefits }
    }
    case 'contratarJornales':
      draft.labor.available = round(draft.labor.available + action.quantity, 2)
      draft.labor.hired += action.quantity
      return { message: `${action.quantity} jornales adicionales contratados para este mes.`, effects: [] }
    case 'conservarFuentes':
      draft.environment.riparian = { active: true, level: Math.max(0.05, draft.environment.riparian.level) }
      return {
        message: 'Inicia la conservación de la ronda hídrica.',
        effects: ['Aislamiento y siembra de especies nativas junto a la quebrada.', 'Mejora gradual de la calidad del agua y el caudal.'],
      }
    case 'restaurarArea':
      draft.environment.restorationHa = round(draft.environment.restorationHa + draft.environment.degradedHa, 2)
      draft.environment.degradedHa = 0
      draft.environment.restorationAge = 0
      return { message: 'Restauración del área degradada iniciada.', effects: ['El bosque se regenerará en los próximos años.'] }
    case 'responderEvento':
      return { message: '', effects: [] }
  }
}

/** Valida y aplica una acción. Devuelve un nuevo estado o un error. */
export function applyAction(state: GameState, action: GameAction): ActionResult {
  const error = validateAction(state, action)
  if (error) return { ok: false, error }

  const draft = structuredClone(state)

  if (action.type === 'responderEvento') {
    const result = applyEventResponse(draft, action.instanceId, action.responseId)
    if (!result.ok) return { ok: false, error: result.error }
    return { ok: true, state: draft, message: result.message, effects: [] }
  }

  const actionCost = getActionCost(draft, action)
  if (isParcelAction(action)) {
    const parcel = findParcel(draft, action.parcelId)
    if (!parcel) return { ok: false, error: 'La parcela no existe.' }
    const advance = action.type === 'cosechar' ? advanceSaleForHarvest(draft, actionCost.money) : 0
    const category = action.type === 'cosechar' ? 'cosecha' : ['cobertura', 'barreras', 'sombrio', 'reforestar'].includes(action.type) ? 'conservacion' : 'labores'
    payCost(draft, actionCost, category, `${PARCEL_ACTION_LABELS[action.type]} · ${parcel.id}`)
    const { message, effects } = applyParcelEffects(draft, action, parcel)
    if (advance > 0) {
      draft.inventory.cafe = round(Math.max(0, draft.inventory.cafe - advance), 1)
      effects.push(`Se vendieron ${advance.toLocaleString('es-CO')} kg por adelantado para pagar la recolección.`)
    }
    if (!parcel.actionsThisTurn.includes(action.type)) parcel.actionsThisTurn.push(action.type)
    return { ok: true, state: draft, message, effects }
  }

  const category =
    action.type === 'comprar'
      ? 'insumos'
      : action.type === 'contratarJornales'
        ? 'jornales'
        : action.type === 'invertir'
          ? 'inversion'
          : 'conservacion'
  const description =
    action.type === 'comprar'
      ? `Compra de ${RESOURCES[action.item].name.toLowerCase()}`
      : action.type === 'invertir'
        ? INVESTMENTS[action.investment].name
        : action.type === 'contratarJornales'
          ? `${action.quantity} jornales adicionales`
          : action.type === 'conservarFuentes'
            ? 'Conservación de la ronda hídrica'
            : 'Restauración de área degradada'
  payCost(draft, actionCost, category, description)
  const { message, effects } = applyFarmEffects(draft, action)
  return { ok: true, state: draft, message, effects }
}
