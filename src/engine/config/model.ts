/**
 * Coeficientes centralizados del modelo de simulación.
 *
 * IMPORTANTE: EcoFinca es un modelo EDUCATIVO SIMPLIFICADO. Salvo que se
 * indique lo contrario en docs/SIMULATION-MODEL.md, estos coeficientes son
 * parámetros HIPOTÉTICOS de calibración elegidos para producir dinámicas
 * plausibles y didácticas; no son mediciones científicas. Pueden ajustarse
 * aquí sin tocar ninguna fórmula ni componente visual.
 */

import type { ModelParams, PestId, WeatherCondition } from '../domain/types'

export const SCHEMA_VERSION = 1

/** Parámetros por defecto (editables desde Configuración para nuevas partidas). */
export const DEFAULT_PARAMS: ModelParams = {
  // Orden de magnitud coherente con promedios nacionales de café en Colombia
  // (~18–22 sacos de 60 kg cps/ha/año). Valor de calibración.
  baseYieldKgHa: 1300,
  // Precio ficticio de referencia del juego (no es una cotización real).
  coffeeBasePrice: 19_000,
  inputPriceMultiplier: 1,
  monthlyFixedCost: 2_000_000,
  baseLabor: 40,
  laborCost: 75_000,
  // Duraciones orientativas basadas en literatura divulgativa sobre la
  // fenología del café arábica en Colombia (ver docs/SIMULATION-MODEL.md).
  stageDurations: {
    preparacion: 1,
    establecimiento: 3,
    vegetativoInicial: 10,
    vegetativoPostCosecha: 4,
    floracion: 1,
    fructificacion: 4,
    maduracion: 2,
    cosecha: 2,
  },
}

/* ------------------------------------------------------------------ */
/* Agua del suelo (humedad)                                             */
/* ------------------------------------------------------------------ */
export const WATER = {
  /** Puntos de humedad por mm de precipitación (capacidad efectiva ~285 mm). */
  precipPointsPerMm: 0.35,
  /** Puntos de humedad perdidos por mm de evapotranspiración. */
  etPointsPerMm: 0.32,
  /**
   * Por debajo de este nivel de humedad la evapotranspiración real se reduce
   * (cierre estomático): ETreal = ETpot × (mín + (1 − mín) × H / umbral).
   */
  etStressThreshold: 55,
  etMinFraction: 0.2,
  /** Evapotranspiración de referencia mensual a 20 °C (mm). */
  baseEtMm: 96,
  /** Incremento de ET por cada °C sobre 20 °C (mm/mes). */
  etPerDegree: 6,
  etConditionFactor: {
    soleado: 1.1,
    nublado: 0.85,
    'lluvia-moderada': 0.8,
    'lluvia-intensa': 0.75,
    sequia: 1.2,
    calor: 1.25,
  } satisfies Record<WeatherCondition, number>,
  /** Coeficiente de escorrentía base y sus moduladores. */
  runoffBase: 0.22,
  runoffSlope: 0.25,
  runoffIntensity: 0.15,
  runoffErosion: 0.15,
  runoffCover: 0.15,
  runoffBarrier: 0.12,
  runoffShade: 0.05,
  runoffMin: 0.05,
  runoffMax: 0.75,
  /** Capacidad de campo: por encima, el exceso drena en profundidad. */
  drainageThreshold: 70,
  drainageRate: 0.7,
  /** Lámina efectiva aplicada por un riego (mm). */
  irrigationEffectiveMm: 12,
  /** Puntos de humedad por mm de riego efectivo. */
  irrigationPointsPerMm: 1,
  irrigationEfficiency: { gravedad: 0.55, goteo: 0.9 },
  /** Reducción de ET por práctica (fracción con nivel 1). */
  etReductionCover: 0.1,
  etReductionShade: 0.2,
  etIncreaseBare: 0.12,
} as const

/* ------------------------------------------------------------------ */
/* Erosión                                                              */
/* ------------------------------------------------------------------ */
export const EROSION = {
  /** Factor de erosividad de la lluvia. */
  erosivity: 0.8,
  rainExponent: 1.3,
  /** Protección máxima por práctica con nivel 1 (fracción de reducción). */
  coverProtection: 0.75,
  barrierProtection: 0.6,
  shadeProtection: 0.3,
  reforestProtection: 0.85,
  /** Multiplicador por suelo desnudo o recién intervenido. */
  bareSoilFactor: { preparacion: 1.6, establecimiento: 1.3, barbecho: 1.15 },
  /** Recuperación (estabilización) mensual por protección total. */
  recoveryRate: 1.4,
  naturalRecovery: 0.15,
} as const

