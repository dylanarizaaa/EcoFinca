# Modelo ambiental

Este documento describe las variables ambientales de EcoFinca, cómo se conectan entre sí y qué prácticas las modifican. Las ecuaciones exactas están en [SIMULATION-MODEL.md](SIMULATION-MODEL.md); los coeficientes, en `src/engine/config/model.ts`.

> Los valores numéricos son **parámetros hipotéticos** de un modelo educativo. Las **direcciones** de las relaciones (qué aumenta o disminuye qué) reflejan conocimiento agronómico y ambiental ampliamente aceptado.

## Variables (escala 0–100)

| Variable | Ámbito | Descripción |
|---|---|---|
| Fertilidad del suelo | Parcela | Nutrientes disponibles. Óptimo productivo ≥ 70 |
| Humedad del suelo | Parcela | Agua en la zona de raíces. Óptimo 40–82 |
| Erosión | Parcela | Grado acumulado de pérdida de suelo |
| Contaminación del suelo | Parcela | Residuos de agroquímicos |
| Biodiversidad | Parcela y finca | Riqueza biológica; la de la finca pondera parcelas, bosque, área degradada/restaurada y ronda hídrica por área |
| Calidad del agua | Finca | Estado de la quebrada |
| Contaminación | Finca | Carga contaminante que llega al agua |
| Salud del cultivo | Parcela | Vigor del cafetal |
| Caudal | Finca | Índice de caudal de la quebrada (alimenta el reservorio) |

## Mapa de interconexiones

```
 Lluvia ─┬─► Humedad ◄── Riego (eficiencia del sistema)
         │      │  ▲
         │      │  └── Cobertura / sombrío (−evaporación)
         │      ▼
         ├─► Escorrentía ──► Erosión ──► −Fertilidad
         │        ▲            │   └──► Sedimentos ──► −Calidad del agua
         │        │            ▼
         │   Cobertura, barreras, sombrío, bosque (protección)
         │
 Fertilizante químico ─► +Fertilidad (inmediato)
         └─► Carga química ─┬─► Escorrentía ─► +Contaminación ─► −Calidad del agua
                            └─► Acidificación / lixiviación ─► −Fertilidad
 Abono orgánico ─► Pool orgánico ─► +Fertilidad gradual, +biota
 Plaguicida químico ─► −Plagas, +Contaminación, −Biodiversidad
 MIP ─► −Plagas, +Biodiversidad
 Biodiversidad ─► control natural de plagas, +fertilidad (biota del suelo)
 Beneficio tradicional (aguas mieles) ─► +Contaminación (≫ con beneficio ecológico)
 Ronda hídrica protegida ─► +Mitigación de contaminación, +Calidad del agua, +Caudal, +Biodiversidad
 Bosque / reforestación ─► +Caudal, +Biodiversidad, −Erosión
 Sequía / calor ─► −Humedad, −Salud, +Broca ;  Lluvia e humedad ─► +Roya
 Fertilidad, Humedad, Salud, Clima ─► Producción
```

## Relaciones solicitadas y su implementación

| Relación | Implementación |
|---|---|
| Mayor erosión disminuye la fertilidad | Degradación de fertilidad: `0,012 × E` (suelo superficial perdido) + `0,3 × ganancia de erosión` |
| La contaminación deteriora la calidad del agua | La calidad converge a `100 − 0,85 × C − 0,4 × sedimentos + 10 × ronda − 5` |
| La conservación forestal favorece la biodiversidad | El bosque aporta 75 (+15 con ronda); la reforestación eleva el objetivo de la parcela hasta +40 en 36 meses |
| La cobertura vegetal mejora la retención de humedad | Reduce la escorrentía (−0,15 × nivel) y la evaporación (−10 %) |
| El exceso de fertilizantes incrementa la contaminación | Sobre fertilidad 82 el químico se convierte en carga química, que llega al agua por escorrentía |
| La sequía afecta la salud del cultivo | Daño `20 × (1 − fHídrico)` y factor climático 0,78; la sequía también favorece la broca |

## Prácticas de conservación

