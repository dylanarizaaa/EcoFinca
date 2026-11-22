import { useEffect, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/overlays'
import { useSettingsStore } from '@/store/settings-store'

export function AppProviders({ children }: { children: ReactNode }) {
  const load = useSettingsStore((s) => s.load)
  const showTooltips = useSettingsStore((s) => s.settings.showTooltips)
  useEffect(() => {
    void load()
  }, [load])
  return (
    <TooltipProvider delayDuration={showTooltips ? 250 : 100_000} skipDelayDuration={100}>
      {children}
      <Toaster
        position="top-center"
        offset={{ top: 'calc(16px + var(--safe-top))' }}
        mobileOffset={{ top: 'calc(12px + var(--safe-top))' }}
        richColors
        closeButton
        toastOptions={{ classNames: { toast: 'font-sans rounded-xl', title: 'font-semibold' } }}
      />
    </TooltipProvider>
  )
}
