import fs from "node:fs";
import path from "node:path";
import type { Badge, ConceptQuiz } from "@pclab/shared";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Seed DIRIGIDO y seguro para la Granja Ciudadana: solo siembra `badges`
 * (incluye las medallas manuales) y `conceptQuizzes`. No toca materiales,
 * presentaciones, clases, quizzes ni otros datos que puedan haber sido editados.
 *
 * Emulador:  pnpm seed:farm
 * Producción: (con GOOGLE_APPLICATION_CREDENTIALS de la service account)
 *             pnpm seed:farm -- --prod
 */

const ROOT = path.resolve(import.meta.dirname ?? process.cwd(), "..", "..");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

async function main(): Promise<void> {
  const prod = process.argv.includes("--prod");
  if (prod) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.error("Para --prod define GOOGLE_APPLICATION_CREDENTIALS con la service account.");
      process.exit(2);
    }
    console.log("Sembrando en PRODUCCIÓN (ciudadania-lab)…");
  } else if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.error("Define FIRESTORE_EMULATOR_HOST (emulador) o usa --prod.");
    process.exit(2);
  } else {
    console.log(`Sembrando en emulador (${process.env.FIRESTORE_EMULATOR_HOST})…`);
  }

  initializeApp({ projectId: "ciudadania-lab" });
  const db = getFirestore();

  const badges = readJson<Badge[]>(path.join(ROOT, "content", "badges.json"));
  for (const badge of badges) {
    await db.collection("badges").doc(badge.id).set(badge, { merge: true });
  }

  const quizzes = readJson<ConceptQuiz[]>(path.join(ROOT, "content", "concept-quizzes.json"));
  for (const quiz of quizzes) {
    await db.collection("conceptQuizzes").doc(String(quiz.level)).set(quiz, { merge: true });
  }

  console.log(`Seed Granja: ${badges.length} medallas y ${quizzes.length} desafíos de conceptos listos.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
