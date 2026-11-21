import { STAGE_INFO, STAGE_ORDER, stageDuration, type CropState, type ModelParams } from '@/engine'
import { Tooltip } from '@/components/ui/overlays'
import { cn } from '@/lib/utils'

/** Línea de tiempo de las 7 etapas fenológicas con el avance de la etapa actual. */
export function StageTimeline({ crop, params }: { crop: CropState; params: ModelParams }) {
  const currentIndex = STAGE_ORDER.indexOf(crop.stage)
  const duration = stageDuration(crop.stage, params.stageDurations, crop.harvests)
  const progress = Math.min(1, crop.monthsInStage / Math.max(1, duration))
  return (
    <div className="flex flex-col gap-1.5" aria-label={`Etapa: ${STAGE_INFO[crop.stage].name}`}>
      <div className="flex gap-1">
        {STAGE_ORDER.map((stage, i) => {
          const done = i < currentIndex
          const current = i === currentIndex
          return (
            <Tooltip
              key={stage}
              content={`${STAGE_INFO[stage].name} · ${stageDuration(stage, params.stageDurations, crop.harvests)} mes(es). ${STAGE_INFO[stage].description}`}
            >
              <div className={cn('relative h-2 flex-1 overflow-hidden rounded-full', done ? 'bg-forest-500' : 'bg-muted')}>
                {current && <div className="absolute inset-y-0 left-0 rounded-full bg-sun-400" style={{ width: `${Math.max(12, progress * 100)}%` }} />}
              </div>
            </Tooltip>
          )
        })}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-forest-800">{STAGE_INFO[crop.stage].name}</span>
        <span className="text-muted-foreground tabular">
          mes {Math.min(crop.monthsInStage + 1, duration)} de {duration}
        </span>
      </div>
    </div>
  )
}
