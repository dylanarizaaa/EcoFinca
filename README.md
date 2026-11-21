# EcoFinca 🌱☕

**Simulador educativo de producción agrícola sostenible en una finca cafetera colombiana.**

EcoFinca pone al jugador en el rol de administrador de una finca cafetera de cinco hectáreas. Cada decisión —preparar, sembrar, fertilizar, regar, controlar plagas, conservar el suelo, invertir, cosechar y vender— afecta simultáneamente la **productividad**, la **rentabilidad**, el **estado del ecosistema** y la **disponibilidad de recursos naturales**. El simulador demuestra que maximizar la producción a corto plazo no necesariamente es la mejor estrategia a largo plazo.

> ⚠️ **Modelo educativo simplificado.** Las fórmulas, coeficientes y precios del juego son parámetros de calibración hipotéticos, no datos científicos ni cotizaciones reales. Ver [docs/SIMULATION-MODEL.md](docs/SIMULATION-MODEL.md) para la diferencia entre datos documentados y supuestos.

---

## Objetivo académico

Enseñar, mediante una experiencia interactiva, cómo las prácticas agrícolas se relacionan con la problemática ambiental de las zonas cafeteras:

- degradación del suelo y erosión en laderas,
- contaminación de fuentes hídricas (agroquímicos, sedimentos, aguas mieles del beneficio),
- uso ineficiente del agua,
- uso inadecuado de fertilizantes,
- pérdida de biodiversidad.

El jugador puede comprobar con un **experimento controlado** (misma semilla, mismo clima) que una estrategia sostenible obtiene mejor evaluación global que una estrategia convencional intensiva en insumos.

## Funcionalidades

| Área | Qué incluye |
|---|---|
| Inicio | Logotipo, ilustración original de finca cafetera, nueva partida, continuar (deshabilitado sin partidas), cómo jugar, configuración, lista de partidas guardadas con borrado confirmado |
| Configuración de partida | Nombre de finca y administrador, 3 escenarios, 3 dificultades, presupuesto, duración (1–5 años), número de parcelas (4/6/8/9), semilla. Validación con Zod |
| Pantalla de juego | Barra superior (finca, mes/año, ciclo, dinero, agua, clima, jornales, guardar, pausa, avance automático, avanzar mes), navegación por 9 secciones, mapa SVG interactivo con 6 capas, panel lateral contextual |
| Mapa | Parcelas generadas proceduralmente, cafetos según etapa, coberturas, barreras, sombrío, grietas por erosión, bosque, área degradada/restaurada, quebrada (color según calidad del agua), ronda hídrica, reservorio con nivel real, casa, almacén y beneficio |
| Cultivos | 7 etapas fenológicas configurables, 4 variedades, salud, edad, producción estimada y acumulada |
| Acciones | Preparar, sembrar, fertilizar (orgánico/químico, 3 dosis), regar, control de plagas (químico/MIP), cobertura, barreras vivas, sombrío, mantenimiento, cosechar, reforestar. Cada una con costo, condiciones, efectos inmediatos, ambientales y de largo plazo |
| Motor | Turnos mensuales deterministas con semilla; suelo, agua, erosión, fertilidad, cultivos, plagas, contaminación, biodiversidad, economía y eventos |
| Clima | Temperatura, precipitación, humedad, riesgo de sequía, intensidad de lluvia; 6 condiciones; perfil bimodal por escenario; perspectiva estacional |
| Plagas | Broca, roya y mancha de hierro con favorabilidad ambiental, propagación entre lotes vecinos, brotes, tratamientos preventivos y correctivos |
| Recursos | Dinero (COP), agua, abono orgánico, fertilizante químico, plaguicida, control biológico, colinos, jornales; alertas críticas; validaciones de saldo |
| Economía y mercado | Precio del café con variación controlada, compra de insumos, venta de cosecha, inversiones, costos fijos, historial de movimientos, balance por categoría |
| Conservación | Abonos orgánicos, barreras, coberturas, reforestación, ronda hídrica, riego por goteo, beneficio ecológico (tratamiento de residuos y compostaje), MIP |
| Eventos | 11 eventos extensibles con condiciones, probabilidad, impacto, duración y respuestas |
| Puntuación | Productividad × 0,30 + Rentabilidad × 0,30 + Sostenibilidad × 0,40, con topes por baja sostenibilidad; evaluación por ciclo y final; objetivos por escenario; victoria/fracaso; recomendaciones |
| Informes | 7 gráficas de indicadores, producción por ciclo, ingresos/gastos, rentabilidad acumulada, consumo de agua, comparación de estados y ciclos, **comparación de estrategias** con semilla controlada. Cada gráfica tiene vista de tabla |
| Enciclopedia | 8 conceptos con definición, importancia, consecuencias, ejemplo y relación con el simulador |
| Persistencia | IndexedDB con Dexie, guardado automático, versionado de esquema y migraciones, validación Zod al cargar |

## Stack tecnológico

- **React 19** + **TypeScript** (modo `strict`, `noUncheckedIndexedAccess`) + **Vite 8**
- **Tailwind CSS v4** + componentes estilo **shadcn/ui** sobre **Radix UI**
- **TanStack Router** (rutas por código, historial *hash* para hosting estático)
- **Zustand** (estado global) · **Zod** (validación) · **Recharts** (gráficas)
- **Dexie** + IndexedDB (persistencia) · **Lucide React** (iconos) · **Sonner** (notificaciones)
- **Vitest** + **React Testing Library** + **fake-indexeddb** (pruebas)

