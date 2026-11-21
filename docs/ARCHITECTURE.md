# Arquitectura de EcoFinca

## Principios

1. **El dominio no depende de la interfaz.** `src/engine` es TypeScript puro: no importa React, Zustand, Dexie ni nada del navegador. Puede ejecutarse en Node (las pruebas lo hacen) o en un *worker*.
2. **Funciones puras e inmutabilidad.** `applyAction(state, action)` y `advanceTurn(state)` reciben un estado y devuelven uno nuevo (`structuredClone` + modificación del borrador). El estado original nunca cambia; esto hace triviales el deshacer, la comparación y las pruebas.
3. **Determinismo.** Toda aleatoriedad proviene de `rngFor(semilla, turno, canal)`. El reloj del sistema no interviene en la simulación (las marcas de tiempo las pone la capa de persistencia).
4. **Coeficientes centralizados.** Ningún número mágico en componentes: los parámetros están en `engine/config/*` y los editables por el usuario en `ModelParams`, que se copia en cada partida para que sea reproducible.
5. **Validación en los bordes.** Zod valida la configuración de partida, las acciones que llegan desde la interfaz, los parámetros del modelo y cada partida leída de IndexedDB.

## Capas

```
┌──────────────────────────────────────────────────────────────┐
│ Presentación   src/modules, src/components, src/app          │
│   React + Tailwind v4 + Radix (shadcn) + Recharts + Router   │
├──────────────────────────────────────────────────────────────┤
│ Aplicación     src/store (Zustand), src/hooks                 │
│   Orquesta: motor ⇄ estado de UI ⇄ persistencia              │
├──────────────────────────────────────────────────────────────┤
│ Dominio        src/engine  (EcoFinca Engine)                  │
│   tipos · fórmulas · reglas · eventos · escenarios · turnos  │
├──────────────────────────────────────────────────────────────┤
│ Infraestructura src/persistence                               │
│   Dexie/IndexedDB · esquema Zod del guardado · migraciones   │
└──────────────────────────────────────────────────────────────┘
```

### Módulos del motor

| Carpeta | Responsabilidad |
|---|---|
| `domain/types.ts` | Entidades: `GameState`, `Parcel`, `CropState`, `Inventory`, `ClimateState`, `ActiveEvent`, `MonthlyRecord`, acciones… |
| `domain/selectors.ts` | Consultas puras: indicadores agregados, áreas, estimación de cosecha |
| `domain/ledger.ts` | Única vía para mover dinero, jornales y recursos; impide saldos negativos por acciones |
| `domain/schemas.ts` | Esquemas Zod de configuración, parámetros y acciones |
| `config/` | Coeficientes del modelo, variedades y etapas, precios y costos, información educativa de acciones |
| `formulas/` | Ecuaciones: agua, suelo, producción, salud, plagas, contaminación, biodiversidad, economía, factores |
| `rules/` | Acciones (costo, validación, efectos), puntuación, objetivos, victoria/fracaso, recomendaciones |
| `events/` | Catálogo declarativo de eventos y motor (condiciones, probabilidad, modificadores, respuestas) |
| `scenarios/` | Escenarios, geometría procedural de parcelas, creación de partidas |
| `simulation/` | Generación climática, pasos del turno y `advanceTurn` |
| `strategies/` | Estrategias automáticas (convencional/sostenible) y comparación controlada |

### Flujo de una acción del jugador

```
Botón «Hacer» ─► useGameAction() ─► store.perform(action)
                                     │ GameActionSchema.safeParse (Zod)
                                     │ applyAction(game, action)  ← motor puro
                                     │   validateAction → getActionCost → payCost → efectos
                                     ▼
                          set({ game: nuevoEstado }) ─► guardado automático (debounce 400 ms)
                                     ▼
                    React re-renderiza mapa, panel, barra superior; Sonner muestra el resultado
```

### Flujo de un turno

`store.advance()` llama `advanceTurn(game)`, guarda el nuevo estado, abre el **resumen del turno** y persiste de inmediato. Si aparecen eventos con decisión, el layout abre el diálogo de decisión. El **avance automático** (botón ▶) llama `advance({ quiet: true })` cada N segundos y se detiene ante decisiones pendientes o al pausar.

## Rutas (TanStack Router)

| Ruta | Pantalla |
|---|---|
| `/` | Inicio y partidas guardadas |
| `/nueva-partida` | Configuración de partida |
| `/como-jugar`, `/configuracion`, `/enciclopedia` | Guía, preferencias/parámetros, enciclopedia |
| `/juego/$gameId` | Layout del juego (carga la partida) → **Finca** (mapa) |
| `/juego/$gameId/{cultivos,recursos,ecosistema,clima,mercado,eventos,informes,enciclopedia,evaluacion}` | Secciones |

Se usa historial *hash* para que el build funcione en cualquier hosting estático sin reglas de reescritura. Las secciones con gráficas se cargan de forma diferida (`lazyRouteComponent`).

## Persistencia

- Base de datos `ecofinca` (Dexie), versión de índices 1: tablas `games` (estado completo + metadatos para listar) y `settings`.
- Cada partida guarda `schemaVersion`. `migrateSave()` aplica migraciones registradas en `MIGRATIONS` y valida el resultado con `GameStateSchema` (Zod). Un guardado dañado o de una versión futura produce un error descriptivo y nunca llega al motor.
- Guardado automático tras cada acción (con *debounce*) y cada turno; guardado manual desde la barra superior o el menú de pausa.

## Sistema de diseño

Paleta EcoFinca definida como *tokens* en `src/styles/globals.css` (`@theme` de Tailwind v4): verde bosque `#234D35`, verde natural `#4E8055`, verde claro `#A8C58B`, beige tierra `#E9DFC9`, café `#79563A`, azul agua `#4C91B5`, fondo `#F7F8F4`. Tipografías Nunito (títulos) e Inter (texto). Componentes en `src/components/ui` siguen la API de shadcn/ui sobre Radix.

Las gráficas usan una paleta categórica distinta, **validada para daltonismo** (ΔE CVD ≥ 9 en todos los pares sobre fondo blanco): azul `#2a78d6`, naranja `#eb6834`, aqua `#1baf7a`. Cada gráfica tiene una vista de tabla equivalente.

## Decisiones y supuestos

- **Tipos con `strict`, `noUncheckedIndexedAccess` y sin `any`.** Los pocos *casts* (`as`) del código de aplicación se usan después de validar con Zod, al recorrer `Object.entries` de registros tipados o al leer valores de controles de selección con opciones conocidas.
- **Sin modo oscuro.** La identidad visual se diseñó para tema claro; queda como mejora futura.
- **Geometría en el dominio.** El polígono de cada parcela forma parte de la entidad (como en un SIG), lo que permite calcular áreas y vecindades para la propagación de plagas.
