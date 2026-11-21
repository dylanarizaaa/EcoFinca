/**
 * Mapa interactivo de la finca en SVG. Todo lo que se dibuja proviene del
 * estado real de la partida: forma y estado de cada parcela, prácticas,
 * bosque, quebrada (color según calidad del agua), ronda hídrica y reservorio.
 */

import { memo, useMemo, useState } from 'react'
import { Bug, Droplet, ShoppingBasket, Sprout, TreePine } from 'lucide-react'
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  maxPestIncidence,
  mulberry32,
  STAGE_INFO,
  type GameState,
  type MapLayer,
  type Parcel,
  type Point,
} from '@/engine'
import { cn } from '@/lib/utils'
import { layerValue, parcelFill, waterColor } from './map-colors'

interface FarmMapProps {
  game: GameState
  layer: MapLayer
  selectedId: string | null
  onSelect: (id: string) => void
}

/* ------------------------------------------------------------------ */
/* Geometría auxiliar                                                   */
/* ------------------------------------------------------------------ */

function pointInPolygon([x, y]: Point, poly: readonly Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i]
    const pj = poly[j]
    if (!pi || !pj) continue
    if (pi[1] > y !== pj[1] > y && x < ((pj[0] - pi[0]) * (y - pi[1])) / (pj[1] - pi[1] || 1e-9) + pi[0]) inside = !inside
  }
  return inside
}