| Práctica | Tiempo de establecimiento | Efectos principales |
|---|---|---|
| Abono orgánico | Inmediato (liberación ~22 %/mes) | +fertilidad sostenida, +biodiversidad, sin carga contaminante |
| Cobertura vegetal | 3 meses | −75 % erosión, −escorrentía, −evaporación, +fertilidad (0,35/mes), +biodiversidad, −contaminación del suelo |
| Barreras vivas | 6 meses | −60 % erosión, −escorrentía, retienen 40 % de los sedimentos, +biodiversidad |
| Sombrío (agroforestería) | 12 meses | −30 % erosión, −20 % ET, −50 % daño por calor, +biodiversidad (+35), +fertilidad (hojarasca), −10 % potencial productivo |
| Reforestación de parcela | 36 meses (madurez) | −85 % erosión, +biodiversidad, +caudal; el lote deja de producir |
| Restauración de área degradada | 36 meses | El área se convierte en bosque: +biodiversidad, +caudal |
| Conservación de la ronda hídrica | 12 meses | +15 % de mitigación de contaminación, +10 calidad del agua, +caudal, +biodiversidad |
| Riego por goteo | Inmediato | Eficiencia 0,9 vs 0,55: ~39 % menos agua por riego, menos jornales |
| Beneficio ecológico y tratamiento de residuos | Inmediato | Agua de beneficio de 40 a 1,5 L/kg, −85 % de contaminación por aguas mieles, la pulpa se composta (0,012 bultos/kg en 2 meses) |
| Manejo integrado de plagas | Inmediato (3 meses de protección) | −50 % incidencia, +biodiversidad, sin contaminación |

## Clima

Perfil mensual de referencia (hipotético, régimen bimodal andino; mm): Ene 110 · Feb 125 · Mar 190 · Abr 260 · May 250 · Jun 150 · Jul 105 · Ago 115 · Sep 175 · Oct 280 · Nov 260 · Dic 160 (≈ 2.180 mm/año), con temperaturas medias de 20,6–21,8 °C.

| Escenario | Lluvia | Temperatura | Intensidad | Sequías | Lluvias intensas |
|---|---|---|---|---|---|
| Equilibrada | ×1 | +0 °C | +0 | ×1 | ×1 |
| Suelo degradado | ×1,05 | +0,3 °C | +10 | ×1 | ×1,3 |
| Crisis hídrica | ×0,68 | +1,1 °C | −5 | ×2 | ×0,5 |

Cada mes: anomalía lognormal de la lluvia (σ = 0,16/0,25/0,33 según dificultad), temperatura con ruido gaussiano y efecto de la anomalía de lluvia, humedad ambiental, intensidad y riesgo de sequía derivados. Condición: **sequía** (P < 70 mm y < 60 % de lo normal), **temperatura elevada** (≥ normal + 1,8 °C), **lluvia intensa** (≥ 230 mm o intensidad ≥ 78), **lluvia moderada** (≥ 150 mm), **nublado** o **soleado** según la humedad.

## Eventos ambientales

| Evento | Condición | Probabilidad base mensual | Impacto | Duración |
|---|---|---|---|---|
| Sequía prolongada | Meses secos o crisis hídrica | 6 % (×2 en crisis) | Lluvia ×0,4, +1,5 °C, caudal ×0,7 | 3 meses |
| Lluvias intensas | Temporadas de lluvia | 7 % (×1,3 degradado) | Lluvia ×1,7, intensidad +25, erosión ×1,2 | 2 meses |
| Ola de calor | Meses secos | 4 % | +2,5 °C | 2 meses |
| Brote de broca | Hay frutos | 5 % (×1,5 con calor; −biocontrol) | +25 broca en el lote, +8 en vecinos | 1 mes |
| Epidemia de roya | Humedad > 80 % o Caturra | 3 % (+6 % susceptibles) | +20 × susceptibilidad | 2 meses |
| Disminución del caudal | Caudal < 55 o meses secos | 5 % | Caudal ×0,55 | 3 meses |
| Recuperación de biodiversidad | B ≥ 55 y CA ≥ 60 | 8 % | Presión de plagas ×0,7 | 3 meses |
| Inspección ambiental | C ≥ 45 o CA < 45 | 12 % | Multa de $3.000.000 si no hay plan | 1 mes |

Las probabilidades se multiplican por 0,7 / 1 / 1,35 según la dificultad. El catálogo completo, con eventos de mercado y sociales, está en `src/engine/events/catalog.ts`.
