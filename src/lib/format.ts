/** Formateadores de presentación (es-CO). */

import { monthName, monthShort } from '@/engine'

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const num0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const num1 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

export const formatCop = (v: number): string => cop.format(Math.round(v))

/** Formato compacto de pesos: $12,4 M, $850 mil. */
export function formatCopShort(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '−' : ''
  if (abs >= 1_000_000) return `${sign}$${num1.format(abs / 1_000_000)} M`
  if (abs >= 1_000) return `${sign}$${num0.format(abs / 1_000)} mil`
  return `${sign}$${num0.format(abs)}`
}

export const formatNumber = (v: number, decimals = 0): string =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: decimals, minimumFractionDigits: 0 }).format(v)

export const formatKg = (v: number): string => `${num0.format(v)} kg`
export const formatM3 = (v: number): string => `${num0.format(v)} m³`
export const formatHa = (v: number): string => `${num1.format(v)} ha`
export const formatPct = (v: number): string => `${num0.format(v)}`

export function formatDelta(v: number, decimals = 1): string {
  const rounded = Number(v.toFixed(decimals))
  if (rounded === 0) return '±0'
  return `${rounded > 0 ? '+' : '−'}${num1.format(Math.abs(rounded))}`
}

export const dateLabel = (month: number, year: number): string => `${monthName(month)} ${year}`
export const shortDate = (month: number, year: number): string => `${monthShort(month)} ${String(year).slice(2)}`

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}
