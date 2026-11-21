import { render } from '@testing-library/react'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { AppProviders } from '@/app/providers/AppProviders'
import { createAppRouter } from '@/app/router/router'

/** Renderiza la aplicación completa en una ruta dada (historial en memoria). */
export function renderApp(path: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }))
  const utils = render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { ...utils, router }
}
