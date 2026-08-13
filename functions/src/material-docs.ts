import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import {
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Material, MaterialContent, MaterialTableRow } from "@pclab/shared";

const INSTITUTION = "Colegio La Providencia · Ovalle";
const SUBJECT = "Educación Ciudadana";
const PROFESOR = "Marcos Argandoña";

const MEMBRETE_PATH = path.join(__dirname, "..", "assets", "Imagen1.png");
const MEMBRETE = fs.existsSync(MEMBRETE_PATH) ? fs.readFileSync(MEMBRETE_PATH) : null;

const TYPE_LABELS: Record<string, string> = {
  GUIDE: "Guía de Aprendizaje",
  guia: "Guía de Aprendizaje",
  WORKSHEET: "Guía de Trabajo",
  READING: "Lectura",
  lectura: "Lectura",
  WRITTEN_TEST: "Evaluación Escrita",
  ASSESSMENT: "Evaluación",
  evaluacion: "Evaluación",
  PRACTICAL_WORK: "Trabajo Práctico",
  PROJECT: "Proyecto",
  RUBRIC: "Rúbrica",
  rubrica: "Rúbrica",
  ANSWER_KEY: "Solucionario",
  solucionario: "Solucionario",
  SCORING_GUIDE: "Pauta de Corrección",
  pauta: "Pauta de Corrección",
  DUA_VERSION: "Versión DUA",
  PIE_VERSION: "Versión PIE",
  EXIT_TICKET: "Ticket de Salida",
  SUPPORT_MATERIAL: "Material Complementario",
  complementario: "Material Complementario",
};

const INSTITUTIONAL_TONE = "#123a5f";
const LINE_COLOR = "#9fb3c8";

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

function pdfHeaderLines(material: Material): string[] {
  const c = material.content as MaterialContent | undefined;
  const lines = [INSTITUTION, SUBJECT, `Profesor: ${PROFESOR}`];
  const data = [];
  if (material.classId) data.push(`Clase: ${material.classId}`);
  if (material.unitId) data.push(`Unidad: ${material.unitId}`);
  if (material.classDate) data.push(`Fecha: ${material.classDate.slice(0, 10)}`);
  if (data.length) lines.push(data.join("   ·   "));
  lines.push("");
  lines.push(`${material.title}  —  ${TYPE_LABELS[material.type] ?? material.type}`);
  if (c?.curricular) {
    if (c.curricular.oa.length) lines.push(`OA: ${c.curricular.oa.join(", ")}`);
    if (c.curricular.objective) lines.push(`Objetivo: ${c.curricular.objective}`);
    if (c.curricular.indicators.length) lines.push(`Indicadores: ${c.curricular.indicators.join("; ")}`);
  }
  return lines;
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  choice: "Selección múltiple",
  truefalse: "Verdadero o Falso",
  short: "Desarrollo",
  case: "Análisis de caso",
  source: "Análisis de fuente",
  graph: "Interpretación de gráfico",
  match: "Emparejamiento",
  fill: "Completar",
};

function pdfBlocks(material: Material): { kind: string; text?: string; items?: string[]; table?: { headers: string[]; rows: MaterialTableRow[] }; lines?: number; points?: number }[] {
  const c = material.content as MaterialContent | undefined;
  const out: { kind: string; text?: string; items?: string[]; table?: { headers: string[]; rows: MaterialTableRow[] }; lines?: number; points?: number }[] = [];

  if (c?.contenido?.length) {
    out.push({ kind: "heading", text: "Contenido / Lectura" });
    for (const para of c.contenido) out.push({ kind: "text", text: para });
  }

  for (const s of c?.sections ?? []) {
    if (s.kind === "heading") out.push({ kind: "heading", text: s.text ?? "" });
    else if (s.kind === "list") out.push({ kind: "list", items: s.items ?? [] });
    else if (s.kind === "table") out.push({ kind: "table", table: s.table });
    else if (s.kind === "response") out.push({ kind: "response", lines: 6 });
    else out.push({ kind: "text", text: s.text ?? "" });
  }

  if (c?.items?.length) {
    out.push({ kind: "heading", text: "Ítems de la evaluación" });
    const total = c.items.reduce((s, i) => s + (i.points ?? 0), 0);
    out.push({ kind: "text", text: `Puntaje total: ${total} puntos · Duración sugerida: ${material.duration ?? 40} minutos.` });
    for (const it of c.items) {
      const label = ITEM_TYPE_LABELS[it.type] ?? it.type;
      out.push({ kind: "item", text: `(${it.points ?? 0} pts) ${label} — ${it.prompt}`, items: it.options, points: it.points ?? 0 });
    }
  }
  if (c?.rubric) {
    out.push({ kind: "heading", text: "Rúbrica" });
    out.push({ kind: "text", text: `Escala: ${c.rubric.scale.map((l) => `${l.score} = ${l.label}`).join(" · ")}` });
    const headers = ["Criterio", ...c.rubric.scale.map((l) => l.label)];
    const rows = c.rubric.criteria.map((cr) => ({
      cells: [cr.name, ...(cr.levels ?? []).map((lv) => lv.descriptor ?? "")],
    }));
    out.push({ kind: "table", table: { headers, rows } });
  }
  if (c?.specTable?.length) {
    out.push({ kind: "heading", text: "Tabla de especificaciones" });
    out.push({
      kind: "table",
      table: {
        headers: ["OA", "Indicador", "Habilidad", "Ítem", "Pts", "Nivel"],
        rows: c.specTable.map((r) => ({ cells: [r.oa, r.indicator, r.skill, r.itemId, String(r.points), r.level] })),
      },
    });
  }
  if (c?.answerKey?.length) {
    out.push({ kind: "heading", text: "Solucionario / Pauta" });
    out.push({
      kind: "table",
      table: {
        headers: ["Ítem", "Respuesta", "Pts", "Justificación"],
        rows: c.answerKey.map((a) => ({ cells: [a.itemId, a.correct, String(a.points), a.justification] })),
      },
    });
  }
  if (c?.pauta) out.push({ kind: "heading", text: "Pauta docente" });
  if (c?.pauta) out.push({ kind: "text", text: c.pauta });

  if (c?.referencias?.length) {
    out.push({ kind: "heading", text: "Referencias" });
    out.push({ kind: "list", items: c.referencias });
  }

  return out;
}

