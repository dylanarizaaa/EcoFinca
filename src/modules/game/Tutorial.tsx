import { useState } from 'react'
import { ArrowLeft, ArrowRight, GraduationCap, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    title: 'Bienvenido a tu finca',
    body: 'Administras una finca cafetera de 5 hectáreas. Tu meta es producir, ser rentable y conservar el ecosistema a la vez. La sostenibilidad pesa 40 % en tu puntuación.',
  },
  {
    title: 'El mapa y sus capas',
    body: 'Cada lote del mapa refleja su estado real. Cambia la capa (fertilidad, humedad, erosión, cultivos, biodiversidad) para detectar problemas antes de que sea tarde.',
  },
  {
    title: 'Selecciona un lote y actúa',
    body: 'Al seleccionar un lote verás su suelo, plagas y prácticas. Cada acción muestra su costo en dinero, jornales e insumos, y sus efectos ambientales. Pasa el cursor sobre ⓘ para aprender más.',
  },
  {
    title: 'Recursos y mercado',
    body: 'Compra insumos y vende tu café en Mercado. El agua del reservorio es limitada: riégala donde más importa. Los jornales se renuevan cada mes.',
  },
  {
    title: 'Avanza el tiempo',
    body: 'Con «Avanzar mes» se procesa el clima, el suelo, los cultivos, las plagas y la economía. Recibirás un resumen de lo ocurrido. El café tarda meses en florecer, fructificar y madurar.',
  },
  {
    title: 'Eventos y decisiones',
    body: 'Sequías, lluvias intensas, plagas u oportunidades comerciales requieren decisiones. Si no respondes, se aplicará la opción por defecto al avanzar el mes.',
  },
  {
    title: 'Mide tus resultados',
    body: 'En Informes verás la evolución de la finca, los objetivos del escenario y una comparación entre producción convencional y sostenible con el mismo clima.',
  },
]

export function Tutorial({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0)
  if (!open) return null
  const current = STEPS[step]
  if (!current) return null
  const last = step === STEPS.length - 1
  return (
    <div
      className="fixed right-4 bottom-[calc(1rem+var(--safe-bottom))] left-4 z-40 sm:left-auto sm:w-[400px] animate-in fade-in-0 slide-in-from-bottom-4"
      role="dialog"
      aria-label="Tutorial"
      data-testid="tutorial"
    >
      <div className="surface relative overflow-hidden border-forest-300 p-5 shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-muted">
          <div className="h-full bg-forest-500 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label="Cerrar tutorial"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-center gap-2 text-xs font-semibold text-forest-600">
          <GraduationCap className="size-4" /> Tutorial · paso {step + 1} de {STEPS.length}
        </div>
        <h2 className="mt-1 font-display text-lg font-bold">{current.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{current.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span key={i} className={cn('size-1.5 rounded-full', i === step ? 'bg-forest-600' : 'bg-muted-foreground/30')} />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft /> Atrás
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (last) {
                  setStep(0)
                  onClose()
                } else setStep((s) => s + 1)
              }}
            >
              {last ? '¡A trabajar!' : 'Siguiente'} {!last && <ArrowRight />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