function plantPositions(shape: readonly Point[], spacing = 17): Point[] {
  const xs = shape.map((p) => p[0])
  const ys = shape.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const points: Point[] = []
  let row = 0
  for (let y = minY + spacing * 0.7; y < maxY - 4; y += spacing * 0.85, row++) {
    const offset = row % 2 === 0 ? 0 : spacing / 2
    for (let x = minX + spacing * 0.6 + offset; x < maxX - 4; x += spacing) {
      const p: Point = [x, y]
      if (pointInPolygon(p, shape)) points.push(p)
    }
  }
  return points
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

const toPath = (shape: readonly Point[]) => `M${shape.map((p) => `${p[0]},${p[1]}`).join('L')}Z`

/* ------------------------------------------------------------------ */
/* Paisaje                                                              */
/* ------------------------------------------------------------------ */

const FOREST_PATH =
  'M0,0 L1000,0 L1000,118 C930,132 880,108 820,122 C760,136 700,150 620,140 C540,130 480,152 400,148 C320,144 260,128 190,140 C120,152 60,138 0,146 Z'
const STREAM_PATH = 'M812,96 C826,150 868,182 874,236 C880,292 846,334 860,392 C874,450 930,478 934,540 C938,590 912,616 918,640'
const ROAD_PATH = 'M0,612 C140,600 300,618 460,606 C600,596 700,604 760,582 C790,570 800,548 806,520'

const forestTrees = (() => {
  const rng = mulberry32(2024)
  const trees: { x: number; y: number; r: number; shade: number }[] = []
  for (let i = 0; i < 150; i++) {
    const x = rng() * 1000
    const y = 8 + rng() * 120
    if (y > 112 + Math.sin(x / 90) * 10) continue
    trees.push({ x, y, r: 9 + rng() * 9, shade: rng() })
  }
  return trees.sort((a, b) => a.y - b.y)
})()

const DEGRADED_ZONE = { x: 36, width: 250 }

function ForestBand({ game }: { game: GameState }) {
  const env = game.environment
  const restorationMaturity = Math.min(1, env.restorationAge / 36)
  const inDegraded = (x: number) => x > DEGRADED_ZONE.x && x < DEGRADED_ZONE.x + DEGRADED_ZONE.width
  const hasDegraded = env.degradedHa > 0
  const restoring = env.restorationHa > 0
  return (
    <g aria-label="Bosque y zona de conservación">
      <path d={FOREST_PATH} fill="#2c5a3a" />
      <path d={FOREST_PATH} fill="url(#forest-texture)" opacity={0.5} />
      {(hasDegraded || restoring) && (
        <path
          d={`M${DEGRADED_ZONE.x},0 L${DEGRADED_ZONE.x + DEGRADED_ZONE.width},0 L${DEGRADED_ZONE.x + DEGRADED_ZONE.width},132 C${DEGRADED_ZONE.x + 160},146 ${DEGRADED_ZONE.x + 60},150 ${DEGRADED_ZONE.x},144 Z`}
          fill={hasDegraded ? '#c3a67b' : '#9cc07f'}
          opacity={0.95}
        />
      )}
      {hasDegraded && <path d={`M${DEGRADED_ZONE.x + 10},10 h230 v120 h-230 z`} fill="url(#cracks)" opacity={0.8} />}
      {forestTrees.map((t, i) => {
        if (inDegraded(t.x)) {
          if (hasDegraded) return i % 9 === 0 ? <circle key={i} cx={t.x} cy={t.y} r={3} fill="#7b6a45" /> : null
          if (restoring) {
            const r = 3 + t.r * restorationMaturity * 0.8
            return <circle key={i} cx={t.x} cy={t.y} r={r} fill={t.shade > 0.5 ? '#4e8055' : '#6a9c70'} />
          }
        }
        return (
          <g key={i}>
            <circle cx={t.x + 2} cy={t.y + 3} r={t.r} fill="#173a25" opacity={0.35} />
            <circle cx={t.x} cy={t.y} r={t.r} fill={t.shade > 0.6 ? '#3c6845' : t.shade > 0.3 ? '#2f553a' : '#4e8055'} />
            <circle cx={t.x - t.r * 0.3} cy={t.y - t.r * 0.35} r={t.r * 0.45} fill="#6a9c70" opacity={0.55} />
          </g>
        )
      })}
      <text x={520} y={60} textAnchor="middle" className="fill-forest-100 text-[15px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>
        Bosque nativo · {env.forestHa.toFixed(1)} ha
      </text>
      {hasDegraded && (
        <text x={DEGRADED_ZONE.x + 125} y={80} textAnchor="middle" className="fill-earth-700 text-[13px] font-bold">
          Área degradada
        </text>
      )}
      {restoring && (
        <text x={DEGRADED_ZONE.x + 125} y={80} textAnchor="middle" className="fill-forest-900 text-[13px] font-bold">
          En restauración {Math.round(restorationMaturity * 100)}%
        </text>
      )}
    </g>
  )
}

function Stream({ game }: { game: GameState }) {
  const env = game.environment
  const color = waterColor(env.waterQuality)
  const riparianWidth = 18 + env.riparian.level * 46
  const flowWidth = 5 + (env.streamFlow / 100) * 9
  return (
    <g aria-label="Quebrada y ronda hídrica">
      <path d={STREAM_PATH} fill="none" stroke="#6a9c70" strokeOpacity={0.25 + env.riparian.level * 0.5} strokeWidth={riparianWidth} strokeLinecap="round" />
      {env.riparian.level > 0.15 && (
        <path d={STREAM_PATH} fill="none" stroke="url(#riparian-dots)" strokeWidth={riparianWidth} strokeLinecap="round" opacity={env.riparian.level} />
      )}
      <path d={STREAM_PATH} fill="none" stroke="#e9dfc9" strokeWidth={flowWidth + 5} strokeLinecap="round" />
      <path d={STREAM_PATH} fill="none" stroke={color} strokeWidth={flowWidth} strokeLinecap="round" />
      <path
        d={STREAM_PATH}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.55}
        strokeWidth={1.6}
        strokeDasharray="6 14"
        className="animate-flow"
      />
      <circle cx={812} cy={96} r={9} fill={color} stroke="#e9dfc9" strokeWidth={3} />
      <text x={830} y={92} className="fill-white text-[12px] font-bold">Nacimiento</text>
      <text x={946} y={300} className="fill-water-600 text-[13px] font-bold" transform="rotate(78 946 300)">
        Quebrada
      </text>
    </g>
  )
}

