/**
 * Módulo climático: genera el clima de cada mes de forma determinista a
 * partir de la semilla, el perfil del escenario, la dificultad y los
 * modificadores de eventos activos (p. ej., sequía prolongada).
 */

import { DIFFICULTY } from '../config/model'
import type { ClimateState, Difficulty, Modifiers, WeatherCondition } from '../domain/types'
import { clamp, clamp100, round } from '../lib/math'
import { normal, rngFor } from '../lib/rng'
import { CLIMATE_PROFILE, type ScenarioClimate } from '../scenarios/scenarios'

export interface ClimateInput {
  seed: number
  turn: number
  month: number
  scenario: ScenarioClimate
  difficulty: Difficulty
  modifiers: Pick<Modifiers, 'precipitationMult' | 'temperatureAdd' | 'rainIntensityAdd'>
}

export function normalPrecipitation(month: number, scenario: ScenarioClimate): number {
  return (CLIMATE_PROFILE.precipitation[month % 12] ?? 150) * scenario.precipitationMult
}

export function normalTemperature(month: number, scenario: ScenarioClimate): number {
  return (CLIMATE_PROFILE.temperature[month % 12] ?? 21) + scenario.temperatureAdd
}

export function classifyCondition(args: {
  precipitation: number
  normal: number
  temperature: number
  normalTemp: number
  rainIntensity: number
  humidity: number
}): WeatherCondition {
  const ratio = args.normal > 0 ? args.precipitation / args.normal : 1
  if (args.precipitation < 70 && ratio < 0.6) return 'sequia'
  if (args.temperature >= args.normalTemp + 1.8) return 'calor'
  if (args.precipitation >= 230 || args.rainIntensity >= 78) return 'lluvia-intensa'
  if (args.precipitation >= 150) return 'lluvia-moderada'
  return args.humidity >= 78 ? 'nublado' : 'soleado'
}

export function generateClimate(input: ClimateInput): ClimateState {
  const rng = rngFor(input.seed, input.turn, 'climate')
  const variability = DIFFICULTY[input.difficulty].variability
  const normalP = normalPrecipitation(input.month, input.scenario)
  const normalT = normalTemperature(input.month, input.scenario)

  // Anomalía lognormal con media 1.
  const zP = normal(rng)
  const anomaly = Math.exp(variability * zP - (variability * variability) / 2)
  const precipitation = Math.max(0, normalP * anomaly * input.modifiers.precipitationMult)

  const ratio = normalP > 0 ? precipitation / normalP : 1
  const zT = normal(rng)
  const temperature =
    normalT + 0.6 * zT + input.modifiers.temperatureAdd + (ratio < 1 ? 0.8 * (1 - ratio) : -0.2 * Math.min(1, ratio - 1))

  const humidity = clamp(55 + precipitation / 8 - (temperature - 21) * 2 + (rng() - 0.5) * 6, 35, 98)
  const rainIntensity = clamp100(
    (precipitation / 3.4) * (0.75 + 0.5 * rng()) + input.scenario.intensityAdd + input.modifiers.rainIntensityAdd,
  )
  const droughtRisk = clamp100(100 * (1 - ratio) + (temperature - normalT) * 12 + 15)

  const condition = classifyCondition({ precipitation, normal: normalP, temperature, normalTemp: normalT, rainIntensity, humidity })

  return {
    turn: input.turn,
    month: input.month,
    temperature: round(temperature, 1),
    precipitation: round(precipitation, 0),
    normalPrecipitation: round(normalP, 0),
    humidity: round(humidity, 0),
    droughtRisk: round(droughtRisk, 0),
    rainIntensity: round(rainIntensity, 0),
    condition,
  }
}

export interface ClimateOutlook {
  month: number
  normalPrecipitation: number
  normalTemperature: number
  expectedPrecipitation: number
  expectedTemperature: number
}

/** Perspectiva climática estacional (valores esperados, sin aleatoriedad). */
export function climateOutlook(
  startMonth: number,
  months: number,
  scenario: ScenarioClimate,
  modifiers: Pick<Modifiers, 'precipitationMult' | 'temperatureAdd'>,
  activeMonths = 0,
): ClimateOutlook[] {
  const out: ClimateOutlook[] = []
  for (let i = 0; i < months; i++) {
    const month = (startMonth + i) % 12
    const affected = i < activeMonths
    const np = normalPrecipitation(month, scenario)
    const nt = normalTemperature(month, scenario)
    out.push({
      month,
      normalPrecipitation: round(np, 0),
      normalTemperature: round(nt, 1),
      expectedPrecipitation: round(np * (affected ? modifiers.precipitationMult : 1), 0),
      expectedTemperature: round(nt + (affected ? modifiers.temperatureAdd : 0), 1),
    })
  }
  return out
}

export const CONDITION_INFO: Record<WeatherCondition, { name: string; description: string }> = {
  soleado: { name: 'Soleado', description: 'Cielo despejado y buena radiación. Aumenta la evapotranspiración.' },
  nublado: { name: 'Nublado', description: 'Nubosidad alta, menor evaporación y temperaturas moderadas.' },
  'lluvia-moderada': { name: 'Lluvia moderada', description: 'Lluvias regulares que recargan la humedad del suelo.' },
  'lluvia-intensa': {
    name: 'Lluvia intensa',
    description: 'Aguaceros fuertes: alto riesgo de erosión, escorrentía y lavado de nutrientes.',
  },
  sequia: { name: 'Sequía', description: 'Lluvias muy por debajo de lo normal. El suelo pierde humedad rápidamente.' },
  calor: { name: 'Temperatura elevada', description: 'Temperaturas por encima de lo normal: estrés térmico y más broca.' },
}
