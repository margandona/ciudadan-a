import fs from "node:fs";
import path from "node:path";
import type { Activity, Badge, ClassEntity, ConceptQuiz, FlippedLesson, Material, PositiveMessage, Quiz, QuizQuestion, Rubric, SlideDeck, SlideKind } from "@pclab/shared";
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
  const missionsRoot = path.join(ROOT, "content", "missions");
  const missionDirs = fs
    .readdirSync(missionsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  for (const dir of missionDirs) {
    const file = path.join(missionsRoot, dir, "flipped.json");
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

  const materialContentFile = path.join(ROOT, "content", "material-content.json");
  if (fs.existsSync(materialContentFile)) {
    const items = readJson<Material[]>(materialContentFile);
    for (const material of items) {
      const doc = db.collection("materials").doc(material.id);
      const record: Record<string, unknown> = {
        ...material,
        version: material.version ?? 1,
        status: material.status ?? "BORRADOR",
        createdAt: isoToTimestamp(material.createdAt) ?? nowTs,
        updatedAt: nowTs,
        createdBy: "seed-content",
      };
      if (material.classDate) record.classDate = isoToTimestamp(material.classDate);
      if (material.printDeadline) record.printDeadline = isoToTimestamp(material.printDeadline);
      if (material.reviewDeadline) record.reviewDeadline = isoToTimestamp(material.reviewDeadline);
      await doc.set(record, { merge: true });
      await doc.collection("versions").doc(`v1-${material.id}`).set(
        {
          id: `v1-${material.id}`,
          materialId: material.id,
          version: 1,
          kind: "GENERAL",
          fileName: `${material.title.toLowerCase().replace(/\s+/g, "-")}-v1.pdf`,
          note: "Versión inicial (contenido de la plataforma)",
          uploadedAt: nowTs,
          by: "seed-content",
        },
        { merge: true },
      );
    }
    console.log(`Materiales con contenido: ${items.length} listos.`);
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

  const conceptQuizzesFile = path.join(ROOT, "content", "concept-quizzes.json");
  if (fs.existsSync(conceptQuizzesFile)) {
    const conceptQuizzes = readJson<ConceptQuiz[]>(conceptQuizzesFile);
    for (const quiz of conceptQuizzes) {
      await db.collection("conceptQuizzes").doc(String(quiz.level)).set(quiz, { merge: true });
    }
    console.log(`Desafíos de conceptos: ${conceptQuizzes.length} listos.`);
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
    const labStories: Record<number, { chapter: string; hook: string; task: string; context: string; source: string }> = {
      7: { chapter: "Consejo de soluciones", hook: "La plaza de Ovalle está a oscuras: reúne Estado, mercado y ciudadanía.", task: "Defiende un actor y termina con una colaboración concreta.", context: "La Ley 20.500 (2011) fortaleció mecanismos de participación en la gestión pública. Analizaremos responsabilidades, bienes públicos y rendición de cuentas.", source: "https://www.bcn.cl/formacioncivica/presentacion" },
      8: { chapter: "Presupuesto bajo presión", hook: "Tienes 100 fichas para mejorar Ovalle, pero cada decisión deja otra necesidad esperando.", task: "Prioriza áreas y explica tu costo de oportunidad.", context: "Un presupuesto municipal es un plan anual de ingresos y gastos. La justicia de una decisión se analiza preguntando quién se beneficia, qué queda pendiente y por qué.", source: "https://www.mineduc.cl/wp-content/uploads/sites/19/2016/11/Orientaciones-curriculares-PFC-op-web.pdf" },
      9: { chapter: "Código desigualdad", hook: "Los datos esconden pistas sobre oportunidades distintas en el territorio.", task: "Observa, interpreta, cuestiona y propone sin etiquetar personas.", context: "El Gini resume desigualdad de ingresos y la encuesta CASEN permite estudiar condiciones sociales. Un dato necesita año, población y contexto para interpretarse.", source: "https://www.bcn.cl/formacioncivica/presentacion" },
      10: { chapter: "El acuerdo del Limarí", hook: "El agua debe alcanzar para las casas, el riego y el río.", task: "Construye un acuerdo que sea sostenible para varias voces.", context: "DGA, organizaciones de usuarios, municipios, comunidades y actividades agrícolas son actores con responsabilidades e intereses distintos.", source: "https://territoriociudadano.minvu.gob.cl/" },
      11: { chapter: "Diseño Ovalle 2035", hook: "El mapa del futuro está en blanco y tu equipo puede transformarlo.", task: "Conecta problema, evidencia, actores, recursos e impactos.", context: "Un proyecto ciudadano pasa del diagnóstico a una propuesta evaluable: problema, evidencia, actores, recursos, impactos y acciones.", source: "https://www.mineduc.cl/wp-content/uploads/sites/19/2016/11/Orientaciones-curriculares-PFC-op-web.pdf" },
      12: { chapter: "Feria ciudadana", hook: "Solo tres minutos separan tu propuesta del apoyo de la comunidad.", task: "Ensaya una presentación clara, realizable y con evidencia.", context: "Comunicar una propuesta es participar: se presenta evidencia, se explican decisiones, se escuchan preguntas y se mejora el proyecto.", source: "https://www.curriculumnacional.cl/recursos/video-educacion-ciudadana" },
    };
    const lab = labStories[cls.number];
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
            text: lab
              ? kind === "portada"
                ? `Laboratorio Ciudadano · ${lab.chapter}`
                : kind === "aprendizaje" || kind === "objetivo"
                  ? cls.learningGoal ?? lab.task
                  : kind === "ruta"
                    ? "1. Escuchar la historia\n2. Desbloquear conceptos\n3. Resolver el reto\n4. Compartir una estrategia\n5. Cerrar con ticket"
                    : kind === "activacion"
                      ? lab.hook
                      : kind === "actividad" || kind === "actividadPrincipal"
                        ? `Reto de equipo: ${lab.task}`
                        : kind === "discusion"
                          ? "Conversen: ¿qué decisión protege mejor el bien común y qué evidencia la sostiene?"
                          : kind === "sintesis"
                            ? `Misión completada cuando puedes explicar: ${lab.task}`
                            : "Aprender jugando significa probar, justificar, escuchar y volver a intentar."
              : kind === "objetivo" && cls.learningGoal ? cls.learningGoal : "Contenido en preparación para esta clase.",
          },
          ...(lab && ["contenido", "actividad", "discusion", "sintesis"].includes(kind)
            ? [{ id: `b${i}-context`, type: "callout" as const, text: lab.context }]
            : []),
          ...(lab && ["pregunta", "quiz", "evaluacion"].includes(kind)
            ? [{ id: `b${i}-3`, type: "question" as const, title: "Reto relámpago", text: lab.task, options: ["Lo justifico con evidencia", "Elijo al azar", "No necesito explicar"], correctIndex: 0, explanation: "En el laboratorio, una decisión ciudadana se explica con razones y evidencia." }]
            : []),
          ...(lab && kind === "contenido"
            ? [{ id: `b${i}-source`, type: "resource" as const, title: "Fuente recomendada", url: lab.source, note: "Abre esta fuente para profundizar después de la explicación." }]
            : []),
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
