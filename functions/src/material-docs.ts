import PDFDocument from "pdfkit";
import { Document, HeadingLevel, Packer, Paragraph, Table, TableRow, TableCell, TextRun } from "docx";
import type { Material, MaterialContent } from "@pclab/shared";

const INSTITUTION = "Colegio La Providencia · Ovalle";
const SUBJECT = "Educación Ciudadana";
const PROFESOR = "Marcos Argandoña";

function headerLines(material: Material): string[] {
  const lines = [INSTITUTION, SUBJECT, `Profesor: ${PROFESOR}`];
  if (material.classId) lines.push(`Clase: ${material.classId}`);
  if (material.unitId) lines.push(`Unidad: ${material.unitId}`);
  return lines;
}

function contentToLines(material: Material): string[] {
  const out: string[] = [];
  const c = material.content as MaterialContent | undefined;
  if (material.title) out.push(material.title);
  if (c?.curricular) {
    if (c.curricular.oa.length) out.push(`OA: ${c.curricular.oa.join(", ")}`);
    if (c.curricular.objective) out.push(`Objetivo de la clase: ${c.curricular.objective}`);
    if (c.curricular.indicators.length) out.push(`Indicadores: ${c.curricular.indicators.join("; ")}`);
  }
  for (const s of c?.sections ?? []) {
    if (s.kind === "heading") out.push(`\n${s.text ?? ""}`);
    else if (s.kind === "list") out.push(...(s.items ?? []).map((i, idx) => `${idx + 1}. ${i}`));
    else if (s.kind === "table") {
      const table = s.table;
      if (table) {
        out.push(`\n${table.headers.join(" | ")}`);
        for (const row of table.rows) out.push(row.cells.join(" | "));
      }
    } else out.push(s.text ?? "");
  }
  if (c?.items && c.items.length) {
    out.push("\nÍTEMS");
    for (const item of c.items) {
      out.push(`\n${item.points} pts — ${item.prompt}`);
      if (item.options) item.options.forEach((o, i) => out.push(`  ${String.fromCharCode(97 + i)}) ${o}`));
    }
  }
  if (c?.rubric) {
    out.push("\nRÚBRICA");
    out.push(`Escala: ${c.rubric.scale.map((l) => `${l.score} = ${l.label}`).join(" · ")}`);
    for (const cr of c.rubric.criteria) out.push(`• ${cr.name}: ${cr.descriptor}`);
  }
  return out;
}

/** Genera un PDF institucional a partir del material. */
export async function buildMaterialPdf(material: Material): Promise<{ buffer: Uint8Array; mime: string; fileName: string }> {
  const doc = new PDFDocument({ size: "LETTER", margin: 48 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  const done = new Promise<void>((resolve) => doc.on("end", resolve));

  for (const line of headerLines(material)) doc.fontSize(10).fillColor("#123a5f").text(line, { align: "left" });
  doc.moveDown();
  doc.moveTo(48, doc.y).lineTo(562, doc.y).strokeColor("#2f9e83").lineWidth(1.5).stroke();
  doc.moveDown(0.5);

  for (const line of contentToLines(material)) {
    if (line.startsWith("\n")) {
      doc.moveDown();
      doc.fontSize(12).fillColor("#123a5f").text(line.trim());
    } else if (line.startsWith("  ")) {
      doc.fontSize(10.5).fillColor("#111").text(line, { indent: 24 });
    } else {
      doc.fontSize(10.5).fillColor("#111").text(line);
    }
  }

  doc.moveDown(1);
  doc.moveTo(48, doc.y).lineTo(562, doc.y).strokeColor("#cfd8e3").stroke();
  doc.moveDown(0.3);
  doc.fontSize(8.5).fillColor("#5b6572").text("Material pedagógico de la plataforma Observatorio Ciudadano — Ovalle 2035.", { align: "center" });
  doc.end();
  await done;
  const buffer = Buffer.concat(chunks);
  return { buffer, mime: "application/pdf", fileName: `${material.title.toLowerCase().replace(/\s+/g, "-")}-v${material.version}.pdf` };
}

/** Genera un DOCX editable institucional a partir del material. */
export async function buildMaterialDocx(material: Material): Promise<{ buffer: Uint8Array; mime: string; fileName: string }> {
  const c = material.content as MaterialContent | undefined;
  const children: (Paragraph | Table)[] = [];
  for (const line of headerLines(material)) {
    children.push(new Paragraph({ children: [new TextRun({ text: line, bold: true, color: "123a5f" })], spacing: { after: 80 } }));
  }
  if (material.title) children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: material.title })] }));
  if (c?.curricular) {
    if (c.curricular.oa.length) children.push(new Paragraph({ children: [new TextRun(`OA: ${c.curricular.oa.join(", ")}`)] }));
    if (c.curricular.objective) children.push(new Paragraph({ children: [new TextRun(`Objetivo: ${c.curricular.objective}`)] }));
    if (c.curricular.indicators.length) children.push(new Paragraph({ children: [new TextRun(`Indicadores: ${c.curricular.indicators.join("; ")}`)] }));
  }
  for (const s of c?.sections ?? []) {
    if (s.kind === "heading") children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: s.text ?? "" })] }));
    else if (s.kind === "list") {
      (s.items ?? []).forEach((it, i) => children.push(new Paragraph({ children: [new TextRun(`${i + 1}. ${it}`)], bullet: { level: 0 } })));
    } else if (s.kind === "table" && s.table) {
      children.push(
        new Table({
          rows: [
            new TableRow({ children: s.table.headers.map((h) => new TableCell({ children: [new Paragraph(h)] })) }),
            ...s.table.rows.map((row) => new TableRow({ children: row.cells.map((cell) => new TableCell({ children: [new Paragraph(cell)] })) })),
          ],
        }),
      );
    } else {
      children.push(new Paragraph({ children: [new TextRun(s.text ?? "")], spacing: { after: 120 } }));
    }
  }
  if (c?.items?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Ítems")] }));
    for (const item of c.items) {
      children.push(new Paragraph({ children: [new TextRun({ text: `${item.points} pts — ${item.prompt}` })] }));
      item.options?.forEach((o, i) => children.push(new Paragraph({ children: [new TextRun(`${String.fromCharCode(97 + i)}) ${o}`)] })));
    }
  }
  if (c?.rubric) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Rúbrica")] }));
    children.push(new Paragraph({ children: [new TextRun(`Escala: ${c.rubric.scale.map((l) => `${l.score} = ${l.label}`).join(" · ")}`)] }));
    for (const cr of c.rubric.criteria) children.push(new Paragraph({ children: [new TextRun(`• ${cr.name}: ${cr.descriptor}`)] }));
  }
  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buffer = await Packer.toBuffer(doc);
  return { buffer, mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileName: `${material.title.toLowerCase().replace(/\s+/g, "-")}-v${material.version}.docx` };
}