function splitLines(doc: PDFKit.PDFDocument, text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (doc.widthOfString(test) <= width) current = test;
    else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawTable(doc: PDFKit.PDFDocument, y: number, headers: string[], rows: MaterialTableRow[], opts: { width: number; left: number }, material: Material): number {
  const colW = opts.width / headers.length;
  const cellPad = 4;
  const lineH = 11;
  const drawRow = (cells: string[], header: boolean) => {
    const heights = cells.map((cell) => {
      const w = colW - cellPad * 2;
      return splitLines(doc, cell, w).length * lineH + cellPad * 2;
    });
    const rowH = Math.max(...heights, lineH + cellPad * 2);
    if (y + rowH > doc.page.height - 70) {
      doc.addPage();
      y = 60;
      addPdfHeader(doc, material, false);
    }
    let x = opts.left;
    for (let i = 0; i < cells.length; i++) {
      doc.rect(x, y, colW, rowH).fill(header ? "#eef3f8" : "#ffffff");
      doc.rect(x, y, colW, rowH).stroke(LINE_COLOR);
      const lines = splitLines(doc, cells[i] ?? "", colW - cellPad * 2);
      let ty = y + cellPad;
      for (const l of lines) {
        doc.fontSize(8.5).fillColor(header ? INSTITUTIONAL_TONE : "#111111").text(l, x + cellPad, ty, { width: colW - cellPad * 2, lineBreak: false });
        ty += lineH;
      }
      x += colW;
    }
    y += rowH;
  };
  drawRow(headers, true);
  for (const r of rows) drawRow(r.cells, false);
  return y;
}

function addPdfHeader(doc: PDFKit.PDFDocument, material: Material, first: boolean): void {
  if (first) {
    if (MEMBRETE) {
      try {
        doc.image(MEMBRETE, 48, 40, { width: 120 });
      } catch {
        // sin membrete disponible
      }
    }
    let y = 40;
    const lines = pdfHeaderLines(material);
    for (const l of lines) {
      if (l === "") {
        doc.moveDown(0.2);
        y = doc.y;
        continue;
      }
      const isTitle = l.startsWith(material.title);
      doc.fontSize(isTitle ? 13 : 9.5).fillColor(isTitle ? INSTITUTIONAL_TONE : "#222222").text(l, 190, y, { width: 380 });
      y = doc.y + 2;
    }
  }
  doc.moveTo(48, doc.y + 8).lineTo(562, doc.y + 8).strokeColor(INSTITUTIONAL_TONE).lineWidth(1.2).stroke();
  doc.moveDown(0.6);
}

/** Salta a una página nueva si no queda espacio; evita el desborde y las páginas en blanco. */
function ensurePdfSpace(doc: PDFKit.PDFDocument, needed = 70): void {
  if (doc.y > doc.page.height - needed) {
    doc.addPage();
    doc.moveTo(48, 58).lineTo(562, 58).strokeColor(INSTITUTIONAL_TONE).lineWidth(1.2).stroke();
  }
}

export async function buildMaterialPdf(material: Material): Promise<{ buffer: Uint8Array; mime: string; fileName: string }> {
  const doc = new PDFDocument({ size: "LETTER", margin: 48 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  const done = new Promise<void>((resolve) => doc.on("end", resolve));

  addPdfHeader(doc, material, true);
  let y = doc.y;

  for (const block of pdfBlocks(material)) {
    if (block.kind === "heading") {
      ensurePdfSpace(doc);
      doc.fontSize(12).fillColor(INSTITUTIONAL_TONE).text(block.text ?? "", 48, doc.y);
      doc.moveDown(0.3);
    } else if (block.kind === "text") {
      ensurePdfSpace(doc);
      doc.fontSize(10.5).fillColor("#111111").text(block.text ?? "", 48, doc.y, { width: 514 });
      doc.moveDown(0.4);
    } else if (block.kind === "list") {
      ensurePdfSpace(doc);
      (block.items ?? []).forEach((it, i) => {
        doc.fontSize(10.5).fillColor("#111111").text(`${i + 1}. ${it}`, 48, doc.y, { width: 514 });
      });
      doc.moveDown(0.3);
    } else if (block.kind === "item") {
      ensurePdfSpace(doc);
      doc.fontSize(10.5).fillColor("#111111").text(block.text ?? "", 48, doc.y, { width: 514 });
      (block.items ?? []).forEach((o, i) => {
        doc.fontSize(10).text(`   ${String.fromCharCode(97 + i)}) ${o}`, 48, doc.y, { width: 500 });
      });
      doc.moveDown(0.4);
    } else if (block.kind === "table" && block.table) {
      y = drawTable(doc, doc.y, block.table.headers, block.table.rows, { width: 514, left: 48 }, material);
      doc.y = y + 6;
    } else if (block.kind === "response") {
      for (let i = 0; i < (block.lines ?? 6); i++) {
        if (doc.y > doc.page.height - 90) doc.addPage();
        doc.moveTo(48, doc.y + 6).lineTo(562, doc.y + 6).strokeColor("#c9d4df").lineWidth(0.7).stroke();
        doc.moveDown(0.9);
      }
    }
  }

  // Pie de página: se dibuja en la última página si queda espacio; dentro del
  // margen inferior (≤ 744) para que pdfkit no cree páginas nuevas.
  if (doc.y > doc.page.height - 70) doc.addPage();
  const footerTitle = material.title.length > 72 ? `${material.title.slice(0, 72)}…` : material.title;
  const fy1 = doc.page.height - 74; // ~718
  const fy2 = doc.page.height - 58; // ~734
  doc.fontSize(7).fillColor("#5b6572").text(`Documento pedagógico — ${footerTitle} · v${material.version ?? 1}`, 48, fy1, { width: 480, lineBreak: false });
  doc.text(`Página ${doc.bufferedPageRange().count}`, doc.page.width - 48 - 90, fy1, { width: 90, align: "right", lineBreak: false });
  doc.text("Plataforma Observatorio Ciudadano — Ovalle 2035", 48, fy2, { width: 514, align: "center", lineBreak: false });

  doc.end();
  await done;
  const buffer = Buffer.concat(chunks);
  return { buffer, mime: "application/pdf", fileName: `${material.title.toLowerCase().replace(/\s+/g, "-")}-v${material.version}.pdf` };
}

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------

function docxHeaderParagraphs(material: Material): Paragraph[] {
  const out: Paragraph[] = [];
  if (MEMBRETE) {
    out.push(
      new Paragraph({
        children: [
          new ImageRun({ data: MEMBRETE, type: "png", transformation: { width: 140, height: 61 } }),
          new TextRun({ text: "  " }),
        ],
      }),
    );
  }
  const c = material.content as MaterialContent | undefined;
  const meta = [`${INSTITUTION}`, `${SUBJECT}`, `Profesor: ${PROFESOR}`];
  const extras = [];
  if (material.classId) extras.push(`Clase: ${material.classId}`);
  if (material.unitId) extras.push(`Unidad: ${material.unitId}`);
  if (material.classDate) extras.push(`Fecha: ${material.classDate.slice(0, 10)}`);
  if (extras.length) meta.push(extras.join("   ·   "));
  for (const m of meta) out.push(new Paragraph({ children: [new TextRun({ text: m, bold: true, color: "123a5f" })] }));
  out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(`${material.title} — ${TYPE_LABELS[material.type] ?? material.type}`)] }));
  if (c?.curricular) {
    if (c.curricular.oa.length) out.push(new Paragraph({ children: [new TextRun(`OA: ${c.curricular.oa.join(", ")}`)] }));
    if (c.curricular.objective) out.push(new Paragraph({ children: [new TextRun(`Objetivo: ${c.curricular.objective}`)] }));
    if (c.curricular.indicators.length) out.push(new Paragraph({ children: [new TextRun(`Indicadores: ${c.curricular.indicators.join("; ")}`)] }));
  }
  return out;
}