/* ------------------------------------------------------------------ */
/* Fertilidad                                                           */
/* ------------------------------------------------------------------ */
export const FERTILITY = {
  /** Extracción de nutrientes por etapa (puntos/mes). */
  extraction: {
    preparacion: 0.2,
    establecimiento: 0.5,
    vegetativo: 0.8,
    floracion: 1.3,
    fructificacion: 1.7,
    maduracion: 1.5,
    cosecha: 0.8,
  },
  /** Fracción del nivel de erosión que se pierde como fertilidad cada mes. */
  erosionLevelLoss: 0.012,
  /** Pérdida de fertilidad por cada punto de erosión ganado (capa arable). */
  erosionGainLoss: 0.3,
  /** Pérdida por lixiviación cuando hay drenaje con carga química. */
  leachingLoss: 0.03,
  /** Acidificación por carga química residual. */
  acidification: 0.012,
  contaminationLoss: 0.01,
  /** Mineralización mensual del pool orgánico (fracción). */
  organicRelease: 0.22,
  coverGain: 0.35,
  shadeGain: 0.3,
  fallowGain: 0.6,
  reforestGain: 0.5,
  /** Ganancia por biota del suelo cuando la biodiversidad supera 50. */
  biotaGain: 0.006,
  /** Fertilización: puntos por dosis recomendada. */
  chemicalPoints: 12,
  organicPoolPoints: 16,
  organicImmediate: 2,
  chemicalLoadPerDose: 16,
  /** Por encima de este nivel, el fertilizante químico es exceso. */
  excessThreshold: 82,
  doseMultiplier: { baja: 0.5, recomendada: 1, alta: 1.75 },
} as const

/* ------------------------------------------------------------------ */
/* Salud del cultivo                                                    */
/* ------------------------------------------------------------------ */
export const HEALTH = {
  recoveryRate: 0.25,
  /** El daño mensual reduce la recuperación: factor = máx(piso, 1 − daño/divisor). */
  stressDivisor: 30,
  stressFloor: 0.2,
  waterStressDamage: 20,
  heatThreshold: 24,
  heatDamagePerDegree: 4,
  lowFertilityDamage: 10,
  waterloggingThreshold: 92,
  waterloggingDamage: 5,
  maintenanceBoost: 8,
  /** Salud por debajo de la cual una siembra joven muere. */
  establishmentDeath: 18,
} as const

/* ------------------------------------------------------------------ */
/* Producción                                                           */
/* ------------------------------------------------------------------ */
export const PRODUCTION = {
  /** Factor de fertilidad: rampa entre 0 y el óptimo. */
  fertilityOptimum: 70,
  fertilityMinFactor: 0.2,
  /** Factor hídrico trapezoidal. */
  moistureLowOpt: 40,
  moistureHighOpt: 82,
  moistureMinLow: 0.2,
  moistureMinHigh: 0.75,
  climateFactor: {
    soleado: 1,
    nublado: 0.97,
    'lluvia-moderada': 1,
    'lluvia-intensa': 0.88,
    sequia: 0.78,
    calor: 0.85,
  } satisfies Record<WeatherCondition, number>,
  /** Primera cosecha de una planta joven. */
  firstHarvestFactor: 0.55,
  /** Plantas viejas (meses) pierden productividad. */
  oldAgeMonths: 96,
  oldAgeFactor: 0.8,
  /** Penalización por sombrío denso sobre el potencial. */
  shadeYieldPenalty: 0.1,
  /** Pérdida de cosecha por cada punto de incidencia de broca. */
  brocaLossPerPoint: 0.006,
  /** Pérdida si se cosecha en el segundo mes de la ventana (sobremaduración). */
  lateHarvestLoss: 0.3,
  /** Densidad de siembra (plantas/ha). */
  plantsPerHa: 5000,
} as const

/* ------------------------------------------------------------------ */
/* Plagas y enfermedades                                                */
/* ------------------------------------------------------------------ */
export const PESTS = {
  baseOutbreakChance: 0.035,
  outbreakMin: 8,
  outbreakMax: 18,
  naturalMortality: 0.12,
  spreadRate: 0.08,
  /** Reducción del crecimiento por enemigos naturales (por punto de biodiversidad). */
  biocontrolPerPoint: 0.005,
  healthDamage: { broca: 0.03, roya: 0.2, 'mancha-hierro': 0.12 } satisfies Record<PestId, number>,
  chemical: { reduction: 0.75, months: 2, protection: 0.65, biodiversityLoss: 12, soilContamination: 10, farmLoad: 4 },
  integrated: { reduction: 0.5, months: 3, protection: 0.55, biodiversityGain: 2 },
  maintenanceReduction: 0.15,
} as const

