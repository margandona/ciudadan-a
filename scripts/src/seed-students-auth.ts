import fs from "node:fs";
import * as XLSX from "xlsx";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { normalizeSearchName } from "../../packages/domain/src/student/name-rules";
import { maskName, parseFlags, requireEmulator, getDb } from "./lib";

/**
 * Crea usuarios de estudiantes por curso a partir de las nóminas.
 * Login: el/la estudiante selecciona su nombre y su clave es el RUT sin puntos ni guiones.
 *
 * Uso (emulador):
 *   pnpm seed:students-auth
 * Uso (producción, con autorización):
 *   pnpm seed:students-auth --prod
 *
 * Flags:
 *   --file-d=<xlsx curso D>   (por defecto la nómina real)
 *   --file-e=<xlsx curso E>
 *   --test=5                  (estudiantes de prueba por curso)
 */
const COURSES = [
  { courseId: "course-3med-d-2026", section: "D", fileFlag: "file-d" },
  { courseId: "course-3med-e-2026", section: "E", fileFlag: "file-e" },
];

const DEFAULT_FILES: Record<string, string> = {
  "file-d": "C:/Users/marga/OneDrive/Desktop/providencia/3ro/Estudiantes 3º Medio D-Educación Ciudadana.xlsx",
  "file-e": "C:/Users/marga/OneDrive/Desktop/providencia/3ro/Estudiantes 3º Medio E-Educación Ciudadana.xlsx",
};

/** RUT "23.133.349-5" o "23.132.318-K" → { digits: "23133349", dv: "5" | "k" }. */
function parseRut(raw: string): { digits: string; dv: string } {
  const cleaned = raw.replace(/[.\s]/g, "").trim();
  const dash = cleaned.lastIndexOf("-");
  if (dash >= 0) {
    return { digits: cleaned.slice(0, dash), dv: cleaned.slice(dash + 1).toLowerCase() };
  }
  // Sin guion: la última letra (si hay) es el DV; si termina en número, asumimos 1 dígito DV.
  const m = cleaned.match(/^(\d+)([0-9kK]?)$/);
  if (m) {
    const tail = m[2] ?? "";
    if (/[kK]/.test(tail)) return { digits: m[1]!, dv: "k" };
    if (tail) return { digits: m[1]!, dv: tail };
    return { digits: cleaned, dv: "" };
  }
  return { digits: cleaned, dv: "" };
}

function emailFor(rut: { digits: string; dv: string }): string {
  return `${rut.digits}${rut.dv}@estudiante.ciudadania-lab.cl`.toLowerCase();
}

