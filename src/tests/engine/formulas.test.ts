import { describe, expect, it } from 'vitest'
import {
  applyChemicalFertilizer,
  applyOrganicFertilizer,
  biodiversityTarget,
  climateFactor,
  combinedFactor,
  computeBiodiversity,
  computeContamination,
  computeErosion,
  computeFertility,
  computeHealth,
  computeMoisture,
  computeProduction,
  computeProfit,
  computeWaterQuality,
  evapotranspirationMm,
  fertilityFactor,
  irrigationVolumeM3,
  moistureFactor,
  profitMargin,
  runoffCoefficient,
  FERTILITY,
  WATER,
} from '@/engine'

const baseMoisture = {
  moisture: 50,
  precipitationMm: 0,
  irrigationMm: 0,
  slope: 0.4,
  rainIntensity: 0,
  erosion: 20,
  coverLevel: 0,
  barrierLevel: 0,
  shadeLevel: 0,
  temperature: 20,
  condition: 'nublado' as const,
  bareSoil: false,
}

const baseFertility = {
  fertility: 60,
  organicPool: 0,
  chemicalLoad: 0,
  erosion: 0,
  erosionGain: 0,
  drainage: 0,
  soilContamination: 0,
  biodiversity: 50,
  landUse: 'cafe' as const,
  stage: 'vegetativo' as const,
  coverLevel: 0,
  shadeLevel: 0,
}

describe('Fertilidad: F(t+1) = F(t) + Recuperación − Degradación', () => {
  it('descuenta exactamente la extracción del cultivo cuando no hay otros términos', () => {
    const r = computeFertility(baseFertility)
    expect(r.recovery).toBeCloseTo(0, 6)
    expect(r.degradation).toBeCloseTo(FERTILITY.extraction.vegetativo, 6)
    expect(r.fertility).toBeCloseTo(60 - FERTILITY.extraction.vegetativo, 6)
  })

  it('mineraliza el pool orgánico de forma gradual', () => {
    const r = computeFertility({ ...baseFertility, organicPool: 20 })
    expect(r.recovery).toBeCloseTo(20 * FERTILITY.organicRelease, 6)
    expect(r.organicPool).toBeCloseTo(20 * (1 - FERTILITY.organicRelease), 6)
  })

  it('mayor erosión disminuye la fertilidad', () => {
    const low = computeFertility({ ...baseFertility, erosion: 10, erosionGain: 1 })
    const high = computeFertility({ ...baseFertility, erosion: 80, erosionGain: 6 })
    expect(high.fertility).toBeLessThan(low.fertility)
  })

  it('la cobertura vegetal y el sombrío recuperan fertilidad', () => {
    const none = computeFertility(baseFertility)
    const covered = computeFertility({ ...baseFertility, coverLevel: 1, shadeLevel: 1 })
    expect(covered.fertility - none.fertility).toBeCloseTo(FERTILITY.coverGain + FERTILITY.shadeGain, 6)
  })

  it('nunca sale del rango 0–100', () => {
    expect(computeFertility({ ...baseFertility, fertility: 0.5, erosion: 100, erosionGain: 50 }).fertility).toBe(0)
    expect(computeFertility({ ...baseFertility, fertility: 99, organicPool: 500, landUse: 'barbecho' }).fertility).toBe(100)
  })
})

describe('Efectos de fertilizantes', () => {
  it('el químico eleva la fertilidad de inmediato y genera carga química', () => {
    const r = applyChemicalFertilizer(50, 0, 1)
    expect(r.fertility).toBeCloseTo(50 + FERTILITY.chemicalPoints, 6)
    expect(r.chemicalLoad).toBeCloseTo(FERTILITY.chemicalLoadPerDose, 6)
    expect(r.excess).toBe(0)
  })

  it('el exceso de químico casi no aumenta la fertilidad y dispara la carga contaminante', () => {
    const r = applyChemicalFertilizer(80, 0, 1.75)
    const points = FERTILITY.chemicalPoints * 1.75
    expect(r.excess).toBeCloseTo(points - (FERTILITY.excessThreshold - 80), 6)
    expect(r.fertility).toBeLessThan(80 + points)
    expect(r.chemicalLoad).toBeGreaterThan(FERTILITY.chemicalLoadPerDose * 1.75)
  })

  it('el orgánico aporta poco de inmediato y mucho al pool de liberación lenta', () => {
    const r = applyOrganicFertilizer(50, 0, 1)
    expect(r.fertility).toBeCloseTo(50 + FERTILITY.organicImmediate, 6)
    expect(r.organicPool).toBeCloseTo(FERTILITY.organicPoolPoints, 6)
  })
})