function Infrastructure({ game }: { game: GameState }) {
  const infra = game.infrastructure
  const level = Math.max(0, Math.min(1, game.inventory.agua / infra.reservoirCapacity))
  const rx = 40 + Math.min(20, (infra.reservoirCapacity - 400) / 60)
  return (
    <g aria-label="Infraestructura">
      <path d={ROAD_PATH} fill="none" stroke="#d9c9a6" strokeWidth={14} strokeLinecap="round" />
      <path d={ROAD_PATH} fill="none" stroke="#c4ad80" strokeWidth={1.5} strokeDasharray="10 10" />

      {/* Reservorio */}
      <g transform="translate(790 300)">
        <ellipse cx={0} cy={0} rx={rx + 5} ry={30} fill="#c4ad80" />
        <ellipse cx={0} cy={0} rx={rx} ry={25} fill="#e9dfc9" />
        <clipPath id="reservoir-clip">
          <ellipse cx={0} cy={0} rx={rx} ry={25} />
        </clipPath>
        <rect x={-rx} y={25 - 50 * level} width={rx * 2} height={50 * level} fill="#4c91b5" clipPath="url(#reservoir-clip)" className="transition-all duration-700" />
        <text x={0} y={46} textAnchor="middle" className="fill-water-600 text-[12px] font-bold">
          Reservorio {Math.round(level * 100)}%
        </text>
      </g>

      {/* Casa */}
      <g transform="translate(752 400)">
        <rect x={0} y={18} width={46} height={32} rx={3} fill="#f4eedf" stroke="#79563a" strokeWidth={2} />
        <path d="M-6,20 L23,-2 L52,20 Z" fill="#b4432f" />
        <rect x={18} y={32} width={10} height={18} fill="#79563a" />
        <rect x={6} y={26} width={8} height={8} fill="#7fb5d1" />
        <text x={23} y={66} textAnchor="middle" className="fill-earth-700 text-[12px] font-bold">Casa</text>
      </g>

      {/* Almacén */}
      <g transform="translate(816 446)">
        <rect x={0} y={10} width={58} height={38} rx={3} fill="#e9dfc9" stroke="#79563a" strokeWidth={2} />
        <path d="M-4,12 L29,-6 L62,12 Z" fill="#79563a" />
        <rect x={20} y={24} width={18} height={24} fill="#a17853" />
        {game.inventory.cafe > 0 && (
          <g>
            <circle cx={50} cy={4} r={9} fill="#7a5a2f" />
            <text x={50} y={8} textAnchor="middle" className="fill-white text-[9px] font-bold">
              {game.inventory.cafe >= 1000 ? `${Math.round(game.inventory.cafe / 1000)}t` : Math.round(game.inventory.cafe)}
            </text>
          </g>
        )}
        <text x={29} y={64} textAnchor="middle" className="fill-earth-700 text-[12px] font-bold">Almacén</text>
      </g>

      {/* Beneficio */}
      <g transform="translate(748 500)">
        <rect x={0} y={8} width={44} height={30} rx={3} fill={infra.ecoProcessing ? '#dceadc' : '#f4eedf'} stroke="#79563a" strokeWidth={2} />
        <path d="M-3,10 L22,-4 L47,10 Z" fill={infra.ecoProcessing ? '#3c6845' : '#a17853'} />
        <circle cx={22} cy={24} r={7} fill={infra.ecoProcessing ? '#4e8055' : '#c09a74'} />
        <text x={22} y={54} textAnchor="middle" className="fill-earth-700 text-[12px] font-bold">
          {infra.ecoProcessing ? 'Beneficio eco' : 'Beneficio'}
        </text>
      </g>
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Parcelas                                                             */
/* ------------------------------------------------------------------ */

function plantColor(parcel: Parcel): { leaf: string; fruit: string | null; flower: boolean } {
  const crop = parcel.crop
  if (!crop || !crop.variety) return { leaf: '#9c7b55', fruit: null, flower: false }
  const healthy = crop.health > 55
  const leaf = healthy ? '#2f6b3c' : crop.health > 30 ? '#8a9a45' : '#a67c3d'
  switch (crop.stage) {
    case 'floracion':
      return { leaf, fruit: null, flower: true }
    case 'fructificacion':
      return { leaf, fruit: '#9cc36b', flower: false }
    case 'maduracion':
      return { leaf, fruit: '#d6542f', flower: false }
    case 'cosecha':
      return { leaf, fruit: '#b4232f', flower: false }
    default:
      return { leaf, fruit: null, flower: false }
  }
}

interface ParcelShapeProps {
  parcel: Parcel
  layer: MapLayer
  selected: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

const ParcelShape = memo(function ParcelShape({ parcel, layer, selected, onSelect, onHover }: ParcelShapeProps) {
  const path = toPath(parcel.shape)
  const plants = useMemo(() => plantPositions(parcel.shape), [parcel.shape])
  const [tl, tr, br, bl] = parcel.shape
  const fill = parcelFill(parcel, layer)
  const colors = plantColor(parcel)
  const clipId = `clip-${parcel.id}`
  const isDataLayer = layer !== 'general'
  const erosionOpacity = parcel.soil.erosion > 45 ? Math.min(0.85, (parcel.soil.erosion - 45) / 45) : 0
  const reforestMaturity = parcel.landUse === 'reforestacion' ? Math.min(1, parcel.reforestationAge / 36) : 0
  const stageName = parcel.crop ? STAGE_INFO[parcel.crop.stage].name : parcel.landUse === 'reforestacion' ? 'Reforestación' : 'Barbecho'
  const label = `${parcel.name} (${parcel.id}). ${stageName}. Fertilidad ${Math.round(parcel.soil.fertility)}, humedad ${Math.round(parcel.soil.moisture)}, erosión ${Math.round(parcel.soil.erosion)}.`

  const barrierLines =
    parcel.practices.barrier.active && tl && tr && br && bl
      ? [1 / 3, 2 / 3].map((t) => [lerpPoint(tl, bl, t), lerpPoint(tr, br, t)] as const)
      : []

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      data-testid={`parcel-${parcel.id}`}
      className="cursor-pointer outline-none [&:focus-visible>path.parcel-outline]:stroke-sun-400"
      onClick={() => onSelect(parcel.id)}
      onMouseEnter={() => onHover(parcel.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(parcel.id)}
      onBlur={() => onHover(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(parcel.id)
        }
      }}
    >
      <clipPath id={clipId}>
        <path d={path} />
      </clipPath>
      <path d={path} fill="#1a3826" opacity={0.18} transform="translate(3 5)" />
      <path d={path} fill={fill} className="transition-[fill] duration-500" />
      <g clipPath={`url(#${clipId})`}>
        {parcel.practices.cover.level > 0 && (
          <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#cover)" opacity={0.25 + parcel.practices.cover.level * 0.55} />
        )}
        {erosionOpacity > 0 && <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#cracks)" opacity={erosionOpacity} />}
        {parcel.landUse === 'reforestacion'
          ? plants
              .filter((_, i) => i % 3 === 0)
              .map((p, i) => (
                <circle
                  key={i}
                  cx={p[0]}
                  cy={p[1]}
                  r={3 + 7 * reforestMaturity}
                  fill={i % 2 ? '#3c6845' : '#4e8055'}
                  opacity={isDataLayer ? 0.35 : 0.95}
                />
              ))
          : parcel.crop?.variety &&
            plants.map((p, i) => (
              <g key={i} opacity={isDataLayer ? 0.3 : 1}>
                <circle cx={p[0]} cy={p[1]} r={parcel.crop?.stage === 'establecimiento' ? 2.4 : 4} fill={colors.leaf} />
                {colors.fruit && <circle cx={p[0] + 1.6} cy={p[1] + 1.4} r={1.6} fill={colors.fruit} />}
                {colors.flower && <circle cx={p[0] - 1} cy={p[1] - 1} r={1.5} fill="#ffffff" />}
              </g>
            ))}
        {parcel.crop && !parcel.crop.variety && (
          <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#furrows)" opacity={isDataLayer ? 0.3 : 0.8} />
        )}
        {parcel.practices.shade.level > 0 &&
          plants
            .filter((_, i) => i % 23 === 7)
            .map((p, i) => (
              <g key={`s${i}`} opacity={isDataLayer ? 0.35 : 0.9}>
                <circle cx={p[0] + 2} cy={p[1] + 3} r={6 + 10 * parcel.practices.shade.level} fill="#173a25" opacity={0.25} />
                <circle cx={p[0]} cy={p[1]} r={6 + 10 * parcel.practices.shade.level} fill="#3c6845" />
              </g>
            ))}
      </g>
      {barrierLines.map(([a, b], i) => (
        <line
          key={i}
          x1={a[0]}
          y1={a[1]}
          x2={b[0]}
          y2={b[1]}
          stroke="#2f553a"
          strokeWidth={2 + parcel.practices.barrier.level * 3}
          strokeDasharray="2 5"
          strokeLinecap="round"
          opacity={isDataLayer ? 0.5 : 0.95}
        />
      ))}
      <path
        d={path}
        fill="none"
        className="parcel-outline transition-all"
        stroke={selected ? '#eeb84a' : '#f7f8f4'}
        strokeWidth={selected ? 5 : 2.5}
        strokeLinejoin="round"
        filter={selected ? 'url(#glow)' : undefined}
      />
    </g>
  )
})

function ParcelBadge({ parcel, selected, layer }: { parcel: Parcel; selected: boolean; layer: MapLayer }) {
  const value = layerValue(parcel, layer)
  const pest = maxPestIncidence(parcel)
  const ready = parcel.crop?.stage === 'cosecha'
  const dry = parcel.crop?.variety && parcel.soil.moisture < 30
  const left = (parcel.centroid[0] / MAP_WIDTH) * 100
  const top = (parcel.centroid[1] / MAP_HEIGHT) * 100
  return (
    <div
      className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm ring-1 sm:text-xs',
          selected ? 'bg-sun-300 text-forest-900 ring-sun-500' : 'bg-white/90 text-forest-900 ring-black/5',
        )}
      >
        {parcel.id}
        {value !== null && <span className="ml-1 font-extrabold tabular">· {Math.round(value)}</span>}
      </span>
      <div className="flex gap-0.5">
        {ready && (
          <span className="flex size-5 animate-pulse-soft items-center justify-center rounded-full bg-earth-500 text-white shadow" title="Listo para cosechar">
            <ShoppingBasket className="size-3" />
          </span>
        )}
        {pest > 25 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-clay-500 text-white shadow" title="Plagas">
            <Bug className="size-3" />
          </span>
        )}
        {dry && (
          <span className="flex size-5 items-center justify-center rounded-full bg-sun-400 text-earth-700 shadow" title="Suelo seco">
            <Droplet className="size-3" />
          </span>
        )}
        {parcel.crop?.stage === 'preparacion' && (
          <span className="flex size-5 items-center justify-center rounded-full bg-sand-300 text-earth-700 shadow" title="Listo para sembrar">
            <Sprout className="size-3" />
          </span>
        )}
        {parcel.landUse === 'reforestacion' && (
          <span className="flex size-5 items-center justify-center rounded-full bg-forest-700 text-white shadow" title="Reforestación">
            <TreePine className="size-3" />
          </span>
        )}
      </div>
    </div>
  )
}

