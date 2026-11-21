import { useEffect } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import { Compass, Home } from 'lucide-react'
import { EmptyState } from '@/components/common/layout'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/store/settings-store'

export function RootLayout() {
  const reduceMotion = useSettingsStore((s) => s.settings.reduceMotion)
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
  }, [reduceMotion])
  return <Outlet />
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-lg p-6 pt-24">
      <EmptyState
        icon={Compass}
        title="Página no encontrada"
        description="El camino que buscas no existe en esta finca."
        action={
          <Button asChild>
            <Link to="/">
              <Home /> Ir al inicio
            </Link>
          </Button>
        }
      />
    </div>
  )
}