describe('Humedad: H(t+1) = H + P − Escorrentía + Riego − ET − Drenaje', () => {
  it('sin lluvia ni riego la humedad baja por evapotranspiración', () => {
    const r = computeMoisture(baseMoisture)
    expect(r.precipitation).toBe(0)
    expect(r.evapotranspiration).toBeGreaterThan(0)
    expect(r.moisture).toBeCloseTo(50 - r.evapotranspiration, 6)
  })

  it('aplica el riego efectivo punto a punto', () => {
    const dry = computeMoisture(baseMoisture)
    const irrigated = computeMoisture({ ...baseMoisture, irrigationMm: 12 })
    expect(irrigated.moisture - dry.moisture).toBeCloseTo(12 * WATER.irrigationPointsPerMm, 6)
  })

  it('la escorrentía reduce el agua que infiltra; la cobertura la disminuye', () => {
    const bare = computeMoisture({ ...baseMoisture, precipitationMm: 200, rainIntensity: 60 })
    const covered = computeMoisture({ ...baseMoisture, precipitationMm: 200, rainIntensity: 60, coverLevel: 1, barrierLevel: 1 })
    expect(bare.runoff).toBeGreaterThan(covered.runoff)
    expect(covered.moisture).toBeGreaterThan(bare.moisture)
  })

  it('el exceso sobre capacidad de campo drena y nunca supera 100', () => {
    const r = computeMoisture({ ...baseMoisture, moisture: 95, precipitationMm: 500 })
    expect(r.drainage).toBeGreaterThan(0)
    expect(r.moisture).toBeLessThanOrEqual(100)
  })

  it('el riego por goteo necesita menos agua para la misma lámina efectiva', () => {
    const gravity = irrigationVolumeM3(1, WATER.irrigationEfficiency.gravedad)
    const drip = irrigationVolumeM3(1, WATER.irrigationEfficiency.goteo)
    expect(gravity).toBeCloseTo((WATER.irrigationEffectiveMm * 10) / 0.55, 6)
    expect(drip).toBeLessThan(gravity * 0.65)
  })

  it('el coeficiente de escorrentía respeta sus límites', () => {
    const max = runoffCoefficient({ slope: 1, rainIntensity: 100, erosion: 100, coverLevel: 0, barrierLevel: 0, shadeLevel: 0 })
    const min = runoffCoefficient({ slope: 0, rainIntensity: 0, erosion: 0, coverLevel: 1, barrierLevel: 1, shadeLevel: 1 })
    expect(max).toBeLessThanOrEqual(WATER.runoffMax)
    expect(min).toBeGreaterThanOrEqual(WATER.runoffMin)
  })
})

describe('Efectos climáticos', () => {
  it('el calor y la sequía aumentan la evapotranspiración', () => {
    const base = { temperature: 20, coverLevel: 0, shadeLevel: 0, bareSoil: false }
    const cloudy = evapotranspirationMm({ ...base, condition: 'nublado' })
    const hot = evapotranspirationMm({ ...base, temperature: 25, condition: 'calor' })
    const drought = evapotranspirationMm({ ...base, condition: 'sequia' })
    expect(hot).toBeGreaterThan(cloudy)
    expect(drought).toBeGreaterThan(cloudy)
  })

  it('el sombrío reduce la evapotranspiración', () => {
    const base = { temperature: 22, condition: 'soleado' as const, coverLevel: 0, bareSoil: false }
    expect(evapotranspirationMm({ ...base, shadeLevel: 1 })).toBeLessThan(evapotranspirationMm({ ...base, shadeLevel: 0 }))
  })

  it('las condiciones extremas reducen el factor climático de producción', () => {
    expect(climateFactor('sequia')).toBeLessThan(climateFactor('soleado'))
    expect(climateFactor('lluvia-intensa')).toBeLessThan(climateFactor('lluvia-moderada'))
  })

  it('la lluvia intensa erosiona más un suelo desnudo que uno protegido', () => {
    const input = {
      erosion: 20,
      precipitationMm: 280,
      rainIntensity: 80,
      slope: 0.5,
      coverLevel: 0,
      barrierLevel: 0,
      shadeLevel: 0,
      landUse: 'cafe' as const,
      stage: 'vegetativo' as const,
      reforestationMaturity: 0,
      multiplier: 1,
    }
    const bare = computeErosion(input)
    const protectedSoil = computeErosion({ ...input, coverLevel: 1, barrierLevel: 1 })
    expect(bare.gain).toBeGreaterThan(protectedSoil.gain * 5)
    expect(protectedSoil.erosion).toBeLessThan(input.erosion)
  })

  it('la sequía afecta la salud del cultivo', () => {
    const base = { health: 80, fertility: 70, temperature: 21, shadeLevel: 0, droughtTolerance: 0, pests: { broca: 0, roya: 0, 'mancha-hierro': 0 } }
    const wet = computeHealth({ ...base, moisture: 60 })
    const dry = computeHealth({ ...base, moisture: 5 })
    expect(dry.health).toBeLessThan(wet.health)
    expect(dry.breakdown.water).toBeGreaterThan(0)
    expect(wet.breakdown.water).toBe(0)
  })
})

