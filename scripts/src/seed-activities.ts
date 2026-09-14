import fs from "node:fs";
import path from "node:path";
import type { Activity } from "@pclab/shared";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Seed DIRIGIDO de actividades (incluye los dilemas de clase). No toca
 * materiales, presentaciones ni otros datos editados.
 *
 * Emulador:   pnpm seed:activities
 * Producción: (con GOOGLE_APPLICATION_CREDENTIALS de la service account)
 *             pnpm seed:activities -- --prod
 */

const ROOT = path.resolve(import.meta.dirname ?? process.cwd(), "..", "..");

async function main(): Promise<void> {
  const prod = process.argv.includes("--prod");
  if (prod) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.error("Para --prod define GOOGLE_APPLICATION_CREDENTIALS con la service account.");
      process.exit(2);
    }
    console.log("Sembrando actividades en PRODUCCIÓN (ciudadania-lab)…");
  } else if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.error("Define FIRESTORE_EMULATOR_HOST (emulador) o usa --prod.");
    process.exit(2);
  } else {
    console.log(`Sembrando en emulador (${process.env.FIRESTORE_EMULATOR_HOST})…`);
  }

  initializeApp({ projectId: "ciudadania-lab" });
  const db = getFirestore();

  const file = path.join(ROOT, "content", "activities.json");
  const activities = JSON.parse(fs.readFileSync(file, "utf8")) as Activity[];
  for (const activity of activities) {
    await db.collection("activities").doc(activity.id).set(activity, { merge: true });
  }
  console.log(`Seed Actividades: ${activities.length} listas.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
