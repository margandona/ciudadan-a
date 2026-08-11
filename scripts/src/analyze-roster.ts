import { ExcelStudentParser, StudentColumnMapper } from "@pclab/infrastructure";
import { suggestNameParts, validateRawName } from "@pclab/domain";
import { maskName, parseFlags } from "./lib";
import fs from "node:fs";

/**
 * Análisis reutilizable de una nómina (sin importar).
 * Uso: npm run analyze:roster -- --file=<ruta>
 */
async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const file = flags.file;
  if (!file || !fs.existsSync(file)) {
    console.error("Indica --file=<ruta-al-excel> existente");
    process.exit(1);
  }

  const parser = new ExcelStudentParser();
  const wb = parser.parseFile(file);
  const mapper = new StudentColumnMapper();

  for (const sheet of wb.sheets) {
    console.log(`\n=== ${file.split(/[\\/]/).pop()} :: hoja "${sheet.name}" ===`);
    console.log(`Encabezados detectados: ${JSON.stringify(sheet.headers)}`);
    console.log(`Filas con datos       : ${sheet.rows.length}`);
    console.log(`Curso (candidatos)    : ${JSON.stringify(sheet.courseCandidates)}`);

    const mapping = mapper.detect(sheet);
    console.log("Mapeo de columnas:");
    for (const det of mapping.detections) {
      console.log(`  "${det.header}" → ${det.field} (confianza: ${det.confidence}${det.sensitive ? ", SENSIBLE" : ""})`);
    }

    let names = 0;
    let suspicious = 0;
    const examples: string[] = [];
    for (const row of sheet.rows) {
      const idx = mapping.columns.fullName;
      const raw = idx !== undefined ? String(row.cells[idx] ?? "").trim() : "";
      if (!raw) continue;
      names++;
      const issues = validateRawName(raw);
      if (issues.length > 0) {
        suspicious++;
        if (examples.length < 5) examples.push(`fila ${row.rowIndex}: ${maskName(raw)} [${issues.map((i) => i.code).join(", ")}]`);
      }
      suggestNameParts(raw); // validación de parseo
    }
    console.log(`Estudiantes con nombre : ${names}`);
    console.log(`Filas con observaciones: ${suspicious}`);
    if (examples.length) {
      console.log("Ejemplos (enmascarados):");
      examples.forEach((e) => console.log(`  ${e}`));
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
