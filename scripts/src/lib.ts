import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import type { AuthContext } from "@pclab/application";

export const SERVER_ACTOR: AuthContext = {
  uid: "cli-import",
  role: "MASTER",
  courses: [],
  isServer: true,
};

/** Exige emulador salvo que se pase --prod explícitamente. */
export function requireEmulator(allowProd: boolean): void {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (!emulatorHost && !allowProd) {
    console.error(
      [
        "No se detectó el emulador de Firestore (FIRESTORE_EMULATOR_HOST no está definido).",
        "Seguridad: los datos reales NO se importan a producción sin autorización explícita.",
        "Inicia el emulador con: npm run emulator",
        "o usa --prod SOLO si estás autorizado.",
      ].join("\n"),
    );
    process.exit(2);
  }
  if (emulatorHost) {
    console.log(`Usando emulador de Firestore en ${emulatorHost}`);
  }
}

export function getDb(): Firestore {
  const app = getApps().length === 0 ? initializeApp() : getApps()[0]!;
  return getFirestore(app);
}

/** Enmascara un nombre para no exponer PII en salidas/logs. */
export function maskName(value: string): string {
  return value
    .split(/\s+/)
    .map((w) => (w.length >= 3 ? w.slice(0, 1) + "***" : "***"))
    .join(" ");
}

/** Parsea flags simples: --file=x, --apply, --dry-run, --prod, --year=2026. */
export function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const body = arg.slice(2);
      const eq = body.indexOf("=");
      if (eq >= 0) flags[body.slice(0, eq)] = body.slice(eq + 1);
      else flags[body] = "true";
    }
  }
  return flags;
}
