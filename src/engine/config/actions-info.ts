/**
 * Información educativa de cada acción: qué hace, sus efectos inmediatos,
 * ambientales y consecuencias a largo plazo. La interfaz la muestra en
 * tooltips y paneles; los valores numéricos reales se calculan en el motor.
 */

import type { ParcelActionType } from '../domain/types'

export interface ActionInfo {
  id: ParcelActionType
  name: string
  summary: string
  conditions: string
  immediate: string
  environmental: string
  longTerm: string
  sustainable: boolean | null
}

export const ACTION_INFO: Record<ParcelActionType, ActionInfo> = {
  preparar: {
    id: 'preparar',
    name: 'Preparar terreno',
    summary: 'Trazado, ahoyado y adecuación del lote para una nueva siembra.',
    conditions: 'Lote sin cultivo o cafetal a renovar. No aplica a lotes reforestados.',
    immediate: 'Elimina las plantas existentes y deja el lote listo para sembrar en 1 mes.',
    environmental: 'Deja el suelo expuesto: la erosión se multiplica ×1,6 mientras no se siembre.',
    longTerm: 'Permite renovar cafetales viejos o susceptibles con variedades resistentes.',
    sustainable: null,
  },
  sembrar: {
    id: 'sembrar',
    name: 'Sembrar',
    summary: 'Trasplantar colinos de café (5.000 plantas/ha).',
    conditions: 'Terreno preparado durante al menos 1 mes y colinos suficientes.',
    immediate: 'Inicia la etapa de establecimiento con plantas jóvenes sensibles a la sequía.',
    environmental: 'El suelo sigue parcialmente expuesto durante el establecimiento.',
    longTerm: 'La primera cosecha llega cerca de 18–24 meses después de la siembra.',
    sustainable: null,
  },
  fertilizar: {
    id: 'fertilizar',
    name: 'Fertilizar',
    summary: 'Aplicar abono orgánico (liberación gradual) o fertilizante químico (efecto rápido).',
    conditions: 'Lote con cultivo o en barbecho. Una fertilización por mes.',
    immediate: 'Químico: +12 de fertilidad por dosis recomendada. Orgánico: +2 inmediato y ~16 liberados en los meses siguientes.',
    environmental: 'El químico en exceso (fertilidad > 82) se pierde por escorrentía y contamina el agua. El orgánico mejora la biota del suelo.',
    longTerm: 'La materia orgánica sostiene la fertilidad; el químico solo, acidifica y degrada el suelo.',
    sustainable: null,
  },
  regar: {
    id: 'regar',
    name: 'Regar',
    summary: 'Aplicar una lámina de riego efectiva de 14 mm.',
    conditions: 'Lote con cultivo y agua suficiente en el reservorio. Un riego por mes.',
    immediate: 'Aumenta la humedad del suelo al cerrar el mes.',
    environmental: 'El riego por gravedad pierde 45 % del agua; el goteo solo 10 %.',
    longTerm: 'El agua del reservorio es limitada: un riego ineficiente compromete los meses secos.',
    sustainable: null,
  },
  controlPlagas: {
    id: 'controlPlagas',
    name: 'Control de plagas',
    summary: 'Tratamiento químico o manejo integrado de plagas (MIP).',
    conditions: 'Lote con cafetal sembrado e insumos de control disponibles.',
    immediate: 'Químico: −75 % de incidencia y 2 meses de protección. MIP: −50 % y 3 meses de protección.',
    environmental: 'El químico contamina el suelo y el agua y reduce la biodiversidad. El MIP conserva los enemigos naturales.',
    longTerm: 'Con biodiversidad alta, el control natural reduce la presión de plagas.',
    sustainable: null,
  },
  cobertura: {
    id: 'cobertura',
    name: 'Cobertura vegetal',
    summary: 'Establecer coberturas nobles o leguminosas entre las calles del cafetal.',
    conditions: 'Lote sin cobertura activa. No aplica a lotes reforestados.',
    immediate: 'Se establece en ~3 meses.',
    environmental: 'Hasta −75 % de erosión, menos escorrentía y evaporación, más biodiversidad y fijación de nutrientes.',
    longTerm: 'Recupera fertilidad y estructura del suelo de forma permanente.',
    sustainable: true,
  },
  barreras: {
    id: 'barreras',
    name: 'Barreras vivas',
    summary: 'Sembrar barreras vegetales en contorno (p. ej., limoncillo o vetiver).',
    conditions: 'Lote sin barreras activas.',
    immediate: 'Se establecen en ~6 meses.',
    environmental: 'Hasta −60 % de erosión, retienen sedimentos antes de llegar a la quebrada.',
    longTerm: 'Forman terrazas naturales que reducen la pendiente efectiva.',
    sustainable: true,
  },
  sombrio: {
    id: 'sombrio',
    name: 'Sombrío (agroforestería)',
    summary: 'Sembrar árboles de sombra (guamo, nogal cafetero, plátano) en el cafetal.',
    conditions: 'Lote de café sin sombrío activo.',
    immediate: 'Se establece en ~12 meses.',
    environmental: 'Reduce la evapotranspiración y el estrés térmico; gran aumento de biodiversidad.',
    longTerm: 'Reduce ~10 % el potencial productivo, pero estabiliza la producción y protege el suelo.',
    sustainable: true,
  },
  mantenimiento: {
    id: 'mantenimiento',
    name: 'Mantenimiento',
    summary: 'Plateo, manejo de arvenses, podas sanitarias y recolección de frutos caídos (re-re).',
    conditions: 'Lote con cafetal sembrado. Una vez por mes.',
    immediate: '+8 de salud y −15 % de incidencia de plagas (más contra la broca después de la cosecha).',
    environmental: 'Control cultural sin agroquímicos.',
    longTerm: 'Cafetales bien mantenidos producen más y enferman menos.',
    sustainable: true,
  },
  cosechar: {
    id: 'cosechar',
    name: 'Cosechar',
    summary: 'Recolectar y beneficiar el café maduro.',
    conditions: 'Lote en etapa de cosecha y agua suficiente para el beneficio.',
    immediate: 'El café pergamino seco pasa al almacén. Se paga la recolección por kilo.',
    environmental: 'El beneficio tradicional genera aguas mieles muy contaminantes (40 L de agua/kg).',
    longTerm: 'Cosechar tarde reduce 30 % el volumen y alimenta la broca.',
    sustainable: null,
  },
  reforestar: {
    id: 'reforestar',
    name: 'Reforestar parcela',
    summary: 'Convertir el lote en bosque nativo (acción permanente).',
    conditions: 'Cualquier lote agrícola. Elimina el cultivo existente.',
    immediate: 'El lote deja de producir café.',
    environmental: 'Máxima protección del suelo y del agua; la biodiversidad aumenta durante 3 años.',
    longTerm: 'Mejora el caudal de la quebrada y la calidad del agua de toda la finca.',
    sustainable: true,
  },
}
