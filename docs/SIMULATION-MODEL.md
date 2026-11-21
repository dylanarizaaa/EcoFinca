# Modelo de simulación — EcoFinca Engine

> **Advertencia.** EcoFinca implementa un **modelo educativo simplificado**. Sus ecuaciones capturan relaciones cualitativas bien conocidas (más erosión → menos fertilidad; exceso de fertilizante → contaminación; cobertura → menos erosión…), pero los **coeficientes numéricos son parámetros hipotéticos de calibración**, elegidos para producir dinámicas plausibles y didácticas en partidas de 1 a 5 años. No deben usarse para planificar una finca real.

## 1. Clasificación de datos

| Tipo | Ejemplos en EcoFinca | Tratamiento |
|---|---|---|
| **Conocimiento técnico documentado (cualitativo)** | Régimen de lluvias bimodal de la zona cafetera andina; resistencia a la roya de Castillo, Cenicafé 1 y Tabi y susceptibilidad de Caturra; primera cosecha ~18–24 meses tras la siembra; ~32 semanas entre floración y cosecha; el beneficio ecológico reduce drásticamente el agua y la contaminación del beneficio; la cobertura y las barreras vivas reducen la erosión | Fuentes orientativas: publicaciones divulgativas de Cenicafé y de la Federación Nacional de Cafeteros de Colombia; FAO, *Crop evapotranspiration* (Boletín FAO 56, Allen et al., 1998) para el concepto de ET y su reducción por estrés; ecuación universal de pérdida de suelo USLE (Wischmeier y Smith, 1978) como base conceptual de los factores de erosión. **Verificar valores en la fuente antes de usarlos fuera del juego.** |
| **Órdenes de magnitud de referencia** | Rendimiento base 1.300 kg cps/ha (≈ 21 sacos de 60 kg), densidad 5.000 plantas/ha, ~40 L de agua por kg cps en beneficio tradicional vs ~1,5 L en ecológico | Valores redondeados del orden de magnitud reportado; configurables |
| **Parámetros hipotéticos de calibración** | Todos los coeficientes de `src/engine/config/model.ts` (erosividad, tasas de recuperación, penalizaciones, probabilidades de eventos, etc.) | Elegidos por calibración del juego; documentados aquí |
| **Valores ficticios del juego** | Precio del café (19.000 COP/kg), precios de insumos, costos fijos, jornal (75.000 COP) | **No son cotizaciones reales.** Configurables en *Configuración → Parámetros del modelo* |

## 2. Escalas

- Indicadores ambientales y de cultivo: **0–100** (`clamp` en cada paso; nunca negativos).
- Factores productivos: **0–1** (normalizados).
- Dinero en COP; agua en m³; insumos en bultos (50 kg), dosis/ha o colinos.
- Tiempo: turnos **mensuales**; un **ciclo productivo** = 12 meses.

## 3. Orden de ejecución del turno (`advanceTurn`)

| # | Paso | Archivo |
|---|---|---|
| 0 | Resolver decisiones pendientes con su respuesta por defecto | `events/engine.ts` |
| 1 | Agregar modificadores de eventos activos | `events/engine.ts` |
| 2 | Recursos hídricos: caudal de la quebrada, entrada y consumo del reservorio | `simulation/steps.ts` |
| 3 | Suelo por parcela: humedad, erosión, fertilidad, contaminación del suelo, carga química | `simulation/steps.ts` |
| 4 | Cultivos: salud, etapa fenológica, acumulación de factores, pérdida de cosechas, muerte de colinos | `simulation/steps.ts` |
| 5 | Plagas: favorabilidad, crecimiento, propagación desde vecinos, brotes, protección | `simulation/steps.ts` |
| 6 | Ambiente: contaminación de la finca, sedimentos, calidad del agua, ronda, restauración, biodiversidad | `simulation/steps.ts` |
| 7 | Economía: costos fijos, mantenimiento, merma del café almacenado, compost, certificación, mercado, saldo negativo | `simulation/steps.ts` |
| 8 | Registro mensual (`MonthlyRecord`) y cierre de ciclo cada 12 meses | `simulation/turn.ts` |
| 9 | Avance del calendario | `simulation/turn.ts` |
| 10 | Eventos: reducir duración, generar nuevos (máx. 2 por turno) | `events/engine.ts` |
| 11 | Clima del nuevo mes (con modificadores) | `simulation/climate.ts` |
| 12 | Reinicio mensual: jornales, acciones por lote, riego programado, acumuladores | `simulation/turn.ts` |
| 13 | Condiciones de fracaso y fin de partida | `rules/objectives.ts` |

