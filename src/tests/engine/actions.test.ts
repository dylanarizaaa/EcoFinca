import { describe, expect, it } from 'vitest'
import {
  applyAction,
  getActionCost,
  validateAction,
  WATER,
  FERTILITY,
  advanceTurn,
  currentCoffeePrice,
  currentResourcePrice,
} from '@/engine'
import type { GameState } from '@/engine'
import { makeGame, parcel, withParcel } from '../helpers'

function ok(result: ReturnType<typeof applyAction>): GameState {
  if (!result.ok) throw new Error(result.error)
  return result.state
}

describe('Acciones: costos y validación', () => {
  it('descuenta automáticamente dinero, jornales y recursos', () => {
    const game = makeGame()
    const target = game.parcels[0]!.id
    const cost = getActionCost(game, { type: 'cobertura', parcelId: target })
    const next = ok(applyAction(game, { type: 'cobertura', parcelId: target }))
    expect(next.inventory.money).toBe(game.inventory.money - cost.money)
    expect(next.labor.available).toBeCloseTo(game.labor.available - cost.labor, 6)
    expect(next.transactions).toHaveLength(1)
    expect(next.transactions[0]?.category).toBe('conservacion')
  })

  it('no modifica el estado original (inmutabilidad)', () => {
    const game = makeGame()
    const snapshot = JSON.stringify(game)
    applyAction(game, { type: 'cobertura', parcelId: game.parcels[0]!.id })
    expect(JSON.stringify(game)).toBe(snapshot)
  })

  it('impide acciones sin dinero suficiente', () => {
    const game = { ...makeGame(), inventory: { ...makeGame().inventory, money: 1000 } }
    const target = game.parcels.find((p) => !p.practices.barrier.active)!
    const result = applyAction(game, { type: 'barreras', parcelId: target.id })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Dinero insuficiente/)
  })

  it('impide consumir más recursos de los disponibles', () => {
    const base = makeGame()
    const game = { ...base, inventory: { ...base.inventory, fertilizanteQuimico: 0 } }
    const target = game.parcels.find((p) => p.crop?.variety)!.id
    const error = validateAction(game, { type: 'fertilizar', parcelId: target, fertilizer: 'quimico', dose: 'recomendada' })
    expect(error).toMatch(/Fertilizante químico insuficiente/)
  })

  it('impide comprar sin presupuesto y cantidades inválidas', () => {
    const base = makeGame()
    const poor = { ...base, inventory: { ...base.inventory, money: 10_000 } }
    expect(applyAction(poor, { type: 'comprar', item: 'fertilizanteQuimico', quantity: 5 }).ok).toBe(false)
    expect(validateAction(base, { type: 'comprar', item: 'abonoOrganico', quantity: 0 })).toMatch(/mayor que cero/)
    expect(validateAction(base, { type: 'comprar', item: 'abonoOrganico', quantity: 1.5 })).toMatch(/entero/)
  })

  it('no permite repetir la misma labor en la misma parcela durante el mes', () => {
    const game = makeGame()
    const id = game.parcels.find((p) => p.crop?.variety)!.id
    const once = ok(applyAction(game, { type: 'mantenimiento', parcelId: id }))
    expect(validateAction(once, { type: 'mantenimiento', parcelId: id })).toMatch(/Ya realizaste/)
  })

  it('no permite cosechar un cultivo inmaduro ni sembrar sin preparar', () => {
    const game = makeGame()
    const veg = game.parcels.find((p) => p.crop?.stage === 'vegetativo')!
    expect(validateAction(game, { type: 'cosechar', parcelId: veg.id })).toMatch(/no está listo/)
    expect(validateAction(game, { type: 'sembrar', parcelId: veg.id, variety: 'castillo' })).toMatch(/preparar/)
  })
})

describe('Fertilización', () => {
  it('el químico sube la fertilidad de inmediato y consume bultos según el área', () => {
    const game = makeGame()
    const p = game.parcels.find((x) => x.crop?.variety)!
    const next = ok(applyAction(game, { type: 'fertilizar', parcelId: p.id, fertilizer: 'quimico', dose: 'recomendada' }))
    const after = parcel(next, p.id)
    const expectedBultos = Math.ceil(4 * p.areaHa * 2) / 2
    expect(next.inventory.fertilizanteQuimico).toBeCloseTo(game.inventory.fertilizanteQuimico - expectedBultos, 6)
    expect(after.soil.fertility).toBeGreaterThan(p.soil.fertility)
    expect(after.soil.chemicalLoad).toBeGreaterThan(p.soil.chemicalLoad)
  })

  it('el orgánico aumenta el pool de nutrientes de liberación lenta', () => {
    const game = makeGame()
    const p = game.parcels.find((x) => x.crop?.variety)!
    const next = ok(applyAction(game, { type: 'fertilizar', parcelId: p.id, fertilizer: 'organico', dose: 'recomendada' }))
    expect(parcel(next, p.id).soil.organicPool).toBeCloseTo(p.soil.organicPool + FERTILITY.organicPoolPoints, 6)
  })
})

