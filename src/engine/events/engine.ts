/**
 * Motor de eventos: evalúa condiciones y probabilidades, inicia eventos,
 * agrega sus modificadores y aplica las respuestas del jugador.
 */

import { DIFFICULTY } from '../config/model'
import { checkAffordable, nextId, payCost } from '../domain/ledger'
import type { ActiveEvent, GameState, Modifiers } from '../domain/types'
import { rngFor } from '../lib/rng'
import { EVENT_BY_ID, EVENT_CATALOG, type EventDefinition, type EventResponse } from './catalog'

export const NEUTRAL_MODIFIERS: Modifiers = {
  precipitationMult: 1,
  temperatureAdd: 0,
  rainIntensityAdd: 0,
  streamFlowMult: 1,
  inputPriceMult: 1,
  coffeePriceMult: 1,
  pestPressureMult: 1,
  erosionMult: 1,
  laborAdd: 0,
}

const MULTIPLICATIVE: readonly (keyof Modifiers)[] = [
  'precipitationMult',
  'streamFlowMult',
  'inputPriceMult',
  'coffeePriceMult',
  'pestPressureMult',
  'erosionMult',
]

/** Máximo de eventos nuevos por turno (evita saturar al jugador). */
export const MAX_NEW_EVENTS_PER_TURN = 2

export function effectiveModifiers(event: ActiveEvent): Partial<Modifiers> {
  const def = EVENT_BY_ID[event.eventId]
  if (!def) return {}
  if (event.responseId) {
    const response = def.responses.find((r) => r.id === event.responseId)
    if (response?.modifiers) return response.modifiers
  }
  return def.modifiers ?? {}
}

/** Combina los modificadores de todos los eventos activos. */
export function aggregateModifiers(events: readonly ActiveEvent[]): Modifiers {
  const result: Modifiers = { ...NEUTRAL_MODIFIERS }
  for (const event of events) {
    if (event.remaining <= 0) continue
    const mods = effectiveModifiers(event)
    for (const [key, value] of Object.entries(mods) as [keyof Modifiers, number][]) {
      if (MULTIPLICATIVE.includes(key)) result[key] *= value
      else result[key] += value
    }
  }
  return result
}

export function isPending(event: ActiveEvent): boolean {
  const def = EVENT_BY_ID[event.eventId]
  return !!def && def.responses.length > 0 && event.responseId === null
}

export function pendingEvents(state: Pick<GameState, 'activeEvents'>): ActiveEvent[] {
  return state.activeEvents.filter(isPending)
}

export function findResponse(eventId: string, responseId: string): EventResponse | undefined {
  return EVENT_BY_ID[eventId]?.responses.find((r) => r.id === responseId)
}

function logEvent(draft: GameState, def: EventDefinition, message: string, severity = def.severity): void {
  draft.eventLog.push({
    id: nextId(draft, 'log'),
    turn: draft.turn,
    eventId: def.id,
    title: def.name,
    message,
    severity,
  })
}

/**
 * Aplica una respuesta a un evento pendiente sobre el borrador. Devuelve un
 * mensaje de error si no es posible.
 */
export function applyEventResponse(
  draft: GameState,
  instanceId: string,
  responseId: string,
  options: { force?: boolean } = {},
): { ok: true; message: string } | { ok: false; error: string } {
  const event = draft.activeEvents.find((e) => e.instanceId === instanceId)
  if (!event) return { ok: false, error: 'El evento ya no está activo.' }
  if (event.responseId !== null) return { ok: false, error: 'Ya se respondió a este evento.' }
  const def = EVENT_BY_ID[event.eventId]
  if (!def) return { ok: false, error: 'Evento desconocido.' }
  const response = def.responses.find((r) => r.id === responseId)
  if (!response) return { ok: false, error: 'Respuesta no válida para este evento.' }
  const cost = response.cost(draft)
  if (!options.force) {
    const error = checkAffordable(draft, cost)
    if (error) return { ok: false, error }
  }
  payCost(draft, cost, 'evento', `${def.name}: ${response.label}`)
  const ctx = { rng: rngFor(draft.config.seed, draft.turn, `response:${event.instanceId}`), targetParcelId: event.targetParcelId }
  const message = response.apply(draft, ctx)
  event.responseId = response.id
  if (response.endsEvent) event.remaining = 0
  logEvent(draft, def, `Respuesta: ${response.label}. ${message}`, def.severity === 'peligro' ? 'advertencia' : def.severity)
  draft.activeEvents = draft.activeEvents.filter((e) => e.remaining > 0)
  return { ok: true, message }
}

/** Aplica la respuesta por defecto a los eventos que el jugador no atendió. */
export function resolvePendingDefaults(draft: GameState): string[] {
  const messages: string[] = []
  for (const event of [...draft.activeEvents]) {
    if (!isPending(event)) continue
    const def = EVENT_BY_ID[event.eventId]
    const fallback = def?.defaultResponseId ?? def?.responses[def.responses.length - 1]?.id
    if (!def || !fallback) continue
    const result = applyEventResponse(draft, event.instanceId, fallback, { force: true })
    if (result.ok) messages.push(`${def.name}: sin decisión, se aplicó «${def.responses.find((r) => r.id === fallback)?.label}».`)
  }
  return messages
}

/** Reduce la duración de los eventos activos y elimina los terminados. */
export function tickEvents(draft: GameState): string[] {
  const ended: string[] = []
  for (const event of draft.activeEvents) event.remaining -= 1
  for (const event of draft.activeEvents) {
    if (event.remaining <= 0) {
      const def = EVENT_BY_ID[event.eventId]
      if (def) {
        ended.push(def.name)
        logEvent(draft, def, 'El evento terminó.', 'info')
      }
    }
  }
  draft.activeEvents = draft.activeEvents.filter((e) => e.remaining > 0)
  return ended
}

/**
 * Evalúa todos los eventos del catálogo (en orden determinista) e inicia los
 * que cumplan condición y probabilidad. Se consume un número aleatorio por
 * evento siempre, para que el flujo sea idéntico entre estrategias.
 */
export function rollEvents(draft: GameState): string[] {
  const rng = rngFor(draft.config.seed, draft.turn, 'events')
  const diff = DIFFICULTY[draft.config.difficulty].events
  const started: string[] = []
  for (const def of EVENT_CATALOG) {
    const roll = rng()
    if (started.length >= MAX_NEW_EVENTS_PER_TURN) continue
    if (draft.activeEvents.some((e) => e.eventId === def.id)) continue
    if ((draft.eventCooldowns[def.id] ?? -1) > draft.turn) continue
    if (!def.condition(draft)) continue
    const probability = Math.min(0.95, def.probability(draft) * diff)
    if (roll >= probability) continue
    startEvent(draft, def)
    started.push(def.name)
  }
  return started
}

export function startEvent(draft: GameState, def: EventDefinition): ActiveEvent {
  const targetRng = rngFor(draft.config.seed, draft.turn, `event-target:${def.id}`)
  const targetParcelId = def.selectTarget ? def.selectTarget(draft, targetRng) : null
  const event: ActiveEvent = {
    instanceId: nextId(draft, 'ev'),
    eventId: def.id,
    startedTurn: draft.turn,
    remaining: def.durationMonths,
    responseId: def.responses.length === 0 ? 'none' : null,
    targetParcelId,
  }
  draft.activeEvents.push(event)
  draft.eventCooldowns[def.id] = draft.turn + def.durationMonths + def.cooldownMonths
  const message = def.onStart ? def.onStart(draft, { rng: targetRng, targetParcelId }) : def.description
  logEvent(draft, def, message)
  return event
}
