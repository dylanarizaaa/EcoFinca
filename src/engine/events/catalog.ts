/**
 * Catálogo extensible de eventos. Para agregar un evento basta con añadir una
 * nueva definición a EVENT_CATALOG; el motor se encarga de evaluar sus
 * condiciones, probabilidades, duración, modificadores y respuestas.
 */

import { VARIETIES } from '../config/crops'
import { PESTS } from '../config/model'
import { addTransaction } from '../domain/ledger'
import { hasFruits, plantedParcels } from '../domain/selectors'
import type {
  Cost,
  EventCategory,
  EventSeverity,
  GameState,
  Modifiers,
  Parcel,
} from '../domain/types'
import { clamp01, clamp100, round } from '../lib/math'
import type { Rng } from '../lib/rng'
import { computeScores } from '../rules/scoring'
import { SCENARIOS } from '../scenarios/scenarios'

export interface EventContext {
  rng: Rng
  targetParcelId: string | null
}

export interface EventResponse {
  id: string
  label: string
  description: string
  /** Costo de la respuesta (puede depender del estado). */
  cost: (state: GameState) => Cost
  /** Aplica los efectos inmediatos sobre el borrador del estado y devuelve un mensaje. */
  apply: (draft: GameState, ctx: EventContext) => string
  /** Modificadores que reemplazan a los del evento mientras siga activo. */
  modifiers?: Partial<Modifiers>
  /** Si es true, el evento termina al elegir esta respuesta. */
  endsEvent?: boolean
}

export interface EventDefinition {
  id: string
  name: string
  description: string
  category: EventCategory
  severity: EventSeverity
  durationMonths: number
  cooldownMonths: number
  conditionText: string
  probabilityText: string
  impactText: string
  condition: (state: GameState) => boolean
  probability: (state: GameState) => number
  modifiers?: Partial<Modifiers>
  /** Selecciona la parcela afectada, si el evento es localizado. */
  selectTarget?: (state: GameState, rng: Rng) => string | null
  /** Impacto inmediato al iniciar. */
  onStart?: (draft: GameState, ctx: EventContext) => string
  responses: EventResponse[]
  /** Respuesta aplicada automáticamente si el jugador no decide. */
  defaultResponseId?: string
}

const NO_COST: Cost = { money: 0, labor: 0, resources: {} }
const cost = (money: number, labor = 0, resources: Cost['resources'] = {}): Cost => ({ money, labor, resources })

const ignore = (label = 'No hacer nada', description = 'Asumir el impacto sin invertir recursos.'): EventResponse => ({
  id: 'ignorar',
  label,
  description,
  cost: () => NO_COST,
  apply: () => 'Se decidió no intervenir.',
})

const coffeeArea = (s: GameState) => plantedParcels(s).reduce((a, p) => a + p.areaHa, 0)

function parcelById(state: GameState, id: string | null): Parcel | undefined {
  return id ? state.parcels.find((p) => p.id === id) : undefined
}

function pickParcel(parcels: Parcel[], rng: Rng): string | null {
  if (parcels.length === 0) return null
  return parcels[Math.floor(rng() * parcels.length)]?.id ?? null
}

const DRY_MONTHS = [0, 1, 6, 7, 11]
const WET_MONTHS = [2, 3, 4, 8, 9, 10]