/* ------------------------------------------------------------------ */
/* Contaminación y calidad de agua                                      */
/* ------------------------------------------------------------------ */
export const CONTAMINATION = {
  /** Fracción de la carga química que se transporta por escorrentía. */
  chemicalRunoffFactor: 0.18,
  chemicalLoadDecay: 0.35,
  sedimentFactor: 0.4,
  /** Puntos de contaminación por kg cps beneficiado (aguas mieles). */
  processingPerKg: 0.006,
  ecoProcessingReduction: 0.85,
  domesticLoad: 0.6,
  domesticLoadEco: 0.15,
  /** Autodepuración natural (fracción mensual). */
  selfPurification: 0.1,
  riparianMitigation: 0.15,
  forestMitigation: 0.05,
  barrierTrapping: 0.4,
  /** Dinámica del suelo. */
  soilDecay: 0.08,
  soilBioremediation: 0.05,
  soilFromChemicalLoad: 0.12,
  /** Calidad de agua: velocidad de ajuste hacia el objetivo. */
  waterQualityRate: 0.3,
  waterQualityContamination: 0.85,
  waterQualitySediment: 0.4,
  waterQualityRiparian: 10,
} as const

/* ------------------------------------------------------------------ */
/* Biodiversidad                                                        */
/* ------------------------------------------------------------------ */
export const BIODIVERSITY = {
  rate: 0.12,
  base: { cafe: 30, barbecho: 42, reforestacion: 45 },
  shadeBonus: 35,
  coverBonus: 12,
  barrierBonus: 8,
  reforestMaturityBonus: 40,
  /** Meses para que una reforestación alcance madurez de referencia. */
  reforestMaturityMonths: 36,
  chemicalPenalty: 15,
  contaminationPenalty: 0.3,
  erosionPenalty: 0.1,
  forestBase: 75,
  forestRiparianBonus: 15,
  riparianBase: 35,
  riparianBonus: 45,
  degradedArea: 12,
} as const

/* ------------------------------------------------------------------ */
/* Recursos hídricos de la finca                                        */
/* ------------------------------------------------------------------ */
export const WATER_RESOURCES = {
  /** Consumo doméstico y operativo mensual (m³). */
  domesticUse: 25,
  /** Litros de agua por kg cps en beneficio tradicional vs ecológico. */
  processingLitersPerKg: { tradicional: 40, ecologico: 1.5 },
  streamFlowRate: 0.35,
  streamBase: 30,
  streamPrecip: 45,
  streamForest: 15,
  streamRiparian: 15,
} as const

/* ------------------------------------------------------------------ */
/* Prácticas progresivas: meses para alcanzar nivel 1                   */
/* ------------------------------------------------------------------ */
export const ESTABLISHMENT_MONTHS = {
  cover: 3,
  barrier: 6,
  shade: 12,
  riparian: 12,
} as const

/* ------------------------------------------------------------------ */
/* Puntuación                                                           */
/* ------------------------------------------------------------------ */
export const SCORING = {
  weights: { productivity: 0.3, profitability: 0.3, sustainability: 0.4 },
  sustainabilityWeights: {
    fertility: 0.18,
    erosion: 0.18,
    waterQuality: 0.18,
    biodiversity: 0.18,
    contamination: 0.14,
    water: 0.14,
  },
  /** Topes: una finca con baja sostenibilidad no puede obtener buena nota. */
  capLowSustainability: { below: 40, max: 49 },
  capMediumSustainability: { below: 60, max: 64 },
  thresholds: { excelente: 80, buena: 65, aceptable: 50 },
  excellentMinSustainability: 70,
} as const

/* ------------------------------------------------------------------ */
/* Condiciones de fracaso                                               */
/* ------------------------------------------------------------------ */
export const FAILURE = {
  negativeMoneyMonths: 3,
  /** Deuda máxima como fracción del presupuesto inicial. */
  maxDebtFraction: 0.4,
  collapseSustainability: 20,
  collapseMonths: 3,
} as const

export const DIFFICULTY = {
  facil: { budget: 1.25, events: 0.7, variability: 0.16, pests: 0.7, fixedCost: 0.9, labor: 10, priceVolatility: 0.035 },
  normal: { budget: 1, events: 1, variability: 0.25, pests: 1, fixedCost: 1, labor: 0, priceVolatility: 0.05 },
  dificil: { budget: 0.8, events: 1.35, variability: 0.33, pests: 1.35, fixedCost: 1.1, labor: -5, priceVolatility: 0.07 },
} as const
