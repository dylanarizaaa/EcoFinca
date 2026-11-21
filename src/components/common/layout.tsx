import { Loader2 } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

export function Logo({ className, compact = false, light = false }: { className?: string; compact?: boolean; light?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 64 64" className="size-9 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="16" fill={light ? '#f7f8f4' : '#234D35'} />
        <path d="M32 11c-11 6-16 16-14 26 2 9 9 15 14 15s12-6 14-15c2-10-3-20-14-26z" fill="#A8C58B" />
        <path d="M32 15c-3 9-3 23 0 35" stroke={light ? '#f7f8f4' : '#234D35'} strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="45" cy="46" r="7.5" fill="#79563A" />
        <path d="M41.5 46c2.3-2.2 4.7-2.2 7 0" stroke="#E9DFC9" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className={cn('font-display text-xl font-extrabold tracking-tight', light ? 'text-white' : 'text-forest-800')}>
          Eco<span className={light ? 'text-leaf-300' : 'text-forest-500'}>Finca</span>
        </span>
      )}
    </span>
  )
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string
  description?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-forest-800 text-leaf-200">
            <Icon className="size-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-extrabold text-forest-900">{title}</h1>
          {description && <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <p className="font-display font-bold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function LoadingScreen({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <Logo compact />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {label}
      </div>
    </div>
  )
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('font-display text-lg font-bold text-forest-900', className)}>{children}</h2>
}
