/** Utilidades de calendario: el juego avanza por turnos mensuales. */

export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

export const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const

export const MONTHS_PER_CYCLE = 12

export function monthName(month: number): string {
  return MONTH_NAMES[((month % 12) + 12) % 12] ?? ''
}

export function monthShort(month: number): string {
  return MONTH_SHORT[((month % 12) + 12) % 12] ?? ''
}

/** Mes y año para un turno dado (turno 0 = enero del año de inicio). */
export function calendarForTurn(startYear: number, turn: number): { month: number; year: number } {
  return { month: turn % 12, year: startYear + Math.floor(turn / 12) }
}

/** Ciclo productivo (1-based) al que pertenece un turno. */
export function cycleForTurn(turn: number): number {
  return Math.floor(turn / MONTHS_PER_CYCLE) + 1
}

export function dateLabel(month: number, year: number): string {
  return `${monthName(month)} ${year}`
}
