import { Bug, Mountain, Shield, Sprout } from 'lucide-react'
import {
  PEST_IDS,
  PEST_INFO,
  STAGE_INFO,
  VARIETIES,
  type GameState,
  type Parcel,
} from '@/engine'
import { IndicatorBar } from '@/components/common/indicators'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/overlays'
import { formatHa, formatKg } from '@/lib/format'
import { StageTimeline } from '@/modules/crops/StageTimeline'
import { ParcelActions } from './ParcelActions'

function landUseLabel(parcel: Parcel): string {
  if (parcel.landUse === 'reforestacion') return 'Reforestación'
  if (!parcel.crop) return 'Barbecho'
  if (!parcel.crop.variety) return 'En preparación'
  return 'Café'
}

function PracticeRow({ label, level, active, hint }: { label: string; level: number; active: boolean; hint: string }) {
  return (
    <Tooltip content={hint}>
      <div className="flex items-center gap-2 text-xs">
        <span className="w-24 shrink-0 font-medium">{label}</span>
        <Progress value={level * 100} className="h-1.5" indicatorClassName={active ? 'bg-forest-500' : 'bg-muted-foreground/30'} />
        <span className="w-9 text-right tabular text-muted-foreground">{active ? `${Math.round(level * 100)}%` : '—'}</span>
      </div>
    </Tooltip>
  )
}

export function ParcelPanel({ game, parcel }: { game: GameState; parcel: Parcel }) {
  const crop = parcel.crop
  return (
    <div className="flex flex-col gap-4" data-testid="parcel-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-extrabold text-forest-900">
            {parcel.name} <span className="text-base text-muted-foreground">· {parcel.id}</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            {formatHa(parcel.areaHa)} · pendiente {Math.round(parcel.slope * 100)} % · {parcel.neighbors.length} lotes vecinos
          </p>
        </div>
        <Badge variant={parcel.landUse === 'reforestacion' ? 'success' : crop ? 'default' : 'secondary'}>{landUseLabel(parcel)}</Badge>
      </div>

      {crop?.variety && (
        <div className="surface-muted space-y-3 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-semibold">
              <Sprout className="size-4 text-forest-600" />
              {VARIETIES[crop.variety].name}
            </span>
            <span className="text-xs text-muted-foreground">
              {crop.ageMonths} meses · {crop.harvests} cosecha{crop.harvests === 1 ? '' : 's'}
            </span>
          </div>
          <StageTimeline crop={crop} params={game.params} />
          <p className="text-xs text-muted-foreground">{STAGE_INFO[crop.stage].description}</p>
          <IndicatorBar indicator="health" value={crop.health} compact label="Salud del cultivo" />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-card p-2">
              <div className="text-muted-foreground">Producción estimada</div>
              <div className="font-display text-base font-bold tabular">{formatKg(crop.estimatedYieldKg)}</div>
            </div>
            <div className="rounded-lg bg-card p-2">
              <div className="text-muted-foreground">Producción acumulada</div>
              <div className="font-display text-base font-bold tabular">{formatKg(parcel.totalProductionKg)}</div>
            </div>
          </div>
        </div>
      )}
      {crop && !crop.variety && (
        <div className="surface-muted p-3 text-sm">
          Terreno en preparación ({crop.monthsInStage}/{game.params.stageDurations.preparacion} mes). Cuando termine podrás sembrar.
        </div>
      )}

      <div className="space-y-2.5">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <Mountain className="size-4 text-earth-500" /> Suelo y ecosistema
        </h3>
        <IndicatorBar indicator="fertility" value={parcel.soil.fertility} compact />
        <IndicatorBar indicator="moisture" value={parcel.soil.moisture} compact />
        <IndicatorBar indicator="erosion" value={parcel.soil.erosion} compact />
        <IndicatorBar indicator="contamination" value={parcel.soil.contamination} compact label="Residuos químicos" />
        <IndicatorBar indicator="biodiversity" value={parcel.biodiversity} compact />
        {parcel.irrigationMm > 0 && (
          <p className="text-xs text-water-600">Riego programado este mes: +{parcel.irrigationMm} mm efectivos al cerrar el mes.</p>
        )}
      </div>

      {crop?.variety && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-bold">
            <Bug className="size-4 text-clay-500" /> Sanidad
            {parcel.protection.monthsRemaining > 0 && (
              <Badge variant="info" className="ml-auto">
                <Shield /> Protección {parcel.protection.method === 'quimico' ? 'química' : 'MIP'} · {parcel.protection.monthsRemaining} m
              </Badge>
            )}
          </h3>
          {PEST_IDS.map((pest) => (
            <Tooltip key={pest} content={`${PEST_INFO[pest].description} Favorecida por: ${PEST_INFO[pest].favoredBy}`}>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-28 shrink-0 font-medium">{PEST_INFO[pest].name}</span>
                <Progress
                  value={parcel.pests[pest]}
                  className="h-1.5"
                  indicatorClassName={parcel.pests[pest] > 25 ? 'bg-clay-500' : parcel.pests[pest] > 10 ? 'bg-sun-400' : 'bg-forest-400'}
                />
                <span className="w-7 text-right tabular">{Math.round(parcel.pests[pest])}</span>
              </div>
            </Tooltip>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-bold">Prácticas de conservación</h3>
        <PracticeRow
          label="Cobertura"
          level={parcel.practices.cover.level}
          active={parcel.practices.cover.active}
          hint="Protege el suelo de la lluvia, retiene humedad y aporta nutrientes."
        />
        <PracticeRow
          label="Barreras vivas"
          level={parcel.practices.barrier.level}
          active={parcel.practices.barrier.active}
          hint="Frenan la escorrentía y retienen sedimentos en la ladera."
        />
        <PracticeRow
          label="Sombrío"
          level={parcel.practices.shade.level}
          active={parcel.practices.shade.active}
          hint="Árboles que reducen el calor, la evaporación y aumentan la biodiversidad."
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold">Acciones · {Math.round(game.labor.available * 10) / 10} jornales disponibles</h3>
        <ParcelActions game={game} parcel={parcel} />
      </div>
    </div>
  )
}
