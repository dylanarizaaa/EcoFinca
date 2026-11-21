/**
 * Genera documentos/Informe-Final-EcoFinca.docx a partir de contenido.cjs.
 * Uso:  NODE_PATH="$(npm root -g)" node documentos/fuente/generar-word.cjs
 * Requiere el paquete npm `docx` (instalado globalmente o en el proyecto).
 */

const fs = require('node:fs')
const path = require('node:path')
const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} = require('docx')
const { meta, sections } = require('./contenido.cjs')

const DOCS_DIR = path.resolve(__dirname, '..')
const OUT = path.join(DOCS_DIR, 'Informe-Final-EcoFinca.docx')

const COLOR = {
  forest: '234D35',
  forest2: '2F553A',
  green: '3C6845',
  text: '1C2A21',
  muted: '5C685F',
  border: 'D3D9C8',
  zebra: 'F1F6F1',
  noteInfo: 'EEF6FA',
  noteInfoBorder: '4C91B5',
  notePend: 'FDF3DC',
  notePendBorder: 'D99A24',
  code: 'F3F4EF',
}
const FONT = 'Arial'
const MONO = 'Consolas'
const CONTENT_WIDTH = 9360 // 6,5 in en DXA (carta con márgenes de 1 in)

/** Convierte **negrita** y _cursiva_ en TextRun. */
function runs(text, base = {}) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean)
  return parts.map((part) => {
    if (part.startsWith('**') && part.endsWith('**')) return new TextRun({ ...base, text: part.slice(2, -2), bold: true })
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) return new TextRun({ ...base, text: part.slice(1, -1), italics: true })
    return new TextRun({ ...base, text: part })
  })
}

function para(text, opts = {}) {
  return new Paragraph({ children: runs(text), spacing: { after: 120, line: 300 }, alignment: AlignmentType.JUSTIFIED, ...opts })
}

let listInstance = 0

function list(items, ordered) {
  listInstance += 1
  const instance = listInstance
  return items.map(
    (item) =>
      new Paragraph({
        children: runs(item),
        numbering: { reference: ordered ? 'numeros' : 'vinetas', level: 0, instance },
        spacing: { after: 80, line: 290 },
      }),
  )
}

function cell(text, { header = false, width, zebra = false, center = false } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: header
      ? { type: ShadingType.CLEAR, color: 'auto', fill: COLOR.forest }
      : zebra
        ? { type: ShadingType.CLEAR, color: 'auto', fill: COLOR.zebra }
        : undefined,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: runs(text, { size: 18, color: header ? 'FFFFFF' : COLOR.text, bold: header || undefined, font: FONT }),
      }),
    ],
  })
}

function table(block) {
  const total = block.widths.reduce((a, b) => a + b, 0)
  const widths = block.widths.map((w) => Math.floor((w / total) * CONTENT_WIDTH))
  widths[widths.length - 1] += CONTENT_WIDTH - widths.reduce((a, b) => a + b, 0)
  const narrow = (i) => block.widths[i] <= 8
  const border = { style: BorderStyle.SINGLE, size: 4, color: COLOR.border }
  return [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: widths,
      borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
      rows: [
        new TableRow({
          tableHeader: true,
          children: block.head.map((h, i) => cell(h, { header: true, width: widths[i], center: narrow(i) })),
        }),
        ...block.rows.map(
          (row, r) =>
            new TableRow({
              cantSplit: true,
              children: row.map((c, i) => cell(c, { width: widths[i], zebra: r % 2 === 1, center: narrow(i) })),
            }),
        ),
      ],
    }),
    new Paragraph({ children: [], spacing: { after: 120 } }),
  ]
}

function note(block) {
  const pend = block.kind === 'pendiente'
  return new Paragraph({
    children: [
      new TextRun({ text: pend ? 'PENDIENTE · ' : 'NOTA · ', bold: true, color: pend ? '8A5A00' : '2D5F7A', size: 19 }),
      ...runs(block.text.replace(/^Pendiente:\s*/, ''), { size: 19 }),
    ],
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: pend ? COLOR.notePend : COLOR.noteInfo },
    border: { left: { style: BorderStyle.SINGLE, size: 24, color: pend ? COLOR.notePendBorder : COLOR.noteInfoBorder, space: 8 } },
    indent: { left: 160, right: 120 },
    spacing: { before: 80, after: 160, line: 280 },
  })
}

function formula(block) {
  return block.lines.map(
    (line, i) =>
      new Paragraph({
        children: [new TextRun({ text: line, font: MONO, size: 17, color: COLOR.text })],
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLOR.code },
        indent: { left: 120, right: 120 },
        spacing: { before: i === 0 ? 80 : 0, after: i === block.lines.length - 1 ? 160 : 0, line: 260 },
        keepNext: i < block.lines.length - 1,
      }),
  )
}

function jpegSize(buffer) {
  let i = 2
  while (i < buffer.length) {
    if (buffer[i] !== 0xff) {
      i++
      continue
    }
    const marker = buffer[i + 1]
    const length = buffer.readUInt16BE(i + 2)
    if (marker >= 0xc0 && marker <= 0xc3) return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) }
    i += 2 + length
  }
  throw new Error('No se pudo leer el tamaño de la imagen')
}

