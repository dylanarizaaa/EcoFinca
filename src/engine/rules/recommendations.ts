/** Generador de recomendaciones basado en reglas sobre el estado de la finca. */

import { RESOURCES } from '../config/economy'
import { farmIndicators, maxPestIncidence } from '../domain/selectors'
import type { GameState, Recommendation } from '../domain/types'
import { computeScores } from './scoring'

interface Rule {
  id: string
  priority: Recommendation['priority']
  when: (s: GameState) => boolean
  title: string
  detail: (s: GameState) => string
}

const RULES: Rule[] = [
  {
    id: 'erosion-alta',
    priority: 'alta',
    when: (s) => farmIndicators(s).erosion > 45,
    title: 'Controla la erosión',
    detail: () =>
      'La erosión promedio es alta. Establece cobertura vegetal y barreras vivas en las parcelas con mayor pendiente; reducen la pérdida de suelo y la escorrentía.',
  },
  {
    id: 'fertilidad-baja',
    priority: 'alta',
    when: (s) => farmIndicators(s).fertility < 45,
    title: 'Recupera la fertilidad del suelo',
    detail: () =>
      'La fertilidad está por debajo del nivel productivo. Aplica abono orgánico (liberación gradual) y evita depender solo del fertilizante químico.',
  },
  {
    id: 'sobrefertilizacion',
    priority: 'alta',
    when: (s) => s.parcels.some((p) => p.soil.chemicalLoad > 45),
    title: 'Evita la sobrefertilización',
    detail: () =>
      'Hay parcelas con exceso de fertilizante químico. El excedente no aumenta la producción y termina contaminando el agua por escorrentía.',
  },
  {
    id: 'contaminacion',
    priority: 'alta',
    when: (s) => s.environment.contamination > 40,
    title: 'Reduce la contaminación hídrica',
    detail: (s) =>
      s.infrastructure.ecoProcessing
        ? 'Reduce el uso de agroquímicos y protege la ronda de la quebrada para aumentar la autodepuración.'
        : 'Invierte en beneficio ecológico para tratar las aguas mieles y protege la ronda de la quebrada.',
  },
  {
    id: 'humedad-baja',
    priority: 'media',
    when: (s) => farmIndicators(s).moisture < 35,
    title: 'Atiende el estrés hídrico',
    detail: (s) =>
      s.infrastructure.irrigation === 'goteo'
        ? 'Programa riegos en las parcelas más secas y mantén la cobertura vegetal para conservar humedad.'
        : 'El riego por goteo usa cerca de 40 % menos agua por riego. La cobertura y el sombrío reducen la evaporación.',
  },
  {
    id: 'biodiversidad',
    priority: 'media',
    when: (s) => s.environment.biodiversity < 40,
    title: 'Aumenta la biodiversidad',
    detail: () =>
      'Introduce sombrío (agroforestería), reforesta áreas degradadas y prefiere el manejo integrado de plagas. Más biodiversidad significa más control natural de plagas.',
  },
  {
    id: 'plagas',
    priority: 'alta',
    when: (s) => s.parcels.some((p) => maxPestIncidence(p) > 25),
    title: 'Controla los focos de plagas',
    detail: () =>
      'Hay parcelas con incidencia alta. Actúa pronto: las plagas se propagan a las parcelas vecinas. El MIP protege más tiempo y no afecta la biodiversidad.',
  },
  {
    id: 'ronda',
    priority: 'media',
    when: (s) => !s.environment.riparian.active,
    title: 'Protege la fuente hídrica',
    detail: () =>
      'Conservar la ronda de la quebrada mejora la calidad del agua, el caudal y la biodiversidad a largo plazo.',
  },
  {
    id: 'agua-critica',
    priority: 'alta',
    when: (s) => s.inventory.agua < RESOURCES.agua.criticalLevel,
    title: 'El reservorio está en nivel crítico',
    detail: () => 'Prioriza el riego de las parcelas en floración y fructificación y considera ampliar el reservorio.',
  },
  {
    id: 'cafe-almacenado',
    priority: 'baja',
    when: (s) => s.inventory.cafe > 500,
    title: 'Vende el café almacenado',
    detail: () => 'El café almacenado pierde peso y calidad cada mes. Aprovecha los buenos precios para vender.',
  },
  {
    id: 'dinero',
    priority: 'alta',
    when: (s) => s.inventory.money < s.params.monthlyFixedCost * 2,
    title: 'Cuida la liquidez',
    detail: () =>
      'El dinero disponible cubre menos de dos meses de costos fijos. Vende café, evita gastos no esenciales y planifica las cosechas.',
  },
  {
    id: 'certificacion',
    priority: 'baja',
    when: (s) => !s.infrastructure.certified && s.infrastructure.ecoProcessing && computeScores(s).sustainability >= 65,
    title: 'Obtén la certificación sostenible',
    detail: () => 'Ya cumples los requisitos de la certificación. La prima de precio premia tus buenas prácticas.',
  },
]

export function generateRecommendations(state: GameState, limit = 6): Recommendation[] {
  const order = { alta: 0, media: 1, baja: 2 } as const
  return RULES.filter((r) => r.when(state))
    .map((r) => ({ id: r.id, priority: r.priority, title: r.title, detail: r.detail(state) }))
    .sort((a, b) => order[a.priority] - order[b.priority])
    .slice(0, limit)
}
