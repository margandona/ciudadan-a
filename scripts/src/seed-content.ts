import fs from "node:fs";
import path from "node:path";
import type { Activity, Badge, ClassEntity, FlippedLesson, Material, PositiveMessage, Quiz, QuizQuestion, Rubric, SlideDeck, SlideKind } from "@pclab/shared";
import { MANDATORY_SLIDE_KINDS } from "@pclab/shared";
import { isoToTimestamp } from "@pclab/infrastructure";
import { getDb, parseFlags, requireEmulator } from "./lib";

const ROOT = path.resolve(import.meta.dirname ?? process.cwd(), "..", "..");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

/**
 * Semilla el catálogo de las 12 misiones y sus aulas invertidas.
 * El contenido vive en content/ y se puede editar sin recompilar.
 * Uso: pnpm seed:content
 */
async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  requireEmulator(flags.prod === "true");
  const db = getDb();

  const classes = readJson<ClassEntity[]>(path.join(ROOT, "content", "classes.json"));
  const now = new Date().toISOString();
  const nowTs = isoToTimestamp(now);

  for (const cls of classes) {
    await db.collection("classes").doc(cls.id).set(
      {
        ...cls,
        createdAt: isoToTimestamp(cls.createdAt) ?? nowTs,
        updatedAt: isoToTimestamp(cls.updatedAt) ?? nowTs,
      },
      { merge: true },
    );
  }
  console.log(`Catálogo: ${classes.length} misiones listas.`);

  let flippedCount = 0;
  for (let n = 1; n <= 12; n++) {
    const dir = path.join(ROOT, "content", "missions", String(n).padStart(2, "0"));
    const file = path.join(dir, "flipped.json");
    if (!fs.existsSync(file)) continue;
    const lesson = readJson<FlippedLesson>(file);
    await db.collection("flippedLesson").doc(lesson.classId).set(
      {
        ...lesson,
        updatedAt: isoToTimestamp(lesson.updatedAt) ?? nowTs,
      },
      { merge: true },
    );
    flippedCount++;
  }
  console.log(`Aulas invertidas: ${flippedCount} listas.`);

  const quizzesFile = path.join(ROOT, "content", "quizzes.json");
  if (fs.existsSync(quizzesFile)) {
    const quizzes = readJson<{ quiz: Quiz; questions: QuizQuestion[] }[]>(quizzesFile);
    for (const item of quizzes) {
      const quizDoc = db.collection("quizzes").doc(item.quiz.id);
      await quizDoc.set({ ...item.quiz, createdAt: isoToTimestamp(item.quiz.createdAt) ?? nowTs, updatedAt: isoToTimestamp(item.quiz.updatedAt) ?? nowTs }, { merge: true });
      const qRef = quizDoc.collection("questions");
      for (const q of item.questions) {
        await qRef.doc(q.id).set(q, { merge: true });
      }
    }
    console.log(`Quizzes: ${quizzes.length} listos.`);
  }

  const activitiesFile = path.join(ROOT, "content", "activities.json");
  if (fs.existsSync(activitiesFile)) {
    const activities = readJson<Activity[]>(activitiesFile);
    for (const activity of activities) {
      await db.collection("activities").doc(activity.id).set(activity, { merge: true });
    }
    console.log(`Actividades: ${activities.length} listas.`);
  }

  const materialsFile = path.join(ROOT, "content", "materials.json");
  if (fs.existsSync(materialsFile)) {
    const materials = readJson<Material[]>(materialsFile);
    for (const material of materials) {
      await db.collection("materials").doc(material.id).set(
        { ...material, updatedAt: isoToTimestamp(material.updatedAt) ?? nowTs },
        { merge: true },
      );
    }
    console.log(`Materiales: ${materials.length} listos.`);
  }

  // Presentaciones: deck real de class-01 + decks por defecto para el resto.
  const presentationsFile = path.join(ROOT, "content", "presentations.json");
  const decksByClass = new Map<string, SlideDeck>();
  if (fs.existsSync(presentationsFile)) {
    const deck = readJson<SlideDeck>(presentationsFile);
    decksByClass.set(deck.classId, deck);
  }
  for (const cls of classes) {
    if (decksByClass.has(cls.id)) continue;
    decksByClass.set(cls.id, defaultDeck(cls, "course-3med-d-2026"));
  }
  for (const deck of decksByClass.values()) {
    await db.collection("presentations").doc(deck.classId).set(
      { ...deck, updatedAt: isoToTimestamp(deck.updatedAt) ?? nowTs },
      { merge: true },
    );
  }
  console.log(`Presentaciones: ${decksByClass.size} listas.`);

  const badgesFile = path.join(ROOT, "content", "badges.json");
  if (fs.existsSync(badgesFile)) {
    const badges = readJson<Badge[]>(badgesFile);
    for (const badge of badges) {
      await db.collection("badges").doc(badge.id).set(badge, { merge: true });
    }
    console.log(`Medallas: ${badges.length} listas.`);
  }

  const messagesFile = path.join(ROOT, "content", "messages.json");
  if (fs.existsSync(messagesFile)) {
    const messages = readJson<PositiveMessage[]>(messagesFile);
    await db.collection("settings").doc("messages").set({ messages }, { merge: true });
    console.log(`Mensajes positivos: ${messages.length} listos.`);
  }

  const rubricsFile = path.join(ROOT, "content", "rubrics.json");
  if (fs.existsSync(rubricsFile)) {
    const rubrics = readJson<Rubric[]>(rubricsFile);
    for (const rubric of rubrics) {
      await db.collection("rubrics").doc(rubric.id).set(rubric, { merge: true });
    }
    console.log(`Rúbricas: ${rubrics.length} listas.`);
  }

  console.log("Seed de contenido completado.");

  function defaultDeck(cls: ClassEntity, courseId: string): SlideDeck {
    const kindTitles: Record<string, string> = {
      portada: cls.title,
      aprendizaje: "Aprendizaje esperado",
      objetivo: "Objetivo de la clase",
      ruta: "Ruta de aprendizaje",
      activacion: "Activación de conocimientos previos",
      contenido: "Contenido",
      actividad: "Actividad",
      pregunta: "Pregunta interactiva",
      quiz: "Quiz de la clase",
      discusion: "Discusión",
      actividadPrincipal: "Actividad principal",
      evaluacion: "Evaluación formativa",
      sintesis: "Síntesis",
      ticket: "Ticket de salida",
    };
    const slides = (MANDATORY_SLIDE_KINDS as readonly SlideKind[]).concat(
      ["contenido", "actividad", "pregunta", "quiz", "discusion", "actividadPrincipal", "evaluacion", "sintesis"] as SlideKind[],
    );
    return {
      classId: cls.id,
      courseId,
      version: 1,
      config: { timerDefault: 60, theme: "default", showAnswers: true },
      slides: slides.map((kind, i) => ({
        id: `s${i}-${kind}`,
        kind,
        title: kindTitles[kind],
        blocks: [
          { id: `b${i}-1`, type: "title" as const, text: kindTitles[kind] ?? kind },
          {
            id: `b${i}-2`,
            type: "text" as const,
            text: kind === "objetivo" && cls.learningGoal ? cls.learningGoal : "Contenido en preparación para esta clase.",
          },
        ],
      })),
      updatedAt: new Date().toISOString(),
      updatedBy: "seed-content",
    };
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
