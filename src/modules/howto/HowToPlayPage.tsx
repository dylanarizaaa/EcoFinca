import { Link } from '@tanstack/react-router'
import { ArrowLeft, BarChart3, CalendarClock, FastForward, Map, MousePointerClick, Plus, Save, Store, Target } from 'lucide-react'
import { Logo } from '@/components/common/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const STEPS = [
  { icon: Plus, title: 'Crea tu finca', text: 'Elige escenario (finca equilibrada, suelo degradado o crisis hídrica), dificultad, presupuesto, duración, número de parcelas y semilla.' },
  { icon: Map, title: 'Lee el mapa', text: 'Cada lote muestra su estado real. Usa las capas de fertilidad, humedad, erosión, cultivos y biodiversidad para diagnosticar.' },
  { icon: MousePointerClick, title: 'Actúa en cada lote', text: 'Prepara, siembra, fertiliza, riega, controla plagas, establece coberturas, barreras o sombrío, mantén y cosecha. Cada acción cuesta dinero, jornales e insumos.' },
  { icon: Store, title: 'Gestiona recursos', text: 'Compra insumos, vende tu café, contrata jornales e invierte en riego por goteo, beneficio ecológico, reservorio o certificación.' },
  { icon: FastForward, title: 'Avanza los meses', text: 'Cada turno procesa clima, agua, suelo, cultivos, plagas, ambiente y economía. Revisa el resumen mensual para entender qué cambió.' },
  { icon: CalendarClock, title: 'Responde a los eventos', text: 'Sequías, lluvias intensas, plagas, alzas de precios u oportunidades comerciales. Tus respuestas tienen costos y consecuencias.' },
  { icon: BarChart3, title: 'Analiza y compara', text: 'En Informes verás la evolución de la finca, la evaluación por ciclo y una comparación entre producción convencional y sostenible con el mismo clima.' },
  { icon: Target, title: 'Cumple los objetivos', text: 'Al terminar la partida recibes una evaluación final. Ganas si cumples los objetivos del escenario sin una clasificación deficiente.' },
  { icon: Save, title: 'Tu progreso se guarda', text: 'La partida se guarda automáticamente en este dispositivo. Puedes continuarla después de cerrar la aplicación o la página.' },
]

const TIPS = [
  'La sostenibilidad pesa 40 %: una finca muy rentable pero erosionada y contaminada no obtiene buena nota.',
  'El fertilizante químico en exceso (fertilidad > 82) no aumenta la producción y contamina la quebrada.',
  'Cosecha en el primer mes de la etapa de cosecha: en el segundo pierdes 30 % y si no cosechas, el fruto alimenta la broca.',
  'Las plagas se propagan entre lotes vecinos. La biodiversidad reduce su crecimiento.',
  'La cobertura vegetal es la práctica de conservación más barata y rápida contra la erosión.',
  'En crisis hídrica, riega solo los lotes en floración y fructificación, y considera el riego por goteo.',
  'Si te falta dinero para pagar la recolección, se vende parte de la cosecha por adelantado.',
  'Usa la misma semilla para repetir una partida y comparar estrategias.',
]

export function HowToPlayPage() {
  return (
    <div className="min-h-dvh paper-texture">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft /> Inicio
          </Link>
        </Button>
        <Logo />
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-16 sm:px-6">
        <div>
          <h1 className="font-display text-3xl font-black text-forest-900">Cómo jugar</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            EcoFinca es un simulador por turnos mensuales. Tu reto es demostrar que una finca cafetera puede ser productiva y rentable sin destruir el
            suelo, el agua y la biodiversidad de los que depende.
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full">
                <CardContent className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-forest-800 text-leaf-200">
                    <s.icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-forest-600">Paso {i + 1}</p>
                    <h2 className="font-display font-bold">{s.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
        <section>
          <h2 className="font-display text-xl font-bold">Consejos</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {TIPS.map((t) => (
              <li key={t} className="surface-muted p-3 text-sm">
                {t}
              </li>
            ))}
          </ul>
        </section>
        <section className="surface p-5">
          <h2 className="font-display text-xl font-bold">Puntuación</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Puntuación = Productividad × 0,30 + Rentabilidad × 0,30 + Sostenibilidad × 0,40. Clasificaciones: Excelente (≥ 80 y sostenibilidad ≥ 70), Buena
            (≥ 65), Aceptable (≥ 50) y Deficiente. Con sostenibilidad &lt; 60 la puntuación máxima es 64; con sostenibilidad &lt; 40, 49. Pierdes si el saldo
            permanece negativo 3 meses, si la deuda supera el 40 % del presupuesto inicial o si la sostenibilidad cae por debajo de 20 durante 3 meses.
          </p>
        </section>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" asChild>
            <Link to="/nueva-partida">
              <Plus /> Empezar una partida
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/enciclopedia">Abrir la enciclopedia</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
