# Guía del jugador

## 1. Empezar

1. En la pantalla de inicio pulsa **Nueva partida** (o **Continuar partida** para retomar la última; está deshabilitado si no hay partidas guardadas).
2. Escribe el nombre de la finca y del administrador.
3. Elige el **escenario**: *Finca equilibrada* (aprender), *Suelo degradado* (recuperar) o *Crisis hídrica* (ahorrar agua).
4. Elige **dificultad**, **presupuesto** (el botón *Recomendado* lo ajusta al escenario), **duración** (1–5 años), **número de parcelas** y **semilla** (la misma semilla repite el mismo clima y eventos).
5. Pulsa **Iniciar finca**. Un tutorial de 7 pasos te guiará.

## 2. La pantalla de juego

- **Barra superior:** finca, mes y año, ciclo productivo, dinero, agua del reservorio, clima del mes y jornales. A la derecha: **Guardar**, **Pausa** (menú con guardar, tutorial, enciclopedia, finalizar partida y salir), **Avance automático** (los meses pasan solos; se detiene ante decisiones) y **Avanzar mes**.
- **Navegación:** Finca, Cultivos, Recursos, Ecosistema, Clima, Mercado, Eventos (con contador de decisiones pendientes), Informes y Enciclopedia.

## 3. El mapa

Selecciona una **capa**: General (etapas del café y prácticas), Fertilidad, Humedad, Erosión, Cultivos (salud) o Biodiversidad. En las capas de datos cada lote muestra su valor (0–100) junto a su código. Iconos sobre los lotes: 🧺 listo para cosechar, 🐛 plagas altas, 💧 suelo seco, 🌱 listo para sembrar, 🌲 reforestación. La quebrada cambia de color con la calidad del agua y la ronda verde crece al conservarla; el reservorio muestra su nivel real.

Haz clic (o Enter con el teclado) en un lote para ver su panel: variedad, etapa, salud, producción estimada y acumulada, suelo, plagas, prácticas y **acciones**.

## 4. Acciones de lote

Cada acción muestra su costo (💰 dinero, 👥 jornales e insumos). Si no se puede hacer, el botón está deshabilitado y su *tooltip* explica por qué. El botón ⓘ abre el detalle: condiciones, efecto inmediato, efecto ambiental y consecuencias a largo plazo.

| Acción | Para qué |
|---|---|
| Cosechar | Llevar el café maduro al almacén (hazlo en el primer mes de la ventana) |
| Preparar terreno / Renovar | Dejar el lote listo para sembrar (elimina plantas existentes) |
| Sembrar | Elegir variedad; la primera cosecha tarda ~21 meses |
| Fertilizar | Orgánico (gradual, sin contaminación) o químico (rápido; el exceso contamina), en dosis baja, recomendada o alta |
| Regar | +12 mm efectivos al cerrar el mes; consume agua del reservorio |
| Control de plagas | MIP (sostenible) o químico (más fuerte, contamina) |
| Mantenimiento | +salud, −plagas; tras la cosecha recoge frutos caídos (re-re) |
| Cobertura, barreras, sombrío | Prácticas de conservación que se establecen en 3, 6 y 12 meses |
| Reforestar | Convierte el lote en bosque de forma permanente |

Cada labor puede hacerse una vez por mes en cada lote. Los jornales se renuevan al avanzar el mes.

## 5. Recursos, mercado y ecosistema

- **Recursos:** inventario con alertas críticas, reservorio y caudal, contratación de jornales e inversiones (riego por goteo, reservorio, beneficio ecológico, certificación).
- **Mercado:** vender café (control deslizante), comprar insumos, gráficas de precio y flujo de caja, balance por categoría e historial de movimientos.
- **Ecosistema:** indicadores frente al estado inicial, cómo se calcula la sostenibilidad, conservación de la ronda hídrica, restauración del área degradada y por qué cada práctica es beneficiosa.

## 6. Avanzar el tiempo

Al pulsar **Avanzar mes** se procesan clima, agua, suelo, cultivos, plagas, ambiente y economía. El **resumen del mes** muestra los cambios de cada indicador, el dinero, los mensajes importantes y, cada 12 meses, la evaluación del ciclo productivo.

## 7. Eventos

Algunos eventos requieren decisión (por ejemplo, responder a un brote de broca con MIP o con fumigación). Si avanzas sin decidir, se aplica la opción por defecto. En **Eventos** verás los activos, el historial y el catálogo con condiciones, probabilidades e impactos.

## 8. Puntuación, victoria y derrota

- Puntuación = Productividad × 0,30 + Rentabilidad × 0,30 + Sostenibilidad × 0,40.
- Con sostenibilidad < 60 la puntuación máxima es 64 («Aceptable»); con < 40, 49 («Deficiente»).
- **Derrota:** saldo negativo 3 meses seguidos, deuda > 40 % del presupuesto inicial o sostenibilidad < 20 durante 3 meses.
- **Victoria:** al terminar la duración, cumplir todos los objetivos del escenario sin clasificación «Deficiente».
- Puedes **finalizar la partida** en cualquier momento desde el menú de pausa o la página de evaluación.

## 9. Informes y comparación de estrategias

En **Informes** encontrarás: resumen con objetivos y recomendaciones; evolución de 7 indicadores; producción por ciclo, ingresos y gastos, rentabilidad acumulada y consumo de agua; comparación entre estado inicial, cierres de ciclo y estado actual; y la pestaña **Estrategias**, que simula producción convencional y sostenible con tus mismas condiciones iniciales y semilla, y las compara con tu partida. Todas las gráficas tienen vista de tabla (icono de tabla).

## 10. Guardado

La partida se guarda automáticamente en el navegador (IndexedDB) tras cada acción y cada mes. Puedes cerrar el navegador y continuar después. Desde el inicio puedes abrir o eliminar (con confirmación) cualquier partida. En **Configuración** puedes desactivar el guardado automático, ajustar el avance automático, reducir animaciones y calibrar los parámetros del modelo para nuevas partidas.

## Consejos

- La cobertura vegetal es la defensa más barata contra la erosión.
- No fertilices con químico por encima de 82 de fertilidad: es dinero que termina en la quebrada.
- Vende el café almacenado: pierde 1 % por mes.
- Mantén una reserva de dinero para los costos fijos y la recolección.
- En crisis hídrica, invierte pronto en riego por goteo y riega los lotes en floración y fructificación.
