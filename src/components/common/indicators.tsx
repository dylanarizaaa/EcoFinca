import { Info } from 'lucide-react'
import type * as React from 'react'
import { Tooltip } from '@/components/ui/overlays'
import { Progress } from '@/components/ui/misc'
import { formatDelta } from '@/lib/format'
import { INDICATORS, indicatorTone, TONE_CLASSES, scoreTone, type IndicatorKey, type Tone } from '@/lib/indicators'
import { cn } from '@/lib/utils'

export function InfoTip({ content, className }: { content: React.ReactNode; className?: string }) {
  return (
    <Tooltip content={content}>
      <button
        type="button"
        className={cn('inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground', className)}
        aria-label="Más información"
      >
        <Info className="size-3.5" />
      </button>
    </Tooltip>
  )
}

/** Barra de indicador ambiental con tono de color según su valor real. */
export function IndicatorBar({
  indicator,
  value,
  delta,
  compact = false,
  label,
}: {
  indicator: IndicatorKey
  value: number
  delta?: number
  compact?: boolean
  label?: string
}) {
  const meta = INDICATORS[indicator]
  const tone = indicatorTone(indicator, value)
  const Icon = meta.icon
  const deltaGood = delta === undefined ? null : meta.higherIsBetter ? delta > 0 : delta < 0
  return (
    <div className={cn('flex flex-col', compact ? 'gap-1' : 'gap-1.5')} data-testid={`indicator-${indicator}`}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 font-medium">
          <Icon className={cn('size-4 shrink-0', TONE_CLASSES[tone].text)} aria-hidden />
          <span className="truncate">{label ?? meta.label}</span>
          {!compact && <InfoTip content={meta.description} />}
        </span>
        <span className="flex items-baseline gap-1.5 tabular">
          {delta !== undefined && Math.abs(delta) >= 0.05 && (
            <span className={cn('text-xs font-semibold', deltaGood ? 'text-forest-600' : 'text-clay-500')}>{formatDelta(delta)}</span>
          )}
          <span className={cn('font-bold', TONE_CLASSES[tone].text)}>{Math.round(value)}</span>
        </span>
      </div>
      <Progress
        value={value}
        aria-label={`${meta.label}: ${Math.round(value)} de 100`}
        className={compact ? 'h-1.5' : 'h-2'}
        indicatorClassName={TONE_CLASSES[tone].bar}
      />
    </div>
  )
}

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: Tone
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn('surface flex flex-col gap-1 p-4', className)}>
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className={cn('size-4', tone ? TONE_CLASSES[tone].text : 'text-forest-500')} />
        {label}
      </div>
      <div className={cn('font-display text-2xl font-extrabold tabular', tone && TONE_CLASSES[tone].text)}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      {children}
    </div>
  )
}

/** Indicador circular para puntuaciones 0–100. */
export function ScoreRing({
  value,
  label,
  size = 96,
  stroke = 9,
  color,
}: {
  value: number
  label: string
  size?: number
  stroke?: number
  color?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const tone = scoreTone(value)
  const strokeColor = color ?? (tone === 'good' ? '#3c6845' : tone === 'fair' ? '#d99a24' : '#b4432f')
  return (
    <div className="flex flex-col items-center gap-1.5" role="img" aria-label={`${label}: ${Math.round(value)} de 100`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0e8" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.max(0, Math.min(100, value)) / 100)}
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-display text-2xl font-extrabold tabular">
          {Math.round(value)}
        </div>
      </div>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
    </div>
  )
}