export const EVENT_CATALOG: readonly EventDefinition[] = [
  {
    id: 'sequia-prolongada',
    name: 'Sequía prolongada',
    description:
      'Un fenómeno de variabilidad climática reduce drásticamente las lluvias durante varios meses. La quebrada baja su caudal y los suelos se secan.',
    category: 'clima',
    severity: 'peligro',
    durationMonths: 3,
    cooldownMonths: 8,
    conditionText: 'Temporada seca (dic–feb, jun–ago) o escenario con déficit hídrico.',
    probabilityText: '≈6 % mensual; ×2 en crisis hídrica; mayor en dificultad alta.',
    impactText: 'Lluvia −60 %, temperatura +1,5 °C, caudal −30 % durante 3 meses.',
    condition: (s) => DRY_MONTHS.includes(s.calendar.month) || s.config.scenarioId === 'crisis-hidrica',
    probability: (s) => 0.06 * SCENARIOS[s.config.scenarioId].climate.droughtEventMult,
    modifiers: { precipitationMult: 0.4, temperatureAdd: 1.5, streamFlowMult: 0.7 },
    responses: [
      {
        id: 'mantillo',
        label: 'Aplicar mantillo en los cafetales',
        description: 'Cubrir el suelo con residuos vegetales para reducir la evaporación (+10 de humedad inmediata).',
        cost: (s) => cost(Math.round(250_000 * coffeeArea(s)), round(1.5 * coffeeArea(s), 1)),
        apply: (d) => {
          for (const p of plantedParcels(d)) {
            p.soil.moisture = clamp100(p.soil.moisture + 10)
            p.soil.organicPool += 2
          }
          return 'El mantillo conserva la humedad del suelo y aporta materia orgánica.'
        },
      },
      {
        id: 'ahorro',
        label: 'Plan de ahorro de agua',
        description: 'Reorganizar los usos del agua de la finca para reducir el impacto sobre el caudal disponible.',
        cost: () => cost(150_000, 3),
        apply: () => 'Se priorizan los usos esenciales del agua.',
        modifiers: { precipitationMult: 0.4, temperatureAdd: 1.5, streamFlowMult: 0.88 },
      },
      ignore(),
    ],
    defaultResponseId: 'ignorar',
  },
  {
    id: 'lluvias-intensas',
    name: 'Temporada de lluvias intensas',
    description: 'Aguaceros fuertes y continuos saturan el suelo. Las laderas sin protección pierden suelo rápidamente.',
    category: 'clima',
    severity: 'advertencia',
    durationMonths: 2,
    cooldownMonths: 6,
    conditionText: 'Temporadas de lluvia (mar–may, sep–nov).',
    probabilityText: '≈7 % mensual; ×1,3 en suelo degradado; ×0,5 en crisis hídrica.',
    impactText: 'Lluvia +70 %, intensidad +25, erosión ×1,2 durante 2 meses.',
    condition: (s) => WET_MONTHS.includes(s.calendar.month),
    probability: (s) => 0.07 * SCENARIOS[s.config.scenarioId].climate.rainEventMult,
    modifiers: { precipitationMult: 1.7, rainIntensityAdd: 25, erosionMult: 1.2 },
    responses: [
      {
        id: 'drenajes',
        label: 'Limpiar drenajes y zanjas',
        description: 'Adecuar canales de drenaje y zanjas de coronación para conducir el agua sin arrastrar suelo.',
        cost: () => cost(600_000, 6),
        apply: () => 'Los drenajes reducen la energía de la escorrentía.',
        modifiers: { precipitationMult: 1.7, rainIntensityAdd: 25, erosionMult: 0.85 },
      },
      ignore(),
    ],
    defaultResponseId: 'ignorar',
  },
  {
    id: 'brote-broca',
    name: 'Brote de broca',
    description: 'Se detecta un foco de broca del café en un lote con frutos. Puede propagarse a los lotes vecinos.',
    category: 'plagas',
    severity: 'peligro',
    durationMonths: 1,
    cooldownMonths: 4,
    conditionText: 'Al menos una parcela con frutos en desarrollo o maduros.',
    probabilityText: '≈5 % mensual; ×1,5 con temperaturas > 22 °C; reducido por biodiversidad.',
    impactText: '+25 de incidencia de broca en la parcela afectada y +8 en sus vecinas.',
    condition: (s) => s.parcels.some(hasFruits),
    probability: (s) =>
      0.05 * (s.climate.temperature > 22 ? 1.5 : 1) * (1 - clamp01(s.environment.biodiversity * PESTS.biocontrolPerPoint)),
    selectTarget: (s, rng) => pickParcel(s.parcels.filter(hasFruits), rng),
    onStart: (d, ctx) => {
      const target = parcelById(d, ctx.targetParcelId)
      if (!target) return 'El foco se controló naturalmente.'
      target.pests.broca = clamp100(target.pests.broca + 25)
      for (const n of target.neighbors) {
        const np = parcelById(d, n)
        if (np && np.crop) np.pests.broca = clamp100(np.pests.broca + 8)
      }
      return `Foco de broca en ${target.name} (${target.id}).`
    },
    responses: [
      {
        id: 'mip',
        label: 'Campaña de manejo integrado',
        description: 'Recolección de frutos brocados (re-re), trampas y hongo Beauveria bassiana. Reduce 55 % la incidencia sin dañar la fauna benéfica.',
        cost: () => cost(400_000, 6),
        apply: (d, ctx) => {
          const t = parcelById(d, ctx.targetParcelId)
          if (t) {
            t.pests.broca = round(t.pests.broca * 0.45, 2)
            t.biodiversity = clamp100(t.biodiversity + 2)
            t.protection = { monthsRemaining: 2, method: 'integrado' }
          }
          return 'El MIP redujo el foco de broca y conservó los enemigos naturales.'
        },
      },
      {
        id: 'quimico',
        label: 'Fumigación química',
        description: 'Insecticida en el lote y sus vecinos. Reduce 70 % la incidencia, pero contamina y afecta la biodiversidad.',
        cost: () => cost(500_000, 3),
        apply: (d, ctx) => {
          const t = parcelById(d, ctx.targetParcelId)
          const affected = t ? [t, ...t.neighbors.map((n) => parcelById(d, n)).filter((p): p is Parcel => !!p)] : []
          for (const p of affected) {
            p.pests.broca = round(p.pests.broca * 0.3, 2)
            p.soil.contamination = clamp100(p.soil.contamination + 8)
            p.biodiversity = clamp100(p.biodiversity - 10)
          }
          d.tracker.pesticideLoad += 4
          return 'La fumigación controló la broca, pero aumentó la contaminación y redujo la fauna benéfica.'
        },
      },
      ignore('No intervenir', 'La plaga seguirá creciendo y puede propagarse.'),
    ],
    defaultResponseId: 'ignorar',
  },
  {
    id: 'epidemia-roya',
    name: 'Epidemia de roya',
    description: 'Las condiciones húmedas favorecen la roya del cafeto en las variedades susceptibles.',
    category: 'plagas',
    severity: 'peligro',
    durationMonths: 2,
    cooldownMonths: 8,
    conditionText: 'Humedad ambiental > 80 % o cafetales de variedad susceptible (Caturra).',
    probabilityText: '≈3 % mensual; +6 % con variedades susceptibles y clima húmedo.',
    impactText: '+20 de incidencia de roya × susceptibilidad de la variedad en todos los cafetales.',
    condition: (s) =>
      s.climate.humidity > 80 || plantedParcels(s).some((p) => p.crop?.variety === 'caturra'),
    probability: (s) => {
      const susceptible = plantedParcels(s).some((p) => (p.crop?.variety ? VARIETIES[p.crop.variety].rustSusceptibility : 0) >= 0.5)
      return 0.03 + (susceptible && s.climate.humidity > 75 ? 0.06 : 0)
    },
    onStart: (d) => {
      let count = 0
      for (const p of plantedParcels(d)) {
        const susc = p.crop?.variety ? VARIETIES[p.crop.variety].rustSusceptibility : 0
        p.pests.roya = clamp100(p.pests.roya + 20 * susc)
        if (susc >= 0.5) count++
      }
      return count > 0
        ? `La roya avanza en ${count} lote(s) de variedad susceptible.`
        : 'Las variedades resistentes limitan el avance de la roya.'
    },
    responses: [
      {
        id: 'fungicida',
        label: 'Aplicar fungicida',
        description: 'Reduce 60 % la roya en todos los lotes. Aumenta la contaminación.',
        cost: (s) => cost(Math.round(280_000 * coffeeArea(s)), round(2 * coffeeArea(s), 1)),
        apply: (d) => {
          for (const p of plantedParcels(d)) {
            p.pests.roya = round(p.pests.roya * 0.4, 2)
            p.soil.contamination = clamp100(p.soil.contamination + 5)
          }
          d.tracker.pesticideLoad += 3
          return 'El fungicida frenó la epidemia a costa de más residuos químicos.'
        },
      },
      {
        id: 'nutricion',
        label: 'Nutrición balanceada y regulación de sombra',
        description: 'Plantas bien nutridas resisten mejor: −25 % de roya y +5 de salud, usando 10 bultos de abono orgánico.',
        cost: () => cost(300_000, 4, { abonoOrganico: 10 }),
        apply: (d) => {
          for (const p of plantedParcels(d)) {
            p.pests.roya = round(p.pests.roya * 0.75, 2)
            if (p.crop) p.crop.health = clamp100(p.crop.health + 5)
            p.soil.organicPool += 10 / Math.max(1, plantedParcels(d).length)
          }
          return 'Las plantas fortalecidas resisten mejor la enfermedad.'
        },
      },
      ignore(),
    ],
    defaultResponseId: 'ignorar',
  },
  {
    id: 'disminucion-caudal',
    name: 'Disminución del caudal de la quebrada',
    description: 'Varios usuarios aguas arriba y la falta de lluvias reducen el agua disponible por la concesión.',
    category: 'recursos',
    severity: 'advertencia',
    durationMonths: 3,
    cooldownMonths: 8,
    conditionText: 'Caudal < 55 o temporada seca.',
    probabilityText: '≈5 % mensual; mayor en escenarios con déficit hídrico.',
    impactText: 'Ingreso de agua al reservorio −45 % durante 3 meses.',
    condition: (s) => s.environment.streamFlow < 55 || DRY_MONTHS.includes(s.calendar.month),
    probability: (s) => 0.05 * Math.sqrt(SCENARIOS[s.config.scenarioId].climate.droughtEventMult),
    modifiers: { streamFlowMult: 0.55 },
    responses: [
      {
        id: 'acuerdo',
        label: 'Acuerdo comunitario de turnos',
        description: 'Concertar con los vecinos turnos de captación. Reduce el impacto a −25 %.',
        cost: () => cost(150_000, 2),
        apply: () => 'El acuerdo comunitario distribuye mejor el agua disponible.',
        modifiers: { streamFlowMult: 0.75 },
      },
      {
        id: 'carrotanque',
        label: 'Contratar carrotanque (80 m³)',
        description: 'Comprar agua externa para el reservorio. Solución rápida pero costosa.',
        cost: () => cost(1_050_000),
        apply: (d) => {
          d.inventory.agua = Math.min(d.infrastructure.reservoirCapacity, d.inventory.agua + 80)
          return 'Se abastecieron 80 m³ de agua por carrotanque.'
        },
      },
      ignore(),
    ],
    defaultResponseId: 'ignorar',
  },
  {
    id: 'recuperacion-biodiversidad',
    name: 'Recuperación de la biodiversidad',
    description: 'Se observan nuevas especies de aves e insectos benéficos en la finca: los controladores naturales regresan.',
    category: 'ambiente',
    severity: 'positivo',
    durationMonths: 3,
    cooldownMonths: 10,
    conditionText: 'Biodiversidad ≥ 55 y calidad del agua ≥ 60.',
    probabilityText: '≈8 % mensual cuando se cumplen las condiciones.',
    impactText: 'Presión de plagas −30 % durante 3 meses.',
    condition: (s) => s.environment.biodiversity >= 55 && s.environment.waterQuality >= 60,
    probability: () => 0.08,
    modifiers: { pestPressureMult: 0.7 },
    responses: [
      {
        id: 'aviturismo',
        label: 'Organizar recorrido de aviturismo',
        description: 'Recibir visitantes para observar aves: ingreso adicional de $1.200.000.',
        cost: () => cost(0, 4),
        apply: (d) => {
          addTransaction(d, 'ingreso', 'evento', 'Recorrido de aviturismo', 1_200_000)
          return 'El aviturismo generó ingresos complementarios.'
        },
      },
      {
        id: 'monitoreo',
        label: 'Monitoreo participativo',
        description: 'Registrar especies con la comunidad. Mejora la protección de la ronda hídrica (+5 %).',
        cost: () => cost(100_000, 2),
        apply: (d) => {
          if (d.environment.riparian.active) d.environment.riparian.level = clamp01(d.environment.riparian.level + 0.05)
          d.environment.biodiversity = clamp100(d.environment.biodiversity + 1)
          return 'El monitoreo comunitario fortaleció la conservación.'
        },
      },
      ignore('Solo celebrar', 'Disfrutar del avistamiento sin acciones adicionales.'),
    ],
    defaultResponseId: 'ignorar',
  },
  {
    id: 'alza-insumos',
    name: 'Incremento de costos de insumos',
    description: 'El precio de los fertilizantes y plaguicidas sube por factores externos de mercado.',
    category: 'mercado',
    severity: 'advertencia',
    durationMonths: 4,
    cooldownMonths: 10,
    conditionText: 'A partir del tercer mes de partida.',
    probabilityText: '≈5 % mensual.',
    impactText: 'Precios de insumos +30 % durante 4 meses.',
    condition: (s) => s.turn >= 3,
    probability: () => 0.05,
    modifiers: { inputPriceMult: 1.3 },
    responses: [
      {
        id: 'compost',
        label: 'Producir compost en la finca',
        description: 'Compostar residuos de cosecha y pulpa: +15 bultos de abono orgánico.',
        cost: () => cost(200_000, 6),
        apply: (d) => {
          d.inventory.abonoOrganico += 15
          return 'Se produjeron 15 bultos de compost propio.'
        },
      },
      ignore('Comprar a precio de mercado'),
    ],
    defaultResponseId: 'ignorar',
  },
  {
    id: 'oportunidad-comercial',
    name: 'Oportunidad comercial: café sostenible',
    description: 'Un comprador de cafés especiales ofrece una prima por café producido con buenas prácticas ambientales.',
    category: 'mercado',
    severity: 'positivo',
    durationMonths: 3,
    cooldownMonths: 9,
    conditionText: 'Sostenibilidad ≥ 58 y café almacenado o cosecha próxima.',
    probabilityText: '≈8 % mensual cuando se cumplen las condiciones.',
    impactText: 'Si se acepta: precio de venta +18 % durante 3 meses.',
    condition: (s) =>
      computeScores(s).sustainability >= 58 &&
      (s.inventory.cafe > 0 || s.parcels.some((p) => p.crop?.stage === 'maduracion' || p.crop?.stage === 'cosecha')),
    probability: () => 0.08,
    responses: [
      {
        id: 'aceptar',
        label: 'Firmar contrato',
        description: 'Análisis de calidad y trazabilidad ($300.000). Precio +18 % durante el contrato.',
        cost: () => cost(300_000, 2),
        apply: () => 'Contrato firmado: el café se venderá con prima.',
        modifiers: { coffeePriceMult: 1.18 },
      },
      {
        id: 'rechazar',
        label: 'Rechazar oferta',
        description: 'Seguir vendiendo al precio corriente.',
        cost: () => NO_COST,
        apply: () => 'Se rechazó la oferta comercial.',
        endsEvent: true,
      },
    ],
    defaultResponseId: 'rechazar',
  },
  {
    id: 'inspeccion-ambiental',
    name: 'Inspección de la autoridad ambiental',
    description: 'La corporación autónoma regional visita la finca por quejas de contaminación en la quebrada.',
    category: 'social',
    severity: 'peligro',
    durationMonths: 1,
    cooldownMonths: 8,
    conditionText: 'Contaminación ≥ 45 o calidad del agua < 45.',
    probabilityText: '≈12 % mensual cuando se cumplen las condiciones.',
    impactText: 'Multa de $3.000.000 si no se presenta un plan de manejo ambiental.',
    condition: (s) => s.environment.contamination >= 45 || s.environment.waterQuality < 45,
    probability: () => 0.12,
    responses: [
      {
        id: 'plan',
        label: 'Presentar plan de manejo ambiental',
        description: 'Compromiso de reducción de vertimientos: −5 de contaminación inmediata.',
        cost: () => cost(1_500_000, 4),
        apply: (d) => {
          d.environment.contamination = clamp100(d.environment.contamination - 5)
          return 'La autoridad aceptó el plan de manejo ambiental.'
        },
      },
      {
        id: 'multa',
        label: 'Asumir la sanción',
        description: 'Pagar una multa de $3.000.000.',
        cost: () => NO_COST,
        apply: (d) => {
          addTransaction(d, 'gasto', 'multa', 'Multa ambiental', 3_000_000)
          return 'Se pagó una multa ambiental de $3.000.000.'
        },
      },
    ],
    defaultResponseId: 'multa',
  },
  {
    id: 'capacitacion',
    name: 'Capacitación técnica',
    description: 'El servicio de extensión rural ofrece un taller de buenas prácticas agrícolas con insumos demostrativos.',
    category: 'social',
    severity: 'info',
    durationMonths: 1,
    cooldownMonths: 12,
    conditionText: 'A partir del segundo mes de partida.',
    probabilityText: '≈5 % mensual.',
    impactText: 'Si asistes: +2 dosis de control biológico y +10 bultos de abono orgánico.',
    condition: (s) => s.turn >= 2,
    probability: () => 0.05,
    responses: [
      {
        id: 'asistir',
        label: 'Asistir al taller',
        description: 'Dedicar 2 jornales al taller y recibir insumos demostrativos.',
        cost: () => cost(0, 2),
        apply: (d) => {
          d.inventory.controlBiologico += 2
          d.inventory.abonoOrganico += 10
          return 'Recibiste insumos demostrativos para practicar MIP y abonado orgánico.'
        },
      },
      ignore('No asistir'),
    ],
    defaultResponseId: 'ignorar',
  },
  {
    id: 'ola-calor',
    name: 'Ola de calor',
    description: 'Temperaturas máximas muy por encima de lo normal estresan los cafetales a plena exposición.',
    category: 'clima',
    severity: 'advertencia',
    durationMonths: 2,
    cooldownMonths: 8,
    conditionText: 'Meses secos del año.',
    probabilityText: '≈4 % mensual; mayor en crisis hídrica.',
    impactText: 'Temperatura +2,5 °C durante 2 meses.',
    condition: (s) => DRY_MONTHS.includes(s.calendar.month),
    probability: (s) => 0.04 * Math.sqrt(SCENARIOS[s.config.scenarioId].climate.droughtEventMult),
    modifiers: { temperatureAdd: 2.5 },
    responses: [
      {
        id: 'sombrio-transitorio',
        label: 'Sembrar sombrío transitorio',
        description: 'Plátano o higuerilla entre los surcos: inicia el sombrío en todos los cafetales.',
        cost: (s) => cost(Math.round(250_000 * coffeeArea(s)), round(coffeeArea(s), 1)),
        apply: (d) => {
          for (const p of plantedParcels(d)) {
            p.practices.shade = { active: true, level: Math.max(p.practices.shade.level, 0.15) }
          }
          return 'El sombrío transitorio reduce el estrés térmico.'
        },
      },
      ignore(),
    ],
    defaultResponseId: 'ignorar',
  },
]

export const EVENT_BY_ID: Record<string, EventDefinition> = Object.fromEntries(EVENT_CATALOG.map((e) => [e.id, e]))

export function getEventDefinition(id: string): EventDefinition | undefined {
  return EVENT_BY_ID[id]
}