function passwordFor(rut: { digits: string; dv: string }): string {
  // Clave = RUT sin puntos ni guiones (con la letra en MAYÚSCULA si tiene K).
  return `${rut.digits}${rut.dv.toUpperCase()}`;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  requireEmulator(flags.prod === "true");

  // Auth en emulador: apuntar el SDK admin al emulador de Auth (9098).
  if (process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9098";
  }

  const projectId = flags.project ?? "ciudadania-lab";
  if (getApps().length === 0) initializeApp({ projectId });
  const adminAuth = getAuth();
  const db = getDb();

  const testCount = Number(flags.test ?? "5");

  const testRuts = ["11.111.111-1", "22.222.222-2", "33.333.333-3", "44.444.444-4", "55.555.555-5"];

  let created = 0;
  let updated = 0;
  let linked = 0;
  let skipped = 0;

  async function upsertStudentAuth(opts: {
    email: string;
    password: string;
    displayName: string;
    courseId: string;
  }): Promise<string> {
    const existing = await adminAuth.getUserByEmail(opts.email).catch(() => null);
    if (existing) {
      await adminAuth.updateUser(existing.uid, { password: opts.password, displayName: opts.displayName, emailVerified: true });
      updated++;
      return existing.uid;
    }
    const user = await adminAuth.createUser({
      email: opts.email,
      password: opts.password,
      displayName: opts.displayName,
      emailVerified: true,
    });
    created++;
    return user.uid;
  }

  async function setStudentClaims(uid: string, courseId: string): Promise<void> {
    await adminAuth.setCustomUserClaims(uid, {
      role: "ESTUDIANTE",
      courses: [courseId],
      courseId,
      studentId: uid,
    });
  }

  async function linkStudentDoc(courseId: string, displayName: string, uid: string, email: string): Promise<boolean> {
    const snap = await db
      .collection("students")
      .where("courseId", "==", courseId)
      .where("normalizedSearchName", "==", normalizeSearchName(displayName))
      .limit(1)
      .get();
    if (snap.empty) return false;
    const ref = snap.docs[0]!.ref;
    await ref.update({
      userId: uid,
      studentId: uid,
      authEmail: email,
      updatedAt: Timestamp.now(),
    });
    return true;
  }

  for (const course of COURSES) {
    const file = flags[course.fileFlag] ?? DEFAULT_FILES[course.fileFlag]!;
    console.log(`\n=== Curso ${course.section} (${course.courseId}) — ${file.split("/").pop()} ===`);
    if (!fs.existsSync(file)) {
      console.warn("  (no existe el archivo; solo se crearán los de prueba)");
    } else {
      const wb = XLSX.read(fs.readFileSync(file), { type: "buffer" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        console.warn("  (sin hojas en el archivo)");
        continue;
      }
      const ws = wb.Sheets[sheetName];
      const rows = ws ? (XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][]) : [];

      // Buscar la fila de encabezados (Nº / Nombre completo / RUN / Estado).
      const headerIdx = rows.findIndex((r) =>
        (r ?? []).some((c) => /run/i.test(String(c))) && (r ?? []).some((c) => /nombre/i.test(String(c))),
      );
      if (headerIdx < 0) {
        console.warn("  (no se encontró la fila de encabezados con RUN/Nombre)");
      } else {
        const headers = (rows[headerIdx] as unknown[]).map((c) => String(c ?? "").trim());
        const colNo = headers.findIndex((h) => /^n/i.test(h));
        const colName = headers.findIndex((h) => /nombre/i.test(h));
        const colRun = headers.findIndex((h) => /run/i.test(h));
        const colState = headers.findIndex((h) => /estado/i.test(h));

        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = (rows[i] ?? []).map((c) => String(c ?? "").trim());
          if (row.every((c) => c === "")) continue;
          const estado = colState >= 0 ? row[colState] ?? "" : "Matriculado";
          if (!/matriculado/i.test(estado)) {
            skipped++;
            continue;
          }
          const displayName = colName >= 0 ? row[colName] ?? "" : "";
          const rutRaw = colRun >= 0 ? row[colRun] ?? "" : "";
          if (!displayName || !rutRaw) {
            skipped++;
            continue;
          }
          const rut = parseRut(rutRaw);
          if (!rut.digits) {
            skipped++;
            continue;
          }
          const email = emailFor(rut);
          const uid = await upsertStudentAuth({ email, password: passwordFor(rut), displayName, courseId: course.courseId });
          await setStudentClaims(uid, course.courseId);
          const okLink = await linkStudentDoc(course.courseId, displayName, uid, email);
          if (okLink) linked++;
          else skipped++;
          if (okLink) {
            console.log(`  ${String(colNo >= 0 ? row[colNo] ?? "" : "").padEnd(4)} ${maskName(displayName).padEnd(28)} → ${email} (clave: ${passwordFor(rut)})`);
          }
        }
      }
    }

    // Estudiantes de prueba por curso.
    console.log(`\n  --- ${testCount} estudiantes de prueba (curso ${course.section}) ---`);
    for (let i = 0; i < testCount; i++) {
      const rut = parseRut(testRuts[i]!);
      const email = `prueba-${i + 1}-${course.section.toLowerCase()}@estudiante.ciudadania-lab.cl`;
      const displayName = `Estudiante Prueba ${i + 1} ${course.section}`;
      const uid = await upsertStudentAuth({ email, password: passwordFor(rut), displayName, courseId: course.courseId });
      await setStudentClaims(uid, course.courseId);

      const docId = `student-test-${course.section.toLowerCase()}-${i + 1}`;
      const now = Timestamp.now();
      await db.collection("students").doc(docId).set(
        {
          userId: uid,
          studentId: uid,
          authEmail: email,
          firstName: `Estudiante Prueba ${i + 1}`,
          displayName,
          normalizedSearchName: normalizeSearchName(displayName),
          courseId: course.courseId,
          listNumber: null,
          active: true,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
          academicProfile: { participationTrackingEnabled: true, gamificationEnabled: true },
        },
        { merge: true },
      );
      linked++;
      console.log(`  PRUEBA ${maskName(displayName).padEnd(26)} → ${email} (clave: ${passwordFor(rut)})`);
    }
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Creados  : ${created}`);
  console.log(`Actualizados: ${updated}`);
  console.log(`Vinculados a nómina/creados: ${linked}`);
  console.log(`Omitidos (retirados o sin RUN/nombre): ${skipped}`);
  console.log(`\nLogin de estudiantes: seleccionar nombre; clave = RUT sin puntos ni guiones (ej. 231333495, 23132318K).`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
