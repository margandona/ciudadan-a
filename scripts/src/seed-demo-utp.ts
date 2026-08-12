import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { parseFlags, requireEmulator } from "./lib";

/**
 * Crea un usuario UTP demo en el emulador con claims role=UTP.
 * Uso: pnpm seed:demo-utp -- --email=utp@demo.cl --password=Demo1234
 */
async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  requireEmulator(flags.prod === "true");
  const email = flags.email ?? "utp@demo.cl";
  const password = flags.password ?? "Demo1234";
  if (getApps().length === 0) initializeApp();
  const adminAuth = getAuth();
  const existing = await adminAuth.getUserByEmail(email).catch(() => null);
  if (existing) {
    await adminAuth.updateUser(existing.uid, { password, displayName: "UTP Demo" });
  } else {
    const user = await adminAuth.createUser({ email, password, displayName: "UTP Demo", emailVerified: true });
    await adminAuth.setCustomUserClaims(user.uid, { role: "UTP", courses: ["course-3med-d-2026"] });
  }
  console.log("Claims asignados: role=UTP, courses=[course-3med-d-2026]");
  console.log("Credenciales demo UTP:", { email, password });
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
