# Documentos de entrega — Proyecto Final

| Archivo | Contenido |
|---|---|
| `Informe-Final-EcoFinca.docx` | Informe final en Word: investigación, diseño, desarrollo, pruebas, retroalimentación, resultados, conclusiones, referencias y anexos |
| `informe-web.html` | Versión web del mismo informe (se abre en el navegador junto a la carpeta `capturas/`) |
| `capturas/` | Capturas de pantalla del simulador usadas en el informe (semilla 42) |
| `fuente/contenido.cjs` | Texto del informe: fuente única para el Word y la versión web |
| `fuente/generar-word.cjs` | Genera el Word con la librería `docx` |
| `fuente/completar-indice.py` | Rellena la tabla de contenido del Word con los números de página |
| `fuente/generar-web.cjs` | Genera la versión web |

## Pendientes antes de entregar

1. Completar la portada: nombre, ID, docente y ciudad (campos entre corchetes en `fuente/contenido.cjs` o directamente en el Word).
2. Aplicar el cuestionario del Anexo A a usuarios reales y registrar los resultados en la sección 5.5.
3. Publicar el simulador o dar acceso al repositorio al docente, y escribir la URL en el capítulo 9.
4. Verificar las cifras de la FNC (sección 2.1) y el formato APA de las referencias.

Si editas el Word directamente, actualiza la tabla de contenido al final (clic derecho → *Actualizar campo* → *Actualizar toda la tabla*).

## Regenerar los archivos

Desde la raíz del repositorio (requiere `docx` de npm, LibreOffice y Poppler):

```bash
NODE_PATH="$(npm root -g)" node documentos/fuente/generar-word.cjs
python3 documentos/fuente/completar-indice.py documentos/Informe-Final-EcoFinca.docx
node documentos/fuente/generar-web.cjs
```
