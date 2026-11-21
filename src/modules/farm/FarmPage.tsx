import { Bug, Droplets, Eye, HeartPulse, Leaf, Map as MapIcon, Mountain, MousePointerClick, Sprout } from 'lucide-react'
import { computeScores, farmIndicators, STAGE_INFO, type CropStage, type MapLayer } from '@/engine'
import { IndicatorBar, ScoreRing } from '@/components/common/indicators'
import { EmptyState } from '@/components/common/layout'
import { Card, CardContent } from '@/components/ui/card'
import { useGame } from '@/hooks/use-game'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/store/game-store'
import { FarmMap } from './FarmMap'
import { LAND_COLORS, LAYER_SCALES, STAGE_COLORS, scaleColor } from './map-colors'
import { ParcelPanel } from './ParcelPanel'

const LAYERS: { id: MapLayer; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: 'General', icon: Eye },
  { id: 'fertilidad', label: 'Fertilidad', icon: Sprout },
  { id: 'humedad', label: 'Humedad', icon: Droplets },
  { id: 'erosion', label: 'Erosión', icon: Mountain },
  { id: 'cultivo', label: 'Cultivos', icon: HeartPulse },
  { id: 'biodiversidad', label: 'Biodiversidad', icon: Leaf },
]

function LayerSwitcher({ layer, onChange }: { layer: MapLayer; onChange: (l: MapLayer) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Capa del mapa">
      {LAYERS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={layer === id}
          onClick={() => onChange(id)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all sm:text-sm',
            layer === id ? 'bg-card text-forest-800 shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  )
}

const LEGEND_STAGES: CropStage[] = ['preparacion', 'establecimiento', 'vegetativo', 'floracion', 'fructificacion', 'maduracion', 'cosecha']

function MapLegend({ layer }: { layer: MapLayer }) {
  if (layer === 'general') {
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        {LEGEND_STAGES.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm ring-1 ring-black/10" style={{ background: STAGE_COLORS[s] }} />
            {STAGE_INFO[s].name}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm ring-1 ring-black/10" style={{ background: LAND_COLORS.barbecho }} />
          Barbecho
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm ring-1 ring-black/10" style={{ background: LAND_COLORS.reforestacion }} />
          Reforestación
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed border-forest-700" /> Barreras vivas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-forest-600" /> Árboles de sombrío
        </span>
      </div>
    )
  }
  const scale = LAYER_SCALES[layer]
  const gradient = `linear-gradient(to right, ${[0, 25, 50, 75, 100].map((v) => scaleColor(scale.stops, v)).join(', ')})`
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="font-semibold text-foreground">{scale.title}</span>
      <span>{scale.low}</span>
      <span className="h-2.5 w-40 rounded-full ring-1 ring-black/10" style={{ background: gradient }} />
      <span>{scale.high}</span>
      <span className="hidden sm:inline">· El número en cada lote es su valor actual (0–100).</span>
    </div>
  )
}

export function FarmPage() {
  const game = useGame()
  const layer = useGameStore((s) => s.mapLayer)
  const setLayer = useGameStore((s) => s.setLayer)
  const selectedId = useGameStore((s) => s.selectedParcelId)
  const select = useGameStore((s) => s.selectParcel)
  const selected = game.parcels.find((p) => p.id === selectedId)
  const indicators = farmIndicators(game)
  const scores = computeScores(game)
  const pestAlerts = game.parcels.filter((p) => Math.max(p.pests.broca, p.pests.roya, p.pests['mancha-hierro']) > 25).length

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 font-display text-xl font-extrabold text-forest-900">
            <MapIcon className="size-5 text-forest-600" /> Mapa de la finca
          </h1>
          <LayerSwitcher layer={layer} onChange={setLayer} />
        </div>
        <FarmMap game={game} layer={layer} selectedId={selectedId} onSelect={select} />
        <MapLegend layer={layer} />

        <div className="grid gap-3 md:grid-cols-[auto_1fr]">
          <Card className="flex-row items-center justify-around gap-2 p-4 md:justify-start md:gap-5">
            <ScoreRing value={scores.productivity} label="Productividad" size={76} stroke={7} />
            <ScoreRing value={scores.profitability} label="Rentabilidad" size={76} stroke={7} />
            <ScoreRing value={scores.sustainability} label="Sostenibilidad" size={76} stroke={7} />
          </Card>
          <Card>
            <CardContent className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              <IndicatorBar indicator="fertility" value={indicators.fertility} compact />
              <IndicatorBar indicator="erosion" value={indicators.erosion} compact />
              <IndicatorBar indicator="waterQuality" value={indicators.waterQuality} compact />
              <IndicatorBar indicator="biodiversity" value={indicators.biodiversity} compact />
              <IndicatorBar indicator="moisture" value={indicators.moisture} compact />
              <IndicatorBar indicator="contamination" value={indicators.contamination} compact />
            </CardContent>
          </Card>
        </div>
        {pestAlerts > 0 && (
          <p className="flex items-center gap-2 rounded-lg bg-clay-400/10 px-3 py-2 text-sm text-clay-600">
            <Bug className="size-4" /> {pestAlerts} lote(s) con incidencia alta de plagas o enfermedades.
          </p>
        )}
      </div>

      <aside className="surface h-fit p-4 xl:sticky xl:top-[8.5rem] xl:max-h-[calc(100dvh-10rem)] xl:overflow-y-auto" aria-label="Detalle de la parcela">
        {selected ? (
          <ParcelPanel game={game} parcel={selected} />
        ) : (
          <EmptyState icon={MousePointerClick} title="Selecciona una parcela" description="Haz clic en un lote del mapa para ver su estado y ejecutar acciones." />
        )}
      </aside>
    </div>
  )
}
