"""
Rellena la tabla de contenido del informe con entradas precalculadas.

docx-js inserta el campo TOC vacío; Word lo actualiza al abrir el archivo, pero
otros visores (LibreOffice, Google Drive, vista previa) lo muestran vacío. Este
script renderiza el documento con LibreOffice, mide en qué página queda cada
título y escribe esas entradas dentro del campo. Word sigue pudiendo
actualizarlo (clic derecho → Actualizar campo).

Uso:  python3 documentos/fuente/completar-indice.py documentos/Informe-Final-EcoFinca.docx
Requiere: node, soffice (LibreOffice) y pdftotext (Poppler).
"""

import json
import re
import subprocess
import sys
import tempfile
import zipfile
from html import escape
from pathlib import Path

HERE = Path(__file__).resolve().parent
DOCX = Path(sys.argv[1]).resolve()

JS = """
const { sections } = require(process.argv[1]);
const out = [];
for (const s of sections) {
  out.push({ level: 1, text: s.title });
  for (const b of s.blocks) if (b.t === 'h2') out.push({ level: 2, text: b.text });
}
console.log(JSON.stringify(out));
"""

headings = json.loads(subprocess.check_output(["node", "-e", JS, str(HERE / "contenido.cjs")], text=True))

START = re.compile(r'(TOC \\h \\o &quot;1-2&quot;</w:instrText><w:fldChar w:fldCharType="separate"/></w:r></w:p>)(.*?)(<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>)', re.S)


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def render_pages(docx: Path) -> list[list[str]]:
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", tmp, str(docx)], check=True, capture_output=True, timeout=300)
        pdf = Path(tmp) / (docx.stem + ".pdf")
        text = subprocess.check_output(["pdftotext", str(pdf), "-"], text=True)
    return [[line.strip() for line in page.splitlines() if line.strip()] for page in text.split("\f")]


def is_toc_line(line: str) -> bool:
    return "..." in line or ". . ." in line or "…" in line


def locate(pages: list[list[str]]) -> list[int]:
    numbers = []
    page_idx = 2  # 0 = portada, 1 = primera página del índice
    for h in headings:
        prefix = norm(h["text"])[:28]
        found = None
        for p in range(page_idx, len(pages)):
            lines = pages[p]
            candidates = lines[:4] if h["level"] == 1 else lines
            if any(norm(line).startswith(prefix) and not is_toc_line(line) for line in candidates):
                found = p
                break
        if found is None:
            raise SystemExit(f"No se encontró el título en el PDF: {h['text']}")
        numbers.append(found)  # el pie de página numera desde 1 en la segunda hoja
        page_idx = found
    return numbers


def entries_xml(numbers: list[int]) -> str:
    parts = []
    for h, n in zip(headings, numbers):
        level1 = h["level"] == 1
        rpr = f"<w:rPr>{'<w:b/><w:bCs/>' if level1 else ''}<w:sz w:val=\"21\"/><w:szCs w:val=\"21\"/></w:rPr>"
        parts.append(
            "<w:p><w:pPr>"
            '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9350"/></w:tabs>'
            f'<w:spacing w:before="{100 if level1 else 0}" w:after="40"/>'
            f'<w:ind w:left="{0 if level1 else 360}"/>'
            "</w:pPr>"
            f'<w:r>{rpr}<w:t xml:space="preserve">{escape(h["text"], quote=False)}</w:t></w:r>'
            f"<w:r>{rpr}<w:tab/></w:r>"
            f'<w:r>{rpr}<w:t>{n}</w:t></w:r>'
            "</w:p>"
        )
    return "".join(parts)


def inject(docx: Path, numbers: list[int]) -> None:
    with zipfile.ZipFile(docx) as z:
        items = [(info, z.read(info.filename)) for info in z.infolist() if not info.filename.endswith("/")]
    out = []
    for info, data in items:
        if info.filename == "word/document.xml":
            xml = data.decode("utf-8")
            xml, count = START.subn(lambda m: m.group(1) + entries_xml(numbers) + m.group(3), xml, count=1)
            if count != 1:
                raise SystemExit("No se encontró el campo de índice en el documento.")
            data = xml.encode("utf-8")
        out.append((info.filename, data))
    with zipfile.ZipFile(docx, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in out:
            z.writestr(name, data)


previous = None
for attempt in range(4):
    numbers = locate(render_pages(DOCX))
    if numbers == previous:
        break
    inject(DOCX, numbers)
    previous = numbers
print(f"Índice completado con {len(headings)} entradas: " + ", ".join(f"{h['text'][:18]}→{n}" for h, n in zip(headings, numbers) if h["level"] == 1))
