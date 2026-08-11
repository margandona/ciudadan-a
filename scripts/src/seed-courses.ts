import { COURSE_LEVELS, SUBJECT_EDUCACION_CIUDADANA, type Course } from "@pclab/shared";
import { FirestoreCourseRepository } from "@pclab/infrastructure";
import { getDb, parseFlags, requireEmulator } from "./lib";

/**
 * Crea los documentos Course determinísticos de los dos cursos reales.
 * Uso: npm run seed:courses
 */
async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  requireEmulator(flags.prod === "true");
  const db = getDb();
  const courses = new FirestoreCourseRepository(db);

  const year = 2026;
  const now = new Date().toISOString();

  const items: Course[] = [
    { id: "course-3med-d-2026", name: "3º Medio D", level: COURSE_LEVELS.TERCERO_MEDIO, section: "D", subject: SUBJECT_EDUCACION_CIUDADANA, year, active: true, createdAt: now, updatedAt: now, settings: { participationScale: [0, 1, 2, 3], feedbackAnonymous: false } },
    { id: "course-3med-e-2026", name: "3º Medio E", level: COURSE_LEVELS.TERCERO_MEDIO, section: "E", subject: SUBJECT_EDUCACION_CIUDADANA, year, active: true, createdAt: now, updatedAt: now, settings: { participationScale: [0, 1, 2, 3], feedbackAnonymous: false } },
  ];

  for (const course of items) {
    await courses.upsert(course);
    console.log(`Curso listo: ${course.id} — ${course.name}`);
  }
  console.log("\nSeed de cursos completado.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