describe('Riego', () => {
  it('consume agua del reservorio y programa la lámina efectiva', () => {
    const game = makeGame()
    const p = game.parcels.find((x) => x.crop?.variety)!
    const next = ok(applyAction(game, { type: 'regar', parcelId: p.id }))
    const used = game.inventory.agua - next.inventory.agua
    expect(used).toBeCloseTo((WATER.irrigationEffectiveMm * 10 * p.areaHa) / 0.55, 0)
    expect(parcel(next, p.id).irrigationMm).toBe(WATER.irrigationEffectiveMm)
    expect(next.tracker.waterUsed).toBeCloseTo(used, 6)
  })

  it('el riego aumenta la humedad al cerrar el mes frente a no regar', () => {
    const game = makeGame()
    const p = game.parcels.find((x) => x.crop?.variety)!
    const irrigated = advanceTurn(ok(applyAction(game, { type: 'regar', parcelId: p.id }))).state
    const dry = advanceTurn(game).state
    expect(parcel(irrigated, p.id).soil.moisture).toBeGreaterThan(parcel(dry, p.id).soil.moisture)
  })

  it('impide regar sin agua suficiente', () => {
    const base = makeGame()
    const game = { ...base, inventory: { ...base.inventory, agua: 5 } }
    const p = game.parcels.find((x) => x.crop?.variety)!
    expect(validateAction(game, { type: 'regar', parcelId: p.id })).toMatch(/Agua/)
  })

  it('con riego por goteo se usa menos agua', () => {
    const game = ok(applyAction(makeGame(), { type: 'invertir', investment: 'riegoGoteo' }))
    const p = game.parcels.find((x) => x.crop?.variety)!
    expect(getActionCost(game, { type: 'regar', parcelId: p.id }).resources.agua).toBeLessThan(
      getActionCost(makeGame(), { type: 'regar', parcelId: p.id }).resources.agua ?? 0,
    )
  })
})

describe('Siembra, cosecha y mercado', () => {
  it('preparar → esperar un mes → sembrar', () => {
    const game = makeGame()
    const id = game.parcels[0]!.id
    const prepared = ok(applyAction(game, { type: 'preparar', parcelId: id }))
    expect(parcel(prepared, id).crop?.stage).toBe('preparacion')
    expect(validateAction(prepared, { type: 'sembrar', parcelId: id, variety: 'castillo' })).toMatch(/tarda/)
    const nextMonth = advanceTurn(ok(applyAction(prepared, { type: 'comprar', item: 'colinos', quantity: 5000 }))).state
    const sown = ok(applyAction(nextMonth, { type: 'sembrar', parcelId: id, variety: 'castillo' }))
    expect(parcel(sown, id).crop?.stage).toBe('establecimiento')
    expect(parcel(sown, id).crop?.variety).toBe('castillo')
    expect(sown.inventory.colinos).toBeLessThan(nextMonth.inventory.colinos)
  })

  it('cosechar lleva el café al almacén y vender genera ingresos', () => {
    const game = withParcel(makeGame(), 'P-01', (p) => {
      if (p.crop) {
        p.crop.stage = 'cosecha'
        p.crop.monthsInStage = 0
        p.crop.reproFactorSum = 5.6
        p.crop.reproMonths = 7
      }
    })
    const harvested = ok(applyAction(game, { type: 'cosechar', parcelId: 'P-01' }))
    const kg = harvested.inventory.cafe
    expect(kg).toBeGreaterThan(0)
    expect(parcel(harvested, 'P-01').crop?.stage).toBe('vegetativo')
    expect(harvested.tracker.harvestedKg).toBeCloseTo(kg, 6)
    expect(harvested.tracker.processingLoad).toBeGreaterThan(0)

    const price = currentCoffeePrice(harvested)
    const sold = ok(applyAction(harvested, { type: 'vender', quantityKg: kg }))
    expect(sold.inventory.cafe).toBe(0)
    expect(sold.inventory.money).toBe(harvested.inventory.money + Math.round(kg * price))
    expect(sold.transactions.at(-1)?.kind).toBe('ingreso')
  })

  it('si no alcanza el dinero, vende parte de la cosecha para pagar la recolección', () => {
    const base = withParcel(makeGame(), 'P-01', (p) => {
      if (p.crop) {
        p.crop.stage = 'cosecha'
        p.crop.reproFactorSum = 5.6
        p.crop.reproMonths = 7
      }
    })
    const game = { ...base, inventory: { ...base.inventory, money: 0 } }
    const result = ok(applyAction(game, { type: 'cosechar', parcelId: 'P-01' }))
    expect(result.inventory.money).toBeGreaterThanOrEqual(0)
    expect(result.transactions.some((t) => t.description.startsWith('Venta anticipada'))).toBe(true)
  })

  it('no permite vender más café del almacenado', () => {
    expect(validateAction(makeGame(), { type: 'vender', quantityKg: 10 })).toMatch(/suficiente café/)
  })

  it('la compra usa el precio vigente', () => {
    const game = makeGame()
    const price = currentResourcePrice(game, 'abonoOrganico')
    const next = ok(applyAction(game, { type: 'comprar', item: 'abonoOrganico', quantity: 10 }))
    expect(next.inventory.abonoOrganico).toBe(game.inventory.abonoOrganico + 10)
    expect(next.inventory.money).toBe(game.inventory.money - price * 10)
  })
})

