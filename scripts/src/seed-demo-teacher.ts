import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { parseFlags, requireEmulator } from "./lib";

/**
 * Crea un usuario docente DEMO en el emulador de Auth con claims PROFESOR
 * para los dos cursos reales. Solo para desarrollo.
 *
 * Uso: npm run seed:demo-teacher -- --email=profesor@demo.cl --password=Demo1234
 */
async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  requireEmulator(false);

  const email = flags.email ?? "profesor@demo.cl";
  const password = flags.password ?? "Demo1234";
  const displayName = flags.name ?? "Profesora Demo";

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

  await adminAuth.setCustomUserClaims(uid, {
    role: "PROFESOR",
    courses: ["course-3med-d-2026", "course-3med-e-2026"],
  });
  console.log("Claims asignados: role=PROFESOR, courses=[D, E]");
  console.log("Credenciales demo:", { email, password });
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
