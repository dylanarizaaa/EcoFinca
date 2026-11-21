# Pruebas

EcoFinca usa **Vitest** (entorno `jsdom`), **React Testing Library**, **@testing-library/user-event** y **fake-indexeddb**.

```bash
npm test            # ejecuta todas las pruebas una vez
npm run test:watch  # modo observador
npm run typecheck   # verificación de tipos estricta
npm run build       # tipos + build de producción
```

## Resultado actual

```
Test Files  7 passed (7)
     Tests  122 passed (122)
```

| Archivo | Pruebas | Qué verifica |
|---|---|---|
| `tests/engine/formulas.test.ts` | 29 | Fertilidad, humedad, escorrentía, drenaje, ET, erosión, producción, factores normalizados, rentabilidad, contaminación, calidad del agua, biodiversidad, efectos de fertilizantes químico/orgánico, riego y clima — con resultados numéricos exactos |
| `tests/engine/actions.test.ts` | 23 | Costos y descuento automático de recursos, inmutabilidad, validaciones (sin dinero, sin insumos, compra inválida, labor repetida, cultivo inmaduro), fertilización, riego (agua consumida, efecto en humedad, goteo), siembra, cosecha, venta, venta anticipada, control químico vs MIP, inversiones, conservación, reforestación |
| `tests/engine/turn.test.ts` | 16 | Avance de calendario, historial, costos fijos, determinismo con semilla, variables siempre en rango durante 30 meses en los 3 escenarios (dificultad alta), resumen de turno, avance fenológico, pérdida de cosecha, clima reproducible y afectado por escenario y eventos, configuración de partida (escenarios, parcelas, presupuesto, duración, validación Zod, 5 ha) |
| `tests/engine/events-scoring.test.ts` | 20 | Estructura de todos los eventos, modificadores (sequía, lluvias), brote localizado y vecinos, respuestas con costo y efecto, modificadores de respuesta, respuesta por defecto, expiración, condiciones, determinismo, ponderación 30/30/40, topes por baja sostenibilidad, quiebra, colapso, derrota al avanzar, objetivos, evaluación final y recomendaciones |
| `tests/integration/full-game.test.ts` | 9 | Ciclo productivo completo en un lote nuevo (preparar → sembrar → todas las etapas → cosechar → vender), partida completa con evaluación final y cierre de ciclo, reflejo de costos en el historial, conservación vs pasividad, exceso de químico vs contaminación, comparación de estrategias con el mismo clima, superioridad ambiental de la estrategia sostenible y reproducibilidad |
| `tests/persistence/persistence.test.ts` | 11 | Guardado y recuperación idénticos (incluida la semilla), continuidad exacta tras recargar, listado/orden/borrado, partida inexistente, guardados dañados y de versión futura, migraciones, configuración con validación, store completo (crear → actuar → avanzar → guardar → descargar → recuperar) y validación Zod de acciones |
| `tests/components/app.test.tsx` | 14 | Inicio (botones, «Continuar» deshabilitado/habilitado, borrado con confirmación), formulario de partida (errores Zod y creación real), juego (barra superior con datos reales, mapa, selección de parcela, acción que modifica el estado, avance con resumen, navegación que preserva la partida, menú de pausa) e indicadores accesibles |

## Estrategia

- **Motor:** pruebas unitarias de funciones puras con valores numéricos esperados, y pruebas de propiedades (rangos 0–100, saldos no negativos, determinismo).
- **Integración:** partidas completas sobre el motor real, sin *mocks*.
- **Persistencia:** IndexedDB real en memoria (`fake-indexeddb`) con una base de datos aislada por prueba (`setDb`).
- **Componentes:** se renderiza la aplicación completa con el router en un historial en memoria (`tests/components/render.tsx`) para probar flujos reales de usuario.

`tests/setup.ts` agrega *polyfills* de `ResizeObserver`, `matchMedia` y APIs de puntero que jsdom no implementa (necesarios para Radix UI y Recharts).

## Pruebas manuales en navegador

Además se verificó la aplicación construida (`npm run build && npm run preview`) con Playwright/Chromium: creación de partida, tutorial, selección de parcelas, acciones, avance de meses con resumen y eventos, cambio de capas, las 9 secciones, comparación de estrategias, recarga de la página con recuperación de la partida, y vistas de escritorio (1440 px), tableta (820 px) y móvil (390 px) sin desbordamiento horizontal ni errores en consola.