describe('Control de plagas', () => {
  it('el químico reduce más la incidencia pero contamina y reduce biodiversidad', () => {
    const game = withParcel(makeGame(), 'P-01', (p) => {
      p.pests = { broca: 40, roya: 20, 'mancha-hierro': 10 }
    })
    const chem = ok(applyAction(game, { type: 'controlPlagas', parcelId: 'P-01', method: 'quimico' }))
    const mip = ok(applyAction(game, { type: 'controlPlagas', parcelId: 'P-01', method: 'integrado' }))
    expect(parcel(chem, 'P-01').pests.broca).toBeLessThan(parcel(mip, 'P-01').pests.broca)
    expect(parcel(chem, 'P-01').soil.contamination).toBeGreaterThan(parcel(game, 'P-01').soil.contamination)
    expect(parcel(chem, 'P-01').biodiversity).toBeLessThan(parcel(mip, 'P-01').biodiversity)
    expect(chem.tracker.pesticideLoad).toBeGreaterThan(0)
    expect(mip.tracker.pesticideLoad).toBe(0)
  })
})

describe('Inversiones y conservación', () => {
  it('la certificación exige beneficio ecológico', () => {
    expect(validateAction(makeGame(), { type: 'invertir', investment: 'certificacion' })).toMatch(/beneficio ecológico/)
  })

  it('el beneficio ecológico reduce el agua de beneficio', () => {
    const game = withParcel(makeGame(), 'P-01', (p) => {
      if (p.crop) {
        p.crop.stage = 'cosecha'
        p.crop.reproFactorSum = 5.6
        p.crop.reproMonths = 7
      }
    })
    const eco = ok(applyAction(game, { type: 'invertir', investment: 'beneficioEcologico' }))
    const traditionalWater = getActionCost(game, { type: 'cosechar', parcelId: 'P-01' }).resources.agua ?? 0
    const ecoWater = getActionCost(eco, { type: 'cosechar', parcelId: 'P-01' }).resources.agua ?? 0
    expect(ecoWater).toBeLessThan(traditionalWater / 10)
  })

  it('conservar fuentes activa la ronda hídrica una sola vez', () => {
    const game = ok(applyAction(makeGame(), { type: 'conservarFuentes' }))
    expect(game.environment.riparian.active).toBe(true)
    expect(validateAction(game, { type: 'conservarFuentes' })).toMatch(/ya está/)
  })

  it('reforestar convierte la parcela en bosque y elimina el cultivo', () => {
    const game = ok(applyAction(makeGame(), { type: 'reforestar', parcelId: 'P-02' }))
    expect(parcel(game, 'P-02').landUse).toBe('reforestacion')
    expect(parcel(game, 'P-02').crop).toBeNull()
    expect(validateAction(game, { type: 'preparar', parcelId: 'P-02' })).toMatch(/reforestado/)
  })
})