function HoverCard({ parcel }: { parcel: Parcel }) {
  const left = (parcel.centroid[0] / MAP_WIDTH) * 100
  const top = (parcel.centroid[1] / MAP_HEIGHT) * 100
  const flipX = left > 60
  const stage = parcel.crop ? STAGE_INFO[parcel.crop.stage].name : parcel.landUse === 'reforestacion' ? 'Reforestación' : 'Barbecho'
  return (
    <div
      className={cn(
        'pointer-events-none absolute z-10 hidden w-48 rounded-xl border border-border bg-card/95 p-3 text-xs shadow-xl backdrop-blur sm:block',
        flipX ? '-translate-x-[110%]' : 'translate-x-[10%]',
      )}
      style={{ left: `${left}%`, top: `${Math.min(top, 70)}%` }}
    >
      <div className="font-display text-sm font-bold">
        {parcel.name} · {parcel.areaHa.toFixed(2)} ha
      </div>
      <div className="mb-1.5 text-muted-foreground">{stage}</div>
      <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5 tabular">
        <dt>Fertilidad</dt>
        <dd className="text-right font-semibold">{Math.round(parcel.soil.fertility)}</dd>
        <dt>Humedad</dt>
        <dd className="text-right font-semibold">{Math.round(parcel.soil.moisture)}</dd>
        <dt>Erosión</dt>
        <dd className="text-right font-semibold">{Math.round(parcel.soil.erosion)}</dd>
        {parcel.crop?.variety && (
          <>
            <dt>Salud</dt>
            <dd className="text-right font-semibold">{Math.round(parcel.crop.health)}</dd>
          </>
        )}
      </dl>
    </div>
  )
}