El clima de un mes se genera **al entrar** en ese mes: el jugador lo ve y puede reaccionar (por ejemplo, regar antes de un mes seco) antes de que se procese.

## 4. Aleatoriedad reproducible

`rngFor(semilla, turno, canal)` crea un generador Mulberry32 con semilla `FNV-1a("semilla|turno|canal")`. Canales: `climate`, `events`, `event-target:<id>`, `pests`, `market`. Cada evento del catálogo consume siempre un número aleatorio, se cumpla o no su condición, de modo que los flujos no se desalinean entre estrategias distintas.

## 5. Ecuaciones

### 5.1 Humedad del suelo

```
P   = precipitación_mm × 0,35
Esc = P × coefEscorrentía(pendiente, intensidad, erosión, cobertura, barreras, sombrío)   ∈ [0,05; 0,75]
ET  = ETpot_mm × 0,32 × (0,2 + 0,8 × mín(1, H/55))
ETpot = (96 + 6 × (T − 20)) × factorCondición × (1 − 0,1·cobertura − 0,2·sombrío + 0,12·sueloDesnudo)
H'  = H + P − Esc + Riego − ET
Si H' > 70: Drenaje = (H' − 70) × 0,7
H(t+1) = clamp(H' − Drenaje)
```

La reducción de la ET con suelo seco representa el cierre estomático (concepto del Boletín FAO 56). Un riego aplica 12 mm efectivos; el volumen bruto es `12 mm × 10 m³/mm·ha × área / eficiencia` con eficiencia 0,55 (gravedad) o 0,9 (goteo).

### 5.2 Erosión

```
Erosividad = 0,8 × (P_mm/100)^1,3 × (1 + intensidad/100)
Protección = 1 − (1 − 0,75·cobertura)(1 − 0,6·barreras)(1 − 0,3·sombrío)(1 − 0,85·madurezReforestación)
Ganancia   = Erosividad × (0,5 + pendiente) × (1 − Protección) × factorSueloDesnudo × modEvento
E(t+1)     = clamp(E + Ganancia − (0,15 + 1,4 × Protección))
```

Factor de suelo desnudo: preparación ×1,6, establecimiento ×1,3, barbecho ×1,15.

### 5.3 Fertilidad

```
Recuperación = 0,22 × poolOrgánico + 0,35·cobertura + 0,3·sombrío + (0,6 barbecho | 0,5 reforestación) + 0,006 × máx(0, B − 50)
Degradación  = extracción(etapa) + 0,012·E + 0,3·GananciaErosión + 0,03·Drenaje·(cargaQuímica/50) + 0,012·cargaQuímica + 0,01·contaminaciónSuelo
F(t+1) = clamp(F + Recuperación − Degradación)
```

Extracción mensual (puntos): establecimiento 0,5 · vegetativo 0,8 · floración 1,3 · fructificación 1,7 · maduración 1,5 · cosecha 0,8.

Fertilización (dosis recomendada = 1; baja = 0,5; alta = 1,75):
- **Química:** +12 puntos inmediatos hasta el umbral 82; el exceso solo aporta 25 % y se convierte en carga química (×1,5). Carga +16 por dosis; decae 35 %/mes y se lava por escorrentía.
- **Orgánica:** +2 inmediato y +16 al *pool* orgánico, que se mineraliza 22 % por mes.

