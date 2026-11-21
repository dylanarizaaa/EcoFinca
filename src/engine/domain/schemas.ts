/**
 * Esquemas Zod para validar las entradas del motor: configuración de partida,
 * parámetros del modelo y acciones del jugador.
 */

import { z } from 'zod'

export const ScenarioIdSchema = z.enum(['equilibrada', 'suelo-degradado', 'crisis-hidrica'])
export const DifficultySchema = z.enum(['facil', 'normal', 'dificil'])
export const VarietySchema = z.enum(['castillo', 'cenicafe1', 'caturra', 'tabi'])
export const ResourceIdSchema = z.enum(['agua', 'abonoOrganico', 'fertilizanteQuimico', 'controlQuimico', 'controlBiologico', 'colinos'])
export const InvestmentIdSchema = z.enum(['riegoGoteo', 'beneficioEcologico', 'reservorio', 'certificacion'])

export const GameConfigSchema = z.object({
  farmName: z
    .string()
    .trim()
    .min(3, 'El nombre de la finca debe tener al menos 3 caracteres.')
    .max(40, 'El nombre de la finca no puede superar 40 caracteres.'),
  managerName: z
    .string()
    .trim()
    .min(2, 'El nombre del administrador debe tener al menos 2 caracteres.')
    .max(40, 'El nombre del administrador no puede superar 40 caracteres.'),
  scenarioId: ScenarioIdSchema,
  difficulty: DifficultySchema,
  initialBudget: z
    .number({ error: 'El presupuesto debe ser un número.' })
    .int('El presupuesto debe ser un número entero.')
    .min(5_000_000, 'El presupuesto mínimo es $5.000.000.')
    .max(200_000_000, 'El presupuesto máximo es $200.000.000.'),
  durationYears: z.number().int().min(1, 'La duración mínima es 1 año.').max(5, 'La duración máxima es 5 años.'),
  parcelCount: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(9)]),
  seed: z.number().int().min(1, 'La semilla debe ser un entero positivo.').max(2_147_483_647),
  startYear: z.number().int().min(2000).max(2100),
})

export const StageDurationsSchema = z.object({
  preparacion: z.number().int().min(1).max(6),
  establecimiento: z.number().int().min(1).max(12),
  vegetativoInicial: z.number().int().min(3).max(24),
  vegetativoPostCosecha: z.number().int().min(1).max(12),
  floracion: z.number().int().min(1).max(3),
  fructificacion: z.number().int().min(2).max(8),
  maduracion: z.number().int().min(1).max(4),
  cosecha: z.number().int().min(1).max(3),
})

export const ModelParamsSchema = z.object({
  baseYieldKgHa: z.number().min(200).max(4000),
  coffeeBasePrice: z.number().int().min(1000).max(100_000),
  inputPriceMultiplier: z.number().min(0.3).max(3),
  monthlyFixedCost: z.number().int().min(0).max(20_000_000),
  baseLabor: z.number().int().min(5).max(200),
  laborCost: z.number().int().min(10_000).max(500_000),
  stageDurations: StageDurationsSchema,
})

const parcelId = z.string().min(1)
const DoseSchema = z.enum(['baja', 'recomendada', 'alta'])

export const GameActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('preparar'), parcelId }),
  z.object({ type: z.literal('sembrar'), parcelId, variety: VarietySchema }),
  z.object({ type: z.literal('fertilizar'), parcelId, fertilizer: z.enum(['organico', 'quimico']), dose: DoseSchema }),
  z.object({ type: z.literal('regar'), parcelId }),
  z.object({ type: z.literal('controlPlagas'), parcelId, method: z.enum(['quimico', 'integrado']) }),
  z.object({ type: z.literal('cobertura'), parcelId }),
  z.object({ type: z.literal('barreras'), parcelId }),
  z.object({ type: z.literal('sombrio'), parcelId }),
  z.object({ type: z.literal('mantenimiento'), parcelId }),
  z.object({ type: z.literal('cosechar'), parcelId }),
  z.object({ type: z.literal('reforestar'), parcelId }),
  z.object({ type: z.literal('comprar'), item: ResourceIdSchema, quantity: z.number().int().positive().max(1_000_000) }),
  z.object({ type: z.literal('vender'), quantityKg: z.number().positive().max(1_000_000) }),
  z.object({ type: z.literal('invertir'), investment: InvestmentIdSchema }),
  z.object({ type: z.literal('contratarJornales'), quantity: z.number().int().positive().max(60) }),
  z.object({ type: z.literal('conservarFuentes') }),
  z.object({ type: z.literal('restaurarArea') }),
  z.object({ type: z.literal('responderEvento'), instanceId: z.string().min(1), responseId: z.string().min(1) }),
])

export type GameConfigInput = z.input<typeof GameConfigSchema>