Sin backend ni servicios externos: todo funciona en el navegador. Las fuentes tipográficas (Inter y Nunito) se empaquetan localmente.

## Requisitos

- Node.js ≥ 20 (probado con Node 22) y npm ≥ 10.

## Instalación y comandos

```bash
npm install          # instala dependencias
npm run dev          # servidor de desarrollo (http://localhost:5173)
npm run build        # verificación de tipos (tsc -b) + build de producción en dist/
npm run preview      # sirve el build de producción
npm run typecheck    # solo verificación de tipos
npm test             # ejecuta todas las pruebas (Vitest)
npm run test:watch   # pruebas en modo observador
```

## Arquitectura

```
src/
├── engine/          # Dominio: EcoFinca Engine (TypeScript puro, sin React)
│   ├── domain/      #   tipos, selectores, esquemas Zod, libro de movimientos
│   ├── config/      #   coeficientes del modelo, cultivos, economía, info de acciones
│   ├── formulas/    #   funciones puras: agua, suelo, producción, salud, plagas, contaminación…
│   ├── rules/       #   acciones (costo/validación/efectos), puntuación, objetivos, recomendaciones
│   ├── events/      #   catálogo extensible y motor de eventos
│   ├── scenarios/   #   escenarios, geometría de parcelas, creación de partida
│   ├── simulation/  #   clima, pasos del turno y avance mensual
│   └── strategies/  #   estrategias automáticas y comparación controlada
├── persistence/     # Infraestructura: Dexie, esquema Zod del guardado, migraciones, repositorio
├── store/           # Aplicación: stores Zustand que orquestan motor + persistencia
├── app/             # Router, layouts y providers
├── modules/         # Presentación por sección (home, setup, farm, crops, resources, …)
├── components/      # UI reutilizable (ui/ estilo shadcn, common/, charts/, illustrations/)
├── hooks/ lib/      # Hooks y utilidades de presentación
└── tests/           # Pruebas de motor, integración, persistencia y componentes
```

La regla central: **las fórmulas viven solo en `src/engine`**. Los componentes leen el estado y despachan acciones; el motor devuelve un nuevo estado (inmutable). Detalles en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## El motor EcoFinca Engine

Cada mes se ejecutan, en orden determinista: decisiones pendientes → modificadores de eventos → recursos hídricos → suelo por parcela → cultivos → plagas → impactos ambientales → economía → registro e historial → calendario → eventos → clima del nuevo mes → reinicio mensual → victoria/fracaso. Cada turno produce un resumen con los cambios.

La aleatoriedad usa flujos independientes por canal derivados de `(semilla, turno, canal)`: dos estrategias con la misma semilla viven exactamente el mismo clima.

### Fórmulas principales

| Variable | Relación (escala 0–100) |
|---|---|
| Fertilidad | `F(t+1) = F(t) + Recuperación − Degradación` |
| Humedad | `H(t+1) = H(t) + Precipitación − Escorrentía + Riego efectivo − Evapotranspiración − Drenaje` |
| Erosión | `E(t+1) = E(t) + Erosividad × Pendiente × (1 − Protección) − Estabilización` |
| Producción | `Área × Rendimiento base × fFertilidad × fHídrico × fSalud × fClimático` |
| Rentabilidad | `Ganancia = Ingresos por cosecha − Costos totales` |
| Contaminación | `C(t+1) = C(t) + Aportes contaminantes − Mitigación` |
| Puntuación | `0,30 × Productividad + 0,30 × Rentabilidad + 0,40 × Sostenibilidad` |

Todos los coeficientes están centralizados en [`src/engine/config/model.ts`](src/engine/config/model.ts). Explicación completa en [docs/SIMULATION-MODEL.md](docs/SIMULATION-MODEL.md) y [docs/ENVIRONMENTAL-MODEL.md](docs/ENVIRONMENTAL-MODEL.md).

## Escenarios

| Escenario | Condiciones iniciales | Objetivos |
|---|---|---|
| **Finca equilibrada** | Suelos fértiles, cafetales Castillo establecidos, agua moderada, presupuesto suficiente | Productividad ≥ 55, sostenibilidad ≥ 65, patrimonio ≥ inicial |
| **Suelo degradado** | Fertilidad baja, erosión alta, cafetales viejos de Caturra, lotes abandonados, área deforestada, presupuesto limitado | Fertilidad ≥ 55, erosión ≤ 35, rentabilidad ≥ 50 |
| **Crisis hídrica** | Lluvias −32 %, +1,1 °C, reservorio pequeño, quebrada con poco caudal, más sequías | Salud del café ≥ 60, calidad del agua ≥ 60, reservorio vacío ≤ 2 meses |

## Pruebas

122 pruebas automatizadas (Vitest + React Testing Library) cubren fórmulas, acciones, turnos, clima, eventos, puntuación, victoria/fracaso, ciclos completos, comparación de estrategias, guardado/recuperación y la interfaz. Ver [docs/TESTING.md](docs/TESTING.md).

## Documentación

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — capas, flujo de datos y decisiones técnicas
- [docs/SIMULATION-MODEL.md](docs/SIMULATION-MODEL.md) — motor, orden del turno, fórmulas y supuestos
- [docs/ENVIRONMENTAL-MODEL.md](docs/ENVIRONMENTAL-MODEL.md) — variables ambientales e interconexiones
- [docs/USER-GUIDE.md](docs/USER-GUIDE.md) — guía del jugador
- [docs/TESTING.md](docs/TESTING.md) — estrategia y cobertura de pruebas
