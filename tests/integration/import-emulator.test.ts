process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8088";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9098";
process.env.GCLOUD_PROJECT = "pclab-integration";

import { beforeAll, describe, expect, it } from "vitest";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { ExcelStudentParser, FirestoreAuditRepository, FirestoreCourseRepository, FirestoreStudentRepository, StudentColumnMapper } from "@pclab/infrastructure";
import { ImportStudentsUseCase, PreviewStudentImportUseCase, ListStudentsUseCase, GetStudentOverviewUseCase, DeactivateStudentUseCase } from "@pclab/application";
import { demoRosterD, demoRosterE, makeRosterBuffer } from "../../packages/application/src/test-fixtures";

const PROJECT_ID = "pclab-integration";
const D = "course-3med-d-2026";
const E = "course-3med-e-2026";

let db: ReturnType<typeof getFirestore>;
let studentsRepo: FirestoreStudentRepository;
let coursesRepo: FirestoreCourseRepository;

const SERVER = { uid: "integration", role: "MASTER", courses: [], isServer: true };

beforeAll(async () => {
  if (getApps().length === 0) {
    initializeApp({ projectId: PROJECT_ID });
  }
  db = getFirestore();
  studentsRepo = new FirestoreStudentRepository(db);
  coursesRepo = new FirestoreCourseRepository(db);
  await db.collection("courses").doc(D).delete().catch(() => undefined);
  await db.collection("courses").doc(E).delete().catch(() => undefined);
  // Limpieza de estudiantes de ambos cursos para que el test sea repetible.
  for (const courseId of [D, E]) {
    const snap = await db.collection("students").where("courseId", "==", courseId).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
  const audits = await db.collection("auditLogs").where("entity", "==", "students").limit(100).get();
  await Promise.all(audits.docs.map((d) => d.ref.delete()));
});

async function previewOf(buffer: Uint8Array, fileName: string) {
  const useCase = new PreviewStudentImportUseCase({
    parser: new ExcelStudentParser(),
    columnDetector: new StudentColumnMapper(),
    students: studentsRepo,
  });
  return useCase.run({ fileName, data: buffer }, SERVER);
}

describe("Importación en emulador — integración y aislamiento", () => {
  it("importa Curso D (3 activas + 1 retirada) y crea el curso", async () => {
    const audit = new FirestoreAuditRepository(db);
    const importer = new ImportStudentsUseCase({ students: studentsRepo, courses: coursesRepo, audit });
    const preview = await previewOf(makeRosterBuffer("3º Medio D", demoRosterD()), "d.xlsx");

    const result = await importer.run({ rows: preview.rows, fileName: "d.xlsx" }, SERVER);

    expect(result.imported).toBe(3);
    expect(result.deactivated).toBe(1);
    expect(result.courseIds).toContain(D);

    const course = await coursesRepo.findById(D);
    expect(course?.name).toBe("3º Medio D");
  });

  it("importa Curso E de forma independiente", async () => {
    const audit = new FirestoreAuditRepository(db);
    const importer = new ImportStudentsUseCase({ students: studentsRepo, courses: coursesRepo, audit });
    const preview = await previewOf(makeRosterBuffer("3º Medio E", demoRosterE()), "e.xlsx");
    const result = await importer.run({ rows: preview.rows, fileName: "e.xlsx" }, SERVER);
    expect(result.imported).toBe(2);
    expect(result.courseIds).toContain(E);
  });

  it("AISLAMIENTO: las estudiantes de D no aparecen en E ni al revés", async () => {
    const lister = new ListStudentsUseCase({ students: studentsRepo });
    const listD = await lister.run(D, SERVER);
    const listE = await lister.run(E, SERVER);

    expect(listD.length).toBe(4);
    expect(listE.length).toBe(2);
    const namesE = new Set(listE.map((s) => s.normalizedSearchName));
    for (const s of listD) {
      expect(namesE.has(s.normalizedSearchName)).toBe(false);
    }
  });

  it("AISLAMIENTO: el perfil de una estudiante de D no es alcanzable desde E", async () => {
    const overview = new GetStudentOverviewUseCase({ students: studentsRepo });
    const listE = await studentsRepo.findByCourse(E);
    const studentE = listE[0]!;
    await expect(overview.run(D, studentE.id, SERVER)).rejects.toThrow();
  });

  it("soft delete: retirar marca active=false y conserva el historial", async () => {
    const audit = new FirestoreAuditRepository(db);
    const deactivator = new DeactivateStudentUseCase({ students: studentsRepo, audit });
    const listD = await studentsRepo.findByCourse(D);
    const target = listD.find((s) => s.active)!;

    const updated = await deactivator.run({ courseId: D, studentId: target.id, active: false }, SERVER);
    expect(updated.active).toBe(false);
    expect(updated.archivedAt).toBeTruthy();

    // sigue existiendo en Firestore (no borrado físico)
    const persisted = await studentsRepo.getById(target.id);
    expect(persisted?.active).toBe(false);

    // los logs de auditoría quedaron registrados
    const logs = await db.collection("auditLogs").where("entity", "==", "students").limit(20).get();
    expect(logs.empty).toBe(false);
  });

  it("re-importar después de retirar reactiva la estudiante sin duplicar", async () => {
    const audit = new FirestoreAuditRepository(db);
    const importer = new ImportStudentsUseCase({ students: studentsRepo, courses: coursesRepo, audit });
    const preview = await previewOf(makeRosterBuffer("3º Medio D", demoRosterD()), "d.xlsx");
    const result = await importer.run({ rows: preview.rows, fileName: "d.xlsx" }, SERVER);

    expect(result.imported).toBe(0);
    const listD = await studentsRepo.findByCourse(D);
    expect(listD.length).toBe(4);
    // Ana fue reactivada por la nómina; Daniela sigue "Retirado" en el archivo → inactiva
    expect(listD.filter((s) => s.active).length).toBe(3);
    const ana = listD.find((s) => s.displayName === "Ana Demo Uno");
    expect(ana?.active).toBe(true);
    const daniela = listD.find((s) => s.displayName === "Daniela Demo Cuatro");
    expect(daniela?.active).toBe(false);
  });
});