### 5.4 Salud del cultivo

```
Daño = 20·(1 − fH)·(1 − toleranciaSequía) + 4·máx(0, T − 24)·(1 − 0,5·sombrío) + 10·(1 − fF) + 5·[H > 92]
       + 0,03·broca + 0,2·roya + 0,12·manchaHierro
Recuperación = (100 − S) × 0,25 × máx(0,2; 1 − Daño/30)
S(t+1) = clamp(S + Recuperación − Daño)
```

Colinos en establecimiento con salud < 18 mueren (el lote pasa a barbecho).

### 5.5 Producción

```
Producción = Área × RendimientoBase × fFertilidad × fHídrico × fSalud × fClimático
```

- `fFertilidad`: rampa lineal de 0,2 (F = 0) a 1 (F ≥ 70).
- `fHídrico`: trapecio, 1 entre 40 y 82; 0,2 con H = 0; 0,75 con H = 100.
- `fSalud = S/100`.
- `fClimático`: soleado 1 · nublado 0,97 · lluvia moderada 1 · lluvia intensa 0,88 · sequía 0,78 · calor 0,85.

El producto de factores se **promedia durante las etapas reproductivas** (floración → maduración), porque allí se define la cosecha. A la estimación se aplican: primera cosecha ×0,55, plantas > 96 meses ×0,8, variedad, sombrío (−10 % con sombrío pleno), broca (−0,6 % por punto) y cosecha tardía (−30 % en el segundo mes de la ventana). Sin cosechar al terminar la ventana, la cosecha se pierde y la broca aumenta.

### 5.6 Etapas fenológicas (configurables)

| Etapa | Meses por defecto |
|---|---|
| Preparación | 1 |
| Establecimiento | 3 |
| Crecimiento vegetativo | 10 (planta joven) / 4 (post-cosecha) |
| Floración | 1 |
| Fructificación | 4 |
| Maduración | 2 |
| Cosecha (ventana) | 2 |

Con estos valores la primera cosecha llega ~21 meses tras preparar el terreno y pasan ~7 meses entre floración y cosecha, coherente con los rangos divulgados (18–24 meses; ~32 semanas). El crecimiento se detiene en meses con estrés hídrico severo.

### 5.7 Plagas y enfermedades

```
crecimiento = I × r × favorabilidad × (1 − protección) × (1 − 0,005·B)
mortalidad  = 0,12 × I
propagación = 0,08 × media(vecinos) × mín(1, favorabilidad) × (1 − protección)
brote       = [rng < 0,035 × favorabilidad × presión × (1 − protección)] × U(8, 18)
I(t+1)      = clamp(I + crecimiento − mortalidad + propagación + brote)
```

| Organismo | r | Favorecido por |
|---|---|---|
| Broca | 0,45 | Frutos presentes, temperatura > 20 °C, sequía o calor |
| Roya | 0,5 | Humedad > 70 %, lluvia, 17–27 °C, variedad susceptible |
| Mancha de hierro | 0,35 | Baja fertilidad, plena exposición, estrés hídrico |

Tratamientos: químico −75 % y protección 0,65 por 2 meses (contamina suelo y agua, −biodiversidad); MIP −50 % y protección 0,55 por 3 meses (+biodiversidad); mantenimiento −15 % (−40 % de broca después de la cosecha, por recolección de frutos caídos).

### 5.8 Contaminación y calidad del agua