describe('Producción = Área × Rendimiento × fF × fH × fS × fC', () => {
  it('multiplica los factores normalizados', () => {
    const kg = computeProduction({
      areaHa: 2,
      baseYieldKgHa: 1000,
      fertilityFactor: 0.8,
      moistureFactor: 0.5,
      healthFactor: 0.9,
      climateFactor: 1,
    })
    expect(kg).toBeCloseTo(2 * 1000 * 0.8 * 0.5 * 0.9, 6)
  })

  it('limita los factores a [0, 1] y evita valores negativos', () => {
    const kg = computeProduction({
      areaHa: 1,
      baseYieldKgHa: 1000,
      fertilityFactor: 1.5,
      moistureFactor: -0.2,
      healthFactor: 1,
      climateFactor: 1,
    })
    expect(kg).toBe(0)
  })

  it('los factores están normalizados y responden al estado', () => {
    expect(fertilityFactor(70)).toBe(1)
    expect(fertilityFactor(0)).toBeCloseTo(0.2, 6)
    expect(moistureFactor(60)).toBe(1)
    expect(moistureFactor(0)).toBeCloseTo(0.2, 6)
    expect(moistureFactor(100)).toBeCloseTo(0.75, 6)
    expect(combinedFactor(80, 60, 100, 'soleado')).toBe(1)
  })
})

describe('Rentabilidad: Ganancia = Ingresos − Costos', () => {
  it('calcula ganancia y margen', () => {
    expect(computeProfit(10_000_000, 7_500_000)).toBe(2_500_000)
    expect(profitMargin(10_000_000, 5_000_000)).toBe(1)
    expect(profitMargin(0, 0)).toBe(0)
  })
})

describe('Contaminación: C(t+1) = C + Aportes − Mitigación', () => {
  const base = {
    contamination: 20,
    chemicalRunoff: 0,
    pesticides: 0,
    sediments: 0,
    wastewater: 0,
    riparianLevel: 0,
    forestFraction: 0,
  }

  it('sin aportes la contaminación se autodepura', () => {
    const r = computeContamination(base)
    expect(r.inputs).toBe(0)
    expect(r.contamination).toBeCloseTo(20 * 0.9, 6)
  })

  it('suma todos los aportes contaminantes', () => {
    const r = computeContamination({ ...base, chemicalRunoff: 2, pesticides: 1, sediments: 1.5, wastewater: 3 })
    expect(r.inputs).toBeCloseTo(7.5, 6)
    expect(r.contamination).toBeGreaterThan(20)
  })

  it('la ronda hídrica protegida aumenta la mitigación', () => {
    const unprotected = computeContamination({ ...base, wastewater: 5 })
    const protectedRiver = computeContamination({ ...base, wastewater: 5, riparianLevel: 1 })
    expect(protectedRiver.contamination).toBeLessThan(unprotected.contamination)
  })

  it('la contaminación deteriora la calidad del agua', () => {
    const clean = computeWaterQuality({ waterQuality: 80, contamination: 5, sediment: 0, riparianLevel: 0 })
    const dirty = computeWaterQuality({ waterQuality: 80, contamination: 70, sediment: 20, riparianLevel: 0 })
    expect(dirty).toBeLessThan(80)
    expect(clean).toBeGreaterThan(dirty)
  })
})

describe('Biodiversidad', () => {
  it('la agroforestería y la reforestación elevan el objetivo; los químicos lo reducen', () => {
    const base = {
      landUse: 'cafe' as const,
      shadeLevel: 0,
      coverLevel: 0,
      barrierLevel: 0,
      reforestationAge: 0,
      chemicalProtection: false,
      soilContamination: 0,
      erosion: 0,
    }
    const sun = biodiversityTarget(base)
    expect(biodiversityTarget({ ...base, shadeLevel: 1 })).toBeGreaterThan(sun)
    expect(biodiversityTarget({ ...base, landUse: 'reforestacion', reforestationAge: 36 })).toBeGreaterThan(sun)
    expect(biodiversityTarget({ ...base, chemicalProtection: true })).toBeLessThan(sun)
  })

  it('converge gradualmente hacia el objetivo', () => {
    const next = computeBiodiversity(30, 80)
    expect(next).toBeGreaterThan(30)
    expect(next).toBeLessThan(80)
  })
})
