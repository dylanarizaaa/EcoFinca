/**
 * Ilustración original de un paisaje cafetero andino: montañas en capas,
 * surcos de café en contorno, árboles de sombrío, una casa campesina y una
 * quebrada. Dibujada a mano en SVG para EcoFinca.
 */

import { mulberry32 } from '@/engine'

const rng = mulberry32(77)
const coffeeRows = Array.from({ length: 9 }, (_, row) => ({
  y: 300 + row * 18,
  offset: rng() * 20,
}))
const shadeTrees = Array.from({ length: 12 }, () => ({ x: 80 + rng() * 760, y: 305 + rng() * 140, r: 12 + rng() * 10 }))
const ridgeTrees = Array.from({ length: 40 }, () => ({ x: rng() * 1000, y: 150 + rng() * 40, r: 6 + rng() * 6 }))

export function HeroLandscape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 520" className={className} role="img" aria-label="Ilustración de una finca cafetera en las montañas colombianas">
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6e9f2" />
          <stop offset="1" stopColor="#f4eedf" />
        </linearGradient>
        <linearGradient id="hero-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#92ba96" />
          <stop offset="1" stopColor="#bcd6bd" />
        </linearGradient>
        <linearGradient id="hero-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4e8055" />
          <stop offset="1" stopColor="#6a9c70" />
        </linearGradient>
        <linearGradient id="hero-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8c58b" />
          <stop offset="1" stopColor="#8fb26f" />
        </linearGradient>
        <clipPath id="hero-near-clip">
          <path d="M0,290 C150,250 300,270 450,262 C620,252 780,280 1000,256 L1000,520 L0,520 Z" />
        </clipPath>
      </defs>
      <rect width="1000" height="520" fill="url(#hero-sky)" />
      <circle cx="820" cy="96" r="44" fill="#f6d27a" />
      <circle cx="820" cy="96" r="62" fill="#f6d27a" opacity="0.25" />
      <g className="animate-sway" opacity="0.9">
        <ellipse cx="220" cy="90" rx="58" ry="16" fill="#ffffff" />
        <ellipse cx="260" cy="80" rx="40" ry="16" fill="#ffffff" />
        <ellipse cx="610" cy="60" rx="46" ry="12" fill="#ffffff" opacity="0.8" />
      </g>
      <path d="M0,210 C120,130 210,170 320,120 C430,70 520,150 640,110 C760,70 860,140 1000,100 L1000,300 L0,300 Z" fill="url(#hero-far)" />
      <path d="M0,250 C140,170 260,220 380,175 C500,130 600,200 720,165 C840,130 920,190 1000,170 L1000,320 L0,320 Z" fill="url(#hero-mid)" />
      {ridgeTrees.map((t, i) => (
        <circle key={i} cx={t.x} cy={t.y + Math.sin(t.x / 120) * 18} r={t.r} fill={i % 3 ? '#2f553a' : '#3c6845'} />
      ))}
      <path d="M0,290 C150,250 300,270 450,262 C620,252 780,280 1000,256 L1000,520 L0,520 Z" fill="url(#hero-near)" />
      <g clipPath="url(#hero-near-clip)">
        {coffeeRows.map((row, i) => (
          <g key={i}>
            {Array.from({ length: 48 }, (_, j) => {
              const x = j * 22 + row.offset
              const y = row.y + Math.sin((x + i * 40) / 130) * 10
              return (
                <g key={j}>
                  <circle cx={x} cy={y} r={7} fill={i % 2 ? '#2f6b3c' : '#3c6845'} />
                  {(i + j) % 5 === 0 && <circle cx={x + 3} cy={y + 2} r={2} fill="#b4232f" />}
                </g>
              )
            })}
          </g>
        ))}
        {shadeTrees.map((t, i) => (
          <g key={i}>
            <rect x={t.x - 2} y={t.y} width={4} height={t.r + 8} fill="#79563a" />
            <circle cx={t.x} cy={t.y} r={t.r} fill="#234d35" />
            <circle cx={t.x - t.r * 0.3} cy={t.y - t.r * 0.3} r={t.r * 0.5} fill="#4e8055" />
          </g>
        ))}
      </g>
      <path
        d="M640,520 C660,470 700,440 690,400 C680,360 720,330 760,312 C800,296 840,284 880,268"
        fill="none"
        stroke="#4c91b5"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M640,520 C660,470 700,440 690,400 C680,360 720,330 760,312 C800,296 840,284 880,268"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.6"
        strokeWidth="2"
        strokeDasharray="8 16"
        className="animate-flow"
      />
      <g transform="translate(470 360)">
        <rect x="0" y="30" width="96" height="62" rx="4" fill="#f4eedf" stroke="#79563a" strokeWidth="3" />
        <path d="M-12,34 L48,-6 L108,34 Z" fill="#b4432f" />
        <rect x="38" y="54" width="20" height="38" fill="#79563a" />
        <rect x="10" y="46" width="18" height="16" fill="#7fb5d1" stroke="#79563a" strokeWidth="2" />
        <rect x="68" y="46" width="18" height="16" fill="#7fb5d1" stroke="#79563a" strokeWidth="2" />
        <path d="M-20,94 L118,94" stroke="#79563a" strokeWidth="3" />
      </g>
      <path d="M0,500 C200,470 380,505 560,480 C700,462 860,490 1000,470 L1000,520 L0,520 Z" fill="#e9dfc9" />
    </svg>
  )
}
