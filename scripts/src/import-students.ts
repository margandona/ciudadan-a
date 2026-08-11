import fs from "node:fs";
import { ExcelStudentParser, FirestoreAuditRepository, FirestoreCourseRepository, FirestoreStudentRepository, StudentColumnMapper } from "@pclab/infrastructure";
import { ImportStudentsUseCase, PreviewStudentImportUseCase } from "@pclab/application";
import { maskName, parseFlags, requireEmulator, SERVER_ACTOR, getDb } from "./lib";

/**
 * Importación de nóminas (CLI).
 *
 * Uso:
 *   npm run import:students -- --file="./private-data/curso-a.xlsx"            # dry-run (preview)
 *   npm run import:students -- --file="./private-data/curso-a.xlsx" --apply    # importa al emulador
 *
 * Nunca lee nombres desde el código; lee el archivo privado indicado.
 */
async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const file = flags.file;
  if (!file) {
    console.error("Indica --file=<ruta-al-excel>");
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`No existe el archivo: ${file}`);
    process.exit(1);
  }
  const apply = flags.apply === "true";
  const allowProd = flags.prod === "true";
  requireEmulator(allowProd);

  const db = getDb();
  const parser = new ExcelStudentParser();
  const columnDetector = new StudentColumnMapper();
  const students = new FirestoreStudentRepository(db);
  const courses = new FirestoreCourseRepository(db);
  const audit = new FirestoreAuditRepository(db);

  const previewUseCase = new PreviewStudentImportUseCase({ parser, columnDetector, students });
  const importUseCase = new ImportStudentsUseCase({ students, courses, audit });

  const fileName = file.split(/[\\/]/).pop() ?? file;
  const data = fs.readFileSync(file);

  console.log("\n=== PREVIEW ===\n");
  const preview = await previewUseCase.run({ fileName, data }, SERVER_ACTOR);
  const s = preview.summary;
  console.log(`Archivo       : ${s.fileName}`);
  console.log(`Curso detectado: ${s.courseDetected ?? "NO DETERMINADO"}`);
  console.log(`Estudiantes   : ${s.totalRows}`);
  console.log(`Nuevas        : ${s.newStudents}`);
  console.log(`Duplicadas    : ${s.duplicateConfirmed}`);
  console.log(`Posibles duplicadas: ${s.possibleDuplicate}`);
  console.log(`Con advertencias   : ${s.withWarnings}`);
  console.log(`Bloqueadas    : ${s.blocked}`);
  console.log(`Listas para importar: ${s.readyToImport}`);
  console.log(`Campos sensibles detectados (no importados): ${s.sensitiveFieldsDetected}`);

  const examples = preview.rows
    .filter((r) => r.issues.length > 0)
    .slice(0, 5)
    .map((r) => `  fila ${r.rowIndex}: ${maskName(r.displayName)} → ${r.issues.map((i) => i.code).join(", ")}`);
  if (examples.length) {
    console.log("\nEjemplos de filas con observaciones (enmascarados):");
    examples.forEach((e) => console.log(e));
  }

  if (!apply) {
    console.log("\n[dry-run] No se importó nada. Agrega --apply para importar al emulador.");
    return;
  }

  console.log("\n=== IMPORTANDO ===\n");
  const result = await importUseCase.run({ rows: preview.rows, fileName }, SERVER_ACTOR);
  console.log("Resultado:");
  console.log(`  Importadas   : ${result.imported}`);
  console.log(`  Actualizadas : ${result.updated}`);
  console.log(`  Desactivadas : ${result.deactivated}`);
  console.log(`  Omitidas (posibles duplicados): ${result.skippedDuplicates}`);
  console.log(`  Cursos       : ${result.courseIds.join(", ")}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
