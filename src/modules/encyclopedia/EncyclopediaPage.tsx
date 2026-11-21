import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, BookOpen, Cog, Lightbulb, MapPin, Search, Sparkles } from 'lucide-react'
import { Logo, PageHeader } from '@/components/common/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ENCYCLOPEDIA } from './content'

function EncyclopediaContent() {
  const [selectedId, setSelectedId] = useState(ENCYCLOPEDIA[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const filtered = ENCYCLOPEDIA.filter((e) => `${e.title} ${e.summary} ${e.definition}`.toLowerCase().includes(query.toLowerCase()))
  const entry = ENCYCLOPEDIA.find((e) => e.id === selectedId) ?? ENCYCLOPEDIA[0]
  if (!entry) return null

  const sections = [
    { icon: BookOpen, title: 'Definición', text: entry.definition },
    { icon: Sparkles, title: 'Importancia', text: entry.importance },
    { icon: AlertTriangle, title: 'Consecuencias', text: entry.consequences },
    { icon: MapPin, title: 'Ejemplo en la finca', text: entry.example },
    { icon: Cog, title: 'Relación con el simulador', text: entry.mechanics },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <nav className="flex flex-col gap-2" aria-label="Conceptos">
        <div className="relative">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar concepto…" className="pl-9" aria-label="Buscar concepto" />
        </div>
        <ul className="flex gap-2 overflow-x-auto lg:flex-col">
          {filtered.map((e) => (
            <li key={e.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelectedId(e.id)}
                aria-current={e.id === entry.id}
                className={cn(
                  'w-full rounded-xl px-3 py-2 text-left text-sm transition-colors',
                  e.id === entry.id ? 'bg-forest-800 text-white' : 'hover:bg-muted',
                )}
              >
                <span className="font-semibold">{e.title}</span>
                <span className={cn('hidden text-xs lg:block', e.id === entry.id ? 'text-forest-100' : 'text-muted-foreground')}>{e.summary}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="text-sm text-muted-foreground">Sin resultados.</li>}
        </ul>
      </nav>
      <article className="flex flex-col gap-4" aria-labelledby="entry-title">
        <div>
          <h2 id="entry-title" className="font-display text-2xl font-black text-forest-900">
            {entry.title}
          </h2>
          <p className="text-muted-foreground">{entry.summary}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {sections.map((s, i) => (
            <Card key={s.title} className={cn(i === sections.length - 1 && 'border-forest-200 bg-forest-50 md:col-span-2')}>
              <CardContent className="flex gap-3">
                <s.icon className="mt-0.5 size-5 shrink-0 text-forest-600" />
                <div>
                  <h3 className="font-display font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed">{s.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Lightbulb className="size-4 text-sun-500" />
          <span className="text-sm text-muted-foreground">Relacionado:</span>
          {entry.related.map((id) => {
            const rel = ENCYCLOPEDIA.find((e) => e.id === id)
            return (
              rel && (
                <button key={id} type="button" onClick={() => setSelectedId(id)}>
                  <Badge variant="outline" className="hover:bg-muted">
                    {rel.title}
                  </Badge>
                </button>
              )
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Nota: los valores numéricos del simulador son parámetros de un modelo educativo simplificado, no mediciones científicas.
        </p>
      </article>
    </div>
  )
}

export function EncyclopediaPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader icon={BookOpen} title="Enciclopedia" description="Conceptos de agricultura sostenible y su relación con las mecánicas del simulador." />
      <EncyclopediaContent />
    </div>
  )
}

export function StandaloneEncyclopediaPage() {
  return (
    <div className="min-h-dvh paper-texture">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft /> Inicio
          </Link>
        </Button>
        <Logo />
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <EncyclopediaPage />
      </main>
    </div>
  )
}