function MapDefs() {
  return (
    <defs>
      <linearGradient id="terrain" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#cfe0b8" />
        <stop offset="0.6" stopColor="#dfe6c4" />
        <stop offset="1" stopColor="#e9dfc9" />
      </linearGradient>
      <pattern id="forest-texture" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="1.5" fill="#6a9c70" opacity="0.5" />
        <circle cx="12" cy="11" r="1.2" fill="#1a3826" opacity="0.5" />
      </pattern>
      <pattern id="cover" width="10" height="10" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="3" r="1.4" fill="#a8c58b" />
        <circle cx="7" cy="8" r="1.2" fill="#8fb26f" />
      </pattern>
      <pattern id="cracks" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M2,8 L12,14 L10,24 L20,30 M24,4 L30,14 L38,16 M14,14 L22,12" stroke="#8f5a2f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </pattern>
      <pattern id="furrows" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-4)">
        <rect width="14" height="7" fill="#a17853" opacity="0.45" />
      </pattern>
      <pattern id="riparian-dots" width="12" height="12" patternUnits="userSpaceOnUse">
        <circle cx="6" cy="6" r="3" fill="#3c6845" />
      </pattern>
      <pattern id="contours" width="1000" height="60" patternUnits="userSpaceOnUse">
        <path d="M0,30 C200,18 400,42 600,28 C800,14 900,36 1000,30" stroke="#a8c58b" strokeWidth="1" fill="none" opacity="0.7" />
      </pattern>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  )
}

export function FarmMap({ game, layer, selectedId, onSelect }: FarmMapProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const hoveredParcel = hovered ? game.parcels.find((p) => p.id === hovered) : undefined
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-[#dfe6c4] shadow-inner" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}>
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="absolute inset-0 h-full w-full select-none"
        role="group"
        aria-label={`Mapa de la finca ${game.config.farmName}`}
      >
        <MapDefs />
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#terrain)" />
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#contours)" />
        <ForestBand game={game} />
        <Stream game={game} />
        <Infrastructure game={game} />
        {game.parcels.map((p) => (
          <ParcelShape key={p.id} parcel={p} layer={layer} selected={p.id === selectedId} onSelect={onSelect} onHover={setHovered} />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0">
        {game.parcels.map((p) => (
          <ParcelBadge key={p.id} parcel={p} selected={p.id === selectedId} layer={layer} />
        ))}
        {hoveredParcel && <HoverCard parcel={hoveredParcel} />}
      </div>
    </div>
  )
}