function image(block) {
  const file = path.join(DOCS_DIR, block.src)
  const data = fs.readFileSync(file)
  const size = jpegSize(data)
  const widthIn = block.width ?? 6.3
  const widthPx = Math.round(widthIn * 96)
  const heightPx = Math.round((widthPx * size.height) / size.width)
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 120, after: 60 },
      children: [new ImageRun({ type: 'jpg', data, transformation: { width: widthPx, height: heightPx }, altText: { title: block.caption, description: block.caption, name: path.basename(file) } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: runs(block.caption, { italics: true, size: 17, color: COLOR.muted }),
    }),
  ]
}

function refs(block) {
  return block.items.map(
    (item) =>
      new Paragraph({
        children: runs(item, { size: 20 }),
        indent: { left: 720, hanging: 720 },
        spacing: { after: 140, line: 280 },
        alignment: AlignmentType.LEFT,
      }),
  )
}

function renderBlocks(blocks) {
  const out = []
  for (const b of blocks) {
    switch (b.t) {
      case 'p':
        out.push(para(b.text))
        break
      case 'h2':
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(b.text)] }))
        break
      case 'h3':
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(b.text)] }))
        break
      case 'ul':
        out.push(...list(b.items, false))
        out.push(new Paragraph({ children: [], spacing: { after: 60 } }))
        break
      case 'ol':
        out.push(...list(b.items, true))
        out.push(new Paragraph({ children: [], spacing: { after: 60 } }))
        break
      case 'table':
        out.push(...table(b))
        break
      case 'note':
        out.push(note(b))
        break
      case 'formula':
        out.push(...formula(b))
        break
      case 'img':
        out.push(...image(b))
        break
      case 'refs':
        out.push(...refs(b))
        break
      default:
        throw new Error(`Bloque desconocido: ${b.t}`)
    }
  }
  return out
}

function coverPage() {
  const center = (text, opts = {}, runOpts = {}) =>
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, ...opts, children: runs(text, runOpts) })
  return [
    center(meta.universidad, { spacing: { before: 600, after: 60 } }, { bold: true, size: 24, color: COLOR.forest }),
    center(meta.facultad, {}, { size: 21, color: COLOR.muted }),
    center(meta.curso, {}, { size: 21, color: COLOR.muted }),
    center(`${meta.actividad} · ${meta.periodo}`, { spacing: { after: 1400 } }, { size: 21, color: COLOR.muted }),
    center(meta.titulo, { spacing: { after: 160 } }, { bold: true, size: 72, color: COLOR.forest }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: 'A8C58B', space: 10 } },
      indent: { left: 2400, right: 2400 },
      spacing: { after: 280 },
      children: [],
    }),
    center(meta.subtitulo, { indent: { left: 720, right: 720 }, spacing: { after: 1600 } }, { size: 26, color: COLOR.text }),
    center('Presentado por', {}, { size: 20, color: COLOR.muted }),
    center(meta.estudiante, {}, { bold: true, size: 24 }),
    center(`ID: ${meta.idEstudiante}`, { spacing: { after: 360 } }, { size: 21 }),
    center('Docente', {}, { size: 20, color: COLOR.muted }),
    center(meta.docente, { spacing: { after: 900 } }, { bold: true, size: 24 }),
    center(`${meta.ciudad} · ${meta.fecha}`, {}, { size: 21, color: COLOR.muted }),
  ]
}

const headingStyle = (size, color, before, after) => ({
  run: { font: FONT, size, bold: true, color },
  paragraph: { spacing: { before, after }, keepNext: true, keepLines: true },
})

const doc = new Document({
  creator: meta.estudiante,
  title: `${meta.titulo} — Informe final`,
  description: meta.subtitulo,
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 22, color: COLOR.text } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...headingStyle(32, COLOR.forest, 0, 200) },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...headingStyle(26, COLOR.forest2, 280, 120) },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, ...headingStyle(23, COLOR.green, 200, 100) },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'vinetas',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }],
      },
      {
        reference: 'numeros',
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 340 } } } }],
      },
    ],
  },
  sections: [
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      children: coverPage(),
    },
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, bottom: 1300, left: 1440, right: 1440 },
          pageNumbers: { start: 1 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.border, space: 4 } },
              children: [new TextRun({ text: `EcoFinca · Informe final · ${meta.curso}`, size: 16, color: COLOR.muted })],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Página ', size: 17, color: COLOR.muted }), new TextRun({ children: [PageNumber.CURRENT], size: 17, color: COLOR.muted })],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: 'Contenido', bold: true, size: 32, color: COLOR.forest })],
        }),
        new TableOfContents('Contenido', { hyperlink: true, headingStyleRange: '1-2' }),
        ...sections.flatMap((s) => [
          new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun(s.title)] }),
          ...renderBlocks(s.blocks),
        ]),
      ],
    },
  ],
})

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(OUT, buffer)
  console.log(`Generado: ${OUT} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`)
})