```
Aportes   = Σ cargaQuímica·0,18·(0,3 + fracciónEscorrentía)·(área/áreaTotal)    (escorrentía de fertilizante)
          + cargaPlaguicidas + 0,4·GananciaErosión·(1 − 0,4·barreras)          (sedimentos)
          + 0,006·kgBeneficiados·(1 − 0,85·beneficioEcológico) + 0,6 doméstico (0,15 con tratamiento)
Mitigación = (C + Aportes) × (0,10 + 0,15·ronda + 0,05·fracciónBosque)
C(t+1)    = clamp(C + Aportes − Mitigación)
CA(t+1)   = CA + 0,3 × (100 − 0,85·C − 0,4·Sedimentos + 10·ronda − 5 − CA)
```

### 5.9 Recursos hídricos

```
Caudal(t+1) = Caudal + 0,35 × ((30 + 45·mín(1,6; P/Pnormal) + 15·bosque + 15·ronda) × modEvento − Caudal)
Entrada     = concesión × Caudal/100 + P_mm × áreaCaptación/1000
Reservorio  = clamp(agua + Entrada − 25 m³ doméstico, 0, capacidad)
```

### 5.10 Economía

`Ganancia = Ingresos − Costos`. Costos: insumos, labores, jornales, recolección (4.500 COP/kg cps), costos fijos mensuales (2.000.000 COP × multiplicador de escenario × dificultad × inflación), mantenimiento de infraestructura, inversiones, eventos y multas. Si no hay efectivo para pagar la recolección, se vende por adelantado la parte de la cosecha necesaria.

Precio del café: `precioRef × índice × modEvento × (1,12 si certificado)`, con índice `I(t+1) = clamp(I + 0,25(1 − I) + N(0, σ), 0,7, 1,35)`; σ según dificultad. Insumos con inflación de 0,3 %/mes.

## 6. Puntuación

```
Productividad = 100 × [capacidad × (1 − w) + realizada × w],  w = 0,4 × mín(1, mes/12)
   capacidad = Σ área·etapa·fF·fH·fS / áreaAgrícola;  realizada = kg últimos 12 meses / (área × rendimiento)
Rentabilidad  = clamp(50 + 50 × rentabilidadAnual),  sobre el patrimonio (dinero + café + insumos + 60 % inversiones)
Sostenibilidad = 0,18·F + 0,18·(100−E) + 0,18·CA + 0,18·B + 0,14·(100−C) + 0,14·SeguridadHídrica
Global = 0,30·P + 0,30·R + 0,40·S
   si S < 40 → Global ≤ 49 ;  si S < 60 → Global ≤ 64
Clasificación: Excelente (≥ 80 y S ≥ 70) · Buena (≥ 65) · Aceptable (≥ 50) · Deficiente
```

Evaluación por ciclo: productividad con producción realizada del ciclo y rentabilidad por margen `(ingresos − costos)/costos`.

**Fracaso:** saldo negativo 3 meses seguidos, deuda mayor al 40 % del presupuesto inicial, o sostenibilidad < 20 durante 3 meses. **Victoria:** al completar la duración, todos los objetivos del escenario cumplidos y clasificación distinta de «Deficiente».

## 7. Calibración y resultados de referencia

Con la semilla 42, 3 años, dificultad normal y 6 parcelas, las estrategias automáticas obtienen (resultados del motor en la versión actual):

| Escenario | Convencional | Sostenible |
|---|---|---|
| Finca equilibrada | Aceptable — 64,0 (tope por sostenibilidad 54); 13.254 kg; erosión final 71 | Excelente — 92,2; 10.847 kg; erosión final 0 |
| Suelo degradado | Deficiente — 49,0 (sostenibilidad 34,7); erosión final 100 | Aceptable — 62,5 (sostenibilidad 80,5); erosión final 40 |
| Crisis hídrica | Deficiente — 49,9 (sostenibilidad 52,2) | Excelente — 92,2 |

La estrategia convencional suele producir más café, pero degrada el suelo (erosión 70–100), el agua y la biodiversidad: precisamente la lección del simulador. Para recalibrar, modifique `src/engine/config/model.ts` y ejecute `npm test` (las pruebas de integración verifican que la estrategia sostenible conserve mejor el ecosistema).
