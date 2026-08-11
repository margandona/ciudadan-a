import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { parseFlags, requireEmulator } from "./lib";

/**
 * Crea un usuario estudiante DEMO en el emulador de Auth con claims ESTUDIANTE
 * para el curso D (course-3med-d-2026). Solo para desarrollo.
 *
 * Uso: pnpm seed:demo-student -- --email=estudiante@demo.cl --password=Demo1234
 */
async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  requireEmulator(false);

  const email = flags.email ?? "estudiante@demo.cl";
  const password = flags.password ?? "Demo1234";
  const displayName = flags.name ?? "Estudiante Demo";

  if (getApps().length === 0) initializeApp();
  const adminAuth = getAuth();

  const existing = await adminAuth.getUserByEmail(email).catch(() => null);
  let uid: string;
  if (existing) {
    uid = existing.uid;
    await adminAuth.updateUser(uid, { password, displayName });
    console.log(`Usuario existente actualizado: ${email}`);
  } else {
    const user = await adminAuth.createUser({ email, password, displayName, emailVerified: true });
    uid = user.uid;
    console.log(`Usuario creado: ${email}`);
  }

  // studentId = uid de Auth: la estudiante escribe su propio progreso/evidencias
  // con studentId == uid (reglas de Firestore).
  await adminAuth.setCustomUserClaims(uid, {
    role: "ESTUDIANTE",
    courses: ["course-3med-d-2026"],
    courseId: "course-3med-d-2026",
    studentId: uid,
  });
  console.log("Claims asignados: role=ESTUDIANTE, courseId=course-3med-d-2026, studentId=uid");
  console.log("Credenciales demo:", { email, password });
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