function borderRule() {
  return { style: BorderStyle.SINGLE, size: 4, color: "123a5f" };
}

function borderedTable(headers: string[], rows: MaterialTableRow[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: borderRule(), bottom: borderRule(), left: borderRule(), right: borderRule(), insideHorizontal: borderRule(), insideVertical: borderRule() },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h) => new TableCell({ shading: { fill: "eef3f8" }, children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "123a5f" })] })] })),
      }),
      ...rows.map((r) => new TableRow({ children: r.cells.map((cell) => new TableCell({ children: [new Paragraph(cell)] })) })),
    ],
  });
}

function responseLines(count: number): Paragraph[] {
  const out: Paragraph[] = [];
  for (let i = 0; i < count; i++) {
    out.push(
      new Paragraph({
        spacing: { after: 220 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "c9d4df" } },
        children: [],
      }),
    );
  }
  return out;
}

export async function buildMaterialDocx(material: Material): Promise<{ buffer: Uint8Array; mime: string; fileName: string }> {
  const c = material.content as MaterialContent | undefined;
  const children: (Paragraph | Table)[] = [...docxHeaderParagraphs(material)];

  if (c?.contenido?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Contenido / Lectura")] }));
    for (const para of c.contenido) children.push(new Paragraph({ children: [new TextRun(para)], spacing: { after: 120 } }));
  }

  for (const s of c?.sections ?? []) {
    if (s.kind === "heading") children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(s.text ?? "")] }));
    else if (s.kind === "list") (s.items ?? []).forEach((it, i) => children.push(new Paragraph({ children: [new TextRun(`${i + 1}. ${it}`)] })));
    else if (s.kind === "table" && s.table) children.push(borderedTable(s.table.headers, s.table.rows));
    else if (s.kind === "response") children.push(...responseLines(6));
    else children.push(new Paragraph({ children: [new TextRun(s.text ?? "")], spacing: { after: 120 } }));
  }

  if (c?.items?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Ítems de la evaluación")] }));
    const total = c.items.reduce((s, i) => s + (i.points ?? 0), 0);
    children.push(new Paragraph({ children: [new TextRun(`Puntaje total: ${total} puntos · Duración sugerida: ${material.duration ?? 40} minutos.`)] }));
    for (const it of c.items) {
      const label = ITEM_TYPE_LABELS[it.type] ?? it.type;
      children.push(new Paragraph({ children: [new TextRun({ text: `(${it.points ?? 0} pts) ${label} — ${it.prompt}`, bold: true })] }));
      it.options?.forEach((o, i) => children.push(new Paragraph({ children: [new TextRun(`${String.fromCharCode(97 + i)}) ${o}`)] })));
    }
  }

  if (c?.rubric) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Rúbrica")] }));
    children.push(new Paragraph({ children: [new TextRun(`Escala: ${c.rubric.scale.map((l) => `${l.score} = ${l.label}`).join(" · ")}`)] }));
    const headers = ["Criterio", ...c.rubric.scale.map((l) => l.label)];
    const rows = c.rubric.criteria.map((cr) => ({
      cells: [cr.name, ...(cr.levels ?? []).map((lv) => lv.descriptor ?? "")],
    }));
    children.push(borderedTable(headers, rows));
  }

  if (c?.specTable?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Tabla de especificaciones")] }));
    children.push(
      borderedTable(
        ["OA", "Indicador", "Habilidad", "Ítem", "Pts", "Nivel"],
        c.specTable.map((r) => ({ cells: [r.oa, r.indicator, r.skill, r.itemId, String(r.points), r.level] })),
      ),
    );
  }

  if (c?.answerKey?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Solucionario / Pauta")] }));
    children.push(
      borderedTable(
        ["Ítem", "Respuesta", "Pts", "Justificación"],
        c.answerKey.map((a) => ({ cells: [a.itemId, a.correct, String(a.points), a.justification] })),
      ),
    );
  }

  if (c?.pauta) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Pauta docente")] }));
    children.push(new Paragraph({ children: [new TextRun(c.pauta)] }));
  }

  if (c?.referencias?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Referencias")] }));
    c.referencias.forEach((r) => children.push(new Paragraph({ children: [new TextRun(r)] })));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: "center",
                children: [
                  new TextRun({ text: `${material.title} · v${material.version ?? 1} — `, size: 16, color: "5b6572" }),
                  new TextRun({ text: "Página ", size: 16, color: "5b6572" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "5b6572" }),
                  new TextRun({ text: " de ", size: 16, color: "5b6572" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "5b6572" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return { buffer, mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileName: `${material.title.toLowerCase().replace(/\s+/g, "-")}-v${material.version}.docx` };
}
