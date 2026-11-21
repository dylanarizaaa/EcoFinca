/**
 * Kit de gráficas (Recharts) con especificaciones comunes:
 * líneas de 2px, barras ≤ 24px con extremo redondeado, cuadrícula sólida
 * y recesiva, leyenda para ≥ 2 series, tooltip y vista de tabla alternativa.
 *
 * Paleta categórica validada (ΔE CVD ≥ 9 en todos los pares, fondo blanco):
 *   serie 1 azul #2a78d6 · serie 2 naranja #eb6834 · serie 3 aqua #1baf7a
 */

import { useState, type ReactNode } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import type { TooltipContentProps, TooltipValueType } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const SERIES = {
  s1: '#2a78d6',
  s2: '#eb6834',
  s3: '#1baf7a',
} as const

export const GRID_COLOR = '#e6e9e0'
export const AXIS_COLOR = '#6b7569'
export const REFERENCE_COLOR = '#9aa397'

export const axisProps = {
  stroke: GRID_COLOR,
  tick: { fill: AXIS_COLOR, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: GRID_COLOR },
} as const

export interface LegendItem {
  label: string
  color: string
  kind?: 'line' | 'bar' | 'reference'
}

export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Leyenda">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {i.kind === 'bar' ? (
            <span className="size-2.5 rounded-sm" style={{ background: i.color }} />
          ) : (
            <span className="h-0.5 w-4 rounded-full" style={{ background: i.color, opacity: i.kind === 'reference' ? 0.8 : 1 }} />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  )
}

export interface TableColumn<Row> {
  key: string
  label: string
  render: (row: Row) => ReactNode
  align?: 'left' | 'right'
}

export function DataTable<Row>({ rows, columns, caption }: { rows: Row[]; columns: TableColumn<Row>[]; caption: string }) {
  return (
    <div className="max-h-72 overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-3 py-2 font-semibold', c.align === 'right' ? 'text-right' : 'text-left')}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border/60">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-3 py-1.5', c.align === 'right' && 'text-right')}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Tarjeta de gráfica con alternancia gráfica/tabla (la tabla es el equivalente accesible). */
export function ChartCard({
  title,
  description,
  legend,
  table,
  children,
  className,
  height = 220,
}: {
  title: string
  description?: ReactNode
  legend?: LegendItem[]
  table?: ReactNode
  children: ReactNode
  className?: string
  height?: number
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {table && (
          <div className="flex shrink-0 rounded-lg bg-muted p-0.5" role="group" aria-label="Vista">
            <button
              type="button"
              onClick={() => setView('chart')}
              aria-pressed={view === 'chart'}
              className={cn('rounded-md p-1.5', view === 'chart' ? 'bg-card shadow-sm' : 'text-muted-foreground')}
              aria-label="Ver gráfica"
            >
              <BarChart3 className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              aria-pressed={view === 'table'}
              className={cn('rounded-md p-1.5', view === 'table' ? 'bg-card shadow-sm' : 'text-muted-foreground')}
              aria-label="Ver tabla"
            >
              <Table2 className="size-4" />
            </button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {legend && legend.length > 1 && <ChartLegend items={legend} />}
        {view === 'chart' || !table ? <div style={{ height }}>{children}</div> : table}
      </CardContent>
    </Card>
  )
}

type Formatter = (value: number) => string

/** Tooltip con tokens de texto (el color solo aparece en la muestra de la serie). */
export function makeTooltip(format: Formatter, labelFormat?: (label: string) => string) {
  return function ChartTooltip({ active, payload, label }: TooltipContentProps<TooltipValueType, string | number>) {
    if (!active || !payload || payload.length === 0) return null
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
        <div className="mb-1 font-semibold text-foreground">{labelFormat ? labelFormat(String(label)) : String(label)}</div>
        {payload.map((p) => (
          <div key={String(p.dataKey)} className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            <span>{p.name}</span>
            <span className="ml-auto pl-3 font-semibold text-foreground tabular">{typeof p.value === 'number' ? format(p.value) : '—'}</span>
          </div>
        ))}
      </div>
    )
  }
}
