import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { parseFlags, requireEmulator } from "./lib";

/**
 * Crea un usuario PIE demo en el emulador con claims role=PIE.
 * Uso: pnpm seed:demo-pie -- --email=pie@demo.cl --password=Demo1234
 */
async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  requireEmulator(flags.prod === "true");
  const email = flags.email ?? "pie@demo.cl";
  const password = flags.password ?? "Demo1234";
  if (getApps().length === 0) initializeApp();
  const adminAuth = getAuth();
  const existing = await adminAuth.getUserByEmail(email).catch(() => null);
  if (existing) {
    await adminAuth.updateUser(existing.uid, { password, displayName: "PIE Demo" });
  } else {
    const user = await adminAuth.createUser({ email, password, displayName: "PIE Demo", emailVerified: true });
    await adminAuth.setCustomUserClaims(user.uid, { role: "PIE", courses: ["course-3med-d-2026"] });
  }
  console.log("Claims asignados: role=PIE, courses=[course-3med-d-2026]");
  console.log("Credenciales demo PIE:", { email, password });
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
